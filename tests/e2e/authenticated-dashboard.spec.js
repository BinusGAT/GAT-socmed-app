import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const seededData = {
  success: true,
  laporan: { data: [
    { Date: '2026-08-08', ID: 'POST-002', 'Content Title': 'Community recap', PIC: 'Alya', Category: 'News', Platform: 'Instagram', Views: '2400', 'Total Engagement': '210', 'KPI Summary': 'Good', URL: 'https://example.test/2' },
    { Date: '2026-08-09', ID: 'POST-001', 'Content Title': 'Internship guide', PIC: 'Bima', Category: 'Article Reels', Platform: 'TikTok', Views: '1200', 'Total Engagement': '96', 'KPI Summary': 'Average', URL: 'https://example.test/1' }
  ] },
  schedule: { data: [
    { Date: '2026-08-11', ID: 'TASK-001', 'Content Title': 'Campus highlights', PIC: 'Alya', Category: 'Story Telling', AssignedUserId: 'e2e-admin', Status: false }
  ] },
  memberList: { data: [] }, internList: { data: [] }, lecturerList: { data: [] },
  scripts: { data: [] }, meetings: { data: [] }, notifications: { data: [] }, auditLog: { data: [] },
  appSettings: { data: [{ key: 'app_name', value: 'GAT' }, { key: 'app_full_name', value: 'GAT Content Suite' }] },
  platforms: { data: [] }, categories: { data: [] }, gaSummary: { data: [] }, gaItems: { data: [] }
};

async function openAuthenticatedDashboard(page, { readDelayMs = 0 } = {}) {
  await page.route('**/api/sheets', async (route) => {
    const request = route.request();
    if (request.method() !== 'POST') return route.continue();
    const { action } = request.postDataJSON();
    if (action === 'read_all' && readDelayMs) {
      await new Promise((resolve) => setTimeout(resolve, readDelayMs));
    }
    const body = action === 'validate_mode'
      ? { success: true, valid: true, role: 'Admin', expiresAt: Date.now() + 3_600_000, user: { id: 'e2e-admin', name: 'Release A Admin' } }
      : action === 'read_all' ? seededData : { success: true };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });

  await page.goto('/');
  await page.getByRole('textbox', { name: 'Email Address *' }).fill('release-a@example.test');
  await page.getByLabel('Password (NIM) *').fill('test-only-password');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.locator('main#main-content')).toBeVisible();
}

test('uses a structural skeleton without blocking the authenticated shell', async ({ page }) => {
  await openAuthenticatedDashboard(page, { readDelayMs: 500 });
  const skeleton = page.getByRole('status', { name: 'Loading dashboard' });
  await expect(skeleton).toBeVisible();
  await expect(page.locator('nav[aria-label="Mobile primary navigation"]')).toBeAttached();
  await expect(skeleton).toBeHidden();
});

test('authenticated dashboard has no detectable WCAG A or AA violations', async ({ page }) => {
  await openAuthenticatedDashboard(page);
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(results.violations).toEqual([]);
});

test('content table sorting is keyboard accessible and exposes its direction', async ({ page }) => {
  await openAuthenticatedDashboard(page);
  const isCompact = (page.viewportSize()?.width || 0) < 1024;
  if (isCompact) {
    await page.getByRole('button', { name: /Tasks/ }).last().click();
  }
  const dateHeader = page.getByRole('columnheader', { name: /date/i }).first();
  await expect(dateHeader).toHaveAttribute('aria-sort', 'ascending');
  const sortButton = dateHeader.getByRole('button');
  await sortButton.focus();
  await page.keyboard.press('Enter');
  await expect(dateHeader).toHaveAttribute('aria-sort', 'descending');
  await expect(sortButton).toBeFocused();
});

test('authenticated dashboard does not overflow the page at mobile width', async ({ page }) => {
  await openAuthenticatedDashboard(page);
  const dimensions = await page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    contentWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.contentWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
});

test('opens the selected My Work assignment in the task editor', async ({ page }) => {
  await openAuthenticatedDashboard(page);
  const navigationName = (page.viewportSize()?.width || 0) < 1024
    ? 'Mobile primary navigation'
    : 'Primary navigation';
  await page.getByRole('navigation', { name: navigationName, exact: true })
    .getByRole('button', { name: /My Work/ })
    .click();
  await page.getByRole('button', { name: 'Open task Campus highlights' }).click();
  await expect(page.getByRole('heading', { name: 'Update Scheduled Task (TASK-001)' })).toBeVisible();
});

test('keeps the authenticated view in the URL across refresh', async ({ page }) => {
  await openAuthenticatedDashboard(page);
  const navigationName = (page.viewportSize()?.width || 0) < 1024
    ? 'Mobile primary navigation'
    : 'Primary navigation';
  await page.getByRole('navigation', { name: navigationName, exact: true })
    .getByRole('button', { name: /My Work/ })
    .click();
  await expect(page).toHaveURL(/\?view=my-work$/);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'My Work' })).toBeVisible();
});

test('keeps task editor values visible when required fields are missing', async ({ page }) => {
  await openAuthenticatedDashboard(page);
  const navigationName = (page.viewportSize()?.width || 0) < 1024
    ? 'Mobile primary navigation'
    : 'Primary navigation';
  await page.getByRole('navigation', { name: navigationName, exact: true })
    .getByRole('button', { name: /Tasks|Task List/ })
    .click();
  await page.getByRole('button', { name: /Add Scheduled Task/ }).click();
  await page.getByPlaceholder('Enter title (optional)').fill('Orientation recap');
  await page.getByRole('button', { name: 'Save Task' }).click();
  await expect(page.getByText('Choose a scheduled date, PIC, and category before saving.')).toBeVisible();
  await expect(page.getByPlaceholder('Enter title (optional)')).toHaveValue('Orientation recap');
});
