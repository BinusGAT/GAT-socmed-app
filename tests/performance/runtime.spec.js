import { expect, test } from '@playwright/test';
import budgets from './budgets.json' with { type: 'json' };
import { createDashboardFixture, PERFORMANCE_DATASET_SIZES } from './fixtures.js';

async function installWebVitalsObserver(page) {
  await page.addInitScript(() => {
    window.__performanceMetrics = { lcp: 0, cls: 0 };
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      window.__performanceMetrics.lcp = entries.at(-1)?.startTime || 0;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) window.__performanceMetrics.cls += entry.value;
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });
}

test('login route stays within browser performance budgets', async ({ page }) => {
  await installWebVitalsObserver(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'CC Internal Gate' })).toBeVisible();
  await page.waitForTimeout(1000);

  const metrics = await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0];
    const firstContentfulPaint = performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0;
    return {
      lcpMs: window.__performanceMetrics.lcp || firstContentfulPaint,
      cls: window.__performanceMetrics.cls,
      domContentLoadedMs: navigation.domContentLoadedEventEnd
    };
  });
  console.log('Login baseline:', metrics);
  expect(metrics.lcpMs).toBeGreaterThan(0);
  expect(metrics.lcpMs).toBeLessThanOrEqual(budgets.login.lcpMs);
  expect(metrics.cls).toBeLessThanOrEqual(budgets.login.cls);
  expect(metrics.domContentLoadedMs).toBeLessThanOrEqual(budgets.login.domContentLoadedMs);
});

test('authenticated dashboard stays within shell and payload budgets', async ({ page }) => {
  const fixture = createDashboardFixture(1000);
  const dashboardFixture = {
    ...fixture,
    laporan: { data: fixture.laporan.data.slice(0, 50) },
    pagination: { page: 1, pageSize: 50, total: fixture.laporan.data.length, totalPages: 20 }
  };
  const payload = JSON.stringify(dashboardFixture);
  const payloadKiB = Math.round(Buffer.byteLength(payload) / 102.4) / 10;

  await page.route('**/api/sheets', async (route) => {
    const { action } = route.request().postDataJSON();
    const body = action === 'validate_mode'
      ? { success: true, valid: true, role: 'Admin', expiresAt: Date.now() + 3_600_000, user: { id: 'e2e-admin', name: 'Performance Admin' } }
      : action === 'read_dashboard' ? dashboardFixture
        : action === 'read_all' ? fixture : { success: true };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });

  await page.goto('/');
  await page.getByRole('textbox', { name: 'Email Address *' }).fill('performance@example.test');
  await page.getByLabel('Password (NIM) *').fill('test-only-password');
  const startedAt = Date.now();
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.getByRole('heading', { name: 'What needs attention' })).toBeVisible();
  const shellReadyMs = Date.now() - startedAt;

  console.log('Authenticated baseline:', { rows: 1000, shellReadyMs, readAllPayloadKiB: payloadKiB });
  expect(shellReadyMs).toBeLessThanOrEqual(budgets.authenticated.shellReadyMs);
  expect(payloadKiB).toBeLessThanOrEqual(budgets.authenticated.readAllPayloadKiB);
});

test('reports representative read_all fixture sizes', () => {
  const report = PERFORMANCE_DATASET_SIZES.map((rows) => ({
    rows,
    payloadKiB: Math.round(Buffer.byteLength(JSON.stringify(createDashboardFixture(rows))) / 102.4) / 10
  }));
  console.table(report);
  expect(report).toHaveLength(3);
});
