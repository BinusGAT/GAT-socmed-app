import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('loads the protected login gate without browser errors', async ({ page }) => {
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      const location = message.location().url || 'page';
      const isBlockedExternalAsset = location.startsWith('https://')
        && message.text().includes('ERR_NETWORK_ACCESS_DENIED');
      if (!isBlockedExternalAsset) errors.push(`${location}: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');
  await expect(page).toHaveTitle(/GAT (App|Content Suite)/i);
  await expect(page.getByRole('heading', { name: 'CC Internal Gate' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Email Address *' })).toBeVisible();
  await expect(page.getByLabel('Password (NIM) *')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('keeps the login controls usable at mobile width', async ({ page }) => {
  await page.goto('/');
  const email = page.getByRole('textbox', { name: 'Email Address *' });
  const nim = page.getByLabel('Password (NIM) *');
  await expect(email).toBeInViewport();
  await expect(nim).toBeInViewport();
  await email.fill('user@example.test');
  await nim.fill('1234567890');
  await expect(page.getByRole('button', { name: 'Login' })).toBeEnabled();
});

test('provides a logical keyboard focus order', async ({ page }) => {
  await page.goto('/');
  const email = page.getByRole('textbox', { name: 'Email Address *' });
  const nim = page.getByLabel('Password (NIM) *');
  const clear = page.getByRole('button', { name: 'Clear' });
  const login = page.getByRole('button', { name: 'Login' });

  await expect(email).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(nim).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(clear).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(login).toBeFocused();
});

test('has no detectable WCAG A or AA violations at the login gate', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(600);
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  expect(results.violations).toEqual([]);
});

test('does not overflow horizontally at the configured viewport', async ({ page }) => {
  await page.goto('/');
  const dimensions = await page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    contentWidth: document.documentElement.scrollWidth,
  }));

  expect(dimensions.contentWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
});

test('serves the required browser security headers', async ({ request }) => {
  const response = await request.get('/');
  const headers = response.headers();

  expect(headers['content-security-policy']).toContain("default-src 'self'");
  expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['x-frame-options']).toBe('DENY');
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(headers['permissions-policy']).toContain('camera=()');
});

test('rejects forged cross-origin API requests', async ({ request }) => {
  const response = await request.post('/api/sheets', {
    headers: {
      origin: 'https://attacker.example',
      'x-forwarded-host': 'attacker.example',
      'x-forwarded-proto': 'https',
    },
    data: { action: 'read_all' },
  });

  expect(response.status()).toBe(403);
  await expect(response.json()).resolves.toMatchObject({
    success: false,
    error: 'Forbidden: cross-origin request rejected',
  });
});
