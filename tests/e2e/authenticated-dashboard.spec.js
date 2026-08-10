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
  scripts: { data: [{ Title: 'Orientation storyboard', Category: 'Story Telling', Status: 'Idea', Script: '', Hashtags: '#orientation' }] }, meetings: { data: [{ ID: 'MM-001', Date: '2026-08-10', Attendees: 'Alya', Recap: 'Weekly content planning decisions', VideoRecap: '' }] }, notifications: { data: [] }, auditLog: { data: [] },
  appSettings: { data: [{ key: 'app_name', value: 'GAT' }, { key: 'app_full_name', value: 'GAT Content Suite' }] },
  platforms: { data: [] }, categories: { data: [] }, gaSummary: { data: [] }, gaItems: { data: [] }
};

async function openAuthenticatedDashboard(page, { readDelayMs = 0, failRead = false } = {}) {
  await page.route('**/api/sheets', async (route) => {
    const request = route.request();
    if (request.method() !== 'POST') return route.continue();
    const { action } = request.postDataJSON();
    if (action === 'read_all' && readDelayMs) {
      await new Promise((resolve) => setTimeout(resolve, readDelayMs));
    }
    if (action === 'read_all' && failRead) {
      return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, error: 'Database unavailable' }) });
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
  await expect(page).toHaveURL(/view=tasklist&task=TASK-001/);
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

test('persists task search filters across refresh', async ({ page }) => {
  await openAuthenticatedDashboard(page);
  const navigationName = (page.viewportSize()?.width || 0) < 1024
    ? 'Mobile primary navigation'
    : 'Primary navigation';
  await page.getByRole('navigation', { name: navigationName, exact: true })
    .getByRole('button', { name: /Tasks|Task List/ })
    .click();
  await page.getByPlaceholder('Search tasks...').fill('Campus');
  await page.reload();
  await expect(page.getByPlaceholder('Search tasks...')).toHaveValue('Campus');
});

test('protects an unsaved task draft when closing the editor', async ({ page }) => {
  await openAuthenticatedDashboard(page);
  const navigationName = (page.viewportSize()?.width || 0) < 1024
    ? 'Mobile primary navigation'
    : 'Primary navigation';
  await page.getByRole('navigation', { name: navigationName, exact: true })
    .getByRole('button', { name: /Tasks|Task List/ })
    .click();
  await page.getByRole('button', { name: /Add Scheduled Task/ }).click();
  await page.getByPlaceholder('Enter title (optional)').fill('Recovered orientation draft');
  await page.getByRole('button', { name: 'Close task editor' }).click();
  await expect(page.getByRole('alertdialog', { name: 'Discard unsaved changes?' })).toBeVisible();
  await page.getByRole('button', { name: 'Keep editing' }).click();
  await expect(page.getByPlaceholder('Enter title (optional)')).toHaveValue('Recovered orientation draft');
});

test('shows cached-data guidance when the browser goes offline', async ({ page }) => {
  await openAuthenticatedDashboard(page);
  await expect(page.getByRole('status', { name: 'Loading dashboard' })).toBeHidden();
  await page.waitForTimeout(500);
  await page.context().setOffline(true);
  await page.evaluate(() => window.dispatchEvent(new Event('offline')));
  await expect(page.getByText('You are offline. Showing the latest saved workspace data.')).toBeVisible();
  await page.context().setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
});

test('offers retry guidance when live synchronization fails', async ({ page }) => {
  await openAuthenticatedDashboard(page, { failRead: true });
  await expect(page.getByText('Workspace data may be out of date.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retry sync' })).toBeVisible();
});

test('protects unsaved storyboard writing before closing', async ({ page }) => {
  await openAuthenticatedDashboard(page);
  const navigationName = (page.viewportSize()?.width || 0) < 1024 ? 'Mobile primary navigation' : 'Primary navigation';
  await page.getByRole('navigation', { name: navigationName, exact: true })
    .getByRole('button', { name: /Library|Posts library/ })
    .click();
  await page.getByRole('button', { name: /Orientation storyboard/ }).click();
  await page.getByPlaceholder('Write video dialogue, voiceover cues, or visual notes here...').fill('Keep this unsaved storyboard copy.');
  await page.getByPlaceholder('Write video dialogue, voiceover cues, or visual notes here...')
    .locator('xpath=ancestor::form')
    .getByRole('button', { name: /Close/ })
    .click();
  await expect(page.getByRole('alertdialog', { name: 'Discard unsaved changes?' })).toBeVisible();
  await page.getByRole('button', { name: 'Keep editing' }).click();
  await expect(page.getByPlaceholder('Write video dialogue, voiceover cues, or visual notes here...')).toHaveValue('Keep this unsaved storyboard copy.');
});

test('protects an unsaved new meeting memo before closing', async ({ page }) => {
  await openAuthenticatedDashboard(page);
  const navigationName = (page.viewportSize()?.width || 0) < 1024 ? 'Mobile primary navigation' : 'Primary navigation';
  await page.getByRole('navigation', { name: navigationName, exact: true })
    .getByRole('button', { name: /Memos|Meeting Memo/ })
    .click();
  await page.getByRole('button', { name: 'Create Memo' }).click();
  const editor = page.locator('#meetingFormRecap');
  await editor.fill('Decisions and follow-up actions');
  await page.getByRole('button', { name: 'Close' }).last().click();
  await expect(page.getByRole('alertdialog', { name: 'Discard unsaved changes?' })).toBeVisible();
  await page.getByRole('button', { name: 'Keep editing' }).click();
  await expect(editor).toContainText('Decisions and follow-up actions');
});

test('uses browser history when changing authenticated views', async ({ page }) => {
  await openAuthenticatedDashboard(page);
  const navigationName = (page.viewportSize()?.width || 0) < 1024 ? 'Mobile primary navigation' : 'Primary navigation';
  const navigation = page.getByRole('navigation', { name: navigationName, exact: true });
  await navigation.getByRole('button', { name: /My Work/ }).click();
  await expect(page.getByRole('heading', { name: 'My Work' })).toBeVisible();
  await navigation.getByRole('button', { name: /Planner|Calendar/ }).click();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'My Work' })).toBeVisible();
});

test('deep-links to a post editor and restores it after refresh', async ({ page }) => {
  await openAuthenticatedDashboard(page);
  await page.goto('/?post=POST-002');
  await expect(page.getByText('Edit Post Metrics')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Edit Post Metrics')).toBeVisible();
});

test('deep-links to a meeting memo and restores it after refresh', async ({ page }) => {
  await openAuthenticatedDashboard(page);
  const navigationName = (page.viewportSize()?.width || 0) < 1024 ? 'Mobile primary navigation' : 'Primary navigation';
  await page.getByRole('navigation', { name: navigationName, exact: true })
    .getByRole('button', { name: /Memos|Meeting Memo/ })
    .click();
  await page.getByRole('button', { name: /Weekly content planning decisions/ }).click();
  await expect(page).toHaveURL(/view=meeting&meeting=MM-001/);
  await page.reload();
  await expect(page.locator('.meeting-recap-text-container')).toContainText('Weekly content planning decisions');
});

test('shows a recovery state for an unavailable meeting link', async ({ page }) => {
  await openAuthenticatedDashboard(page);
  await page.goto('/?view=meeting&meeting=MM-MISSING');
  await expect(page.getByRole('heading', { name: 'Meeting memo unavailable' })).toBeVisible();
  await page.getByRole('button', { name: 'Back to memo directory' }).click();
  await expect(page).not.toHaveURL(/meeting=/);
});

test('persists content-library search across refresh', async ({ page }) => {
  await openAuthenticatedDashboard(page);
  const navigationName = (page.viewportSize()?.width || 0) < 1024 ? 'Mobile primary navigation' : 'Primary navigation';
  await page.getByRole('navigation', { name: navigationName, exact: true })
    .getByRole('button', { name: /Library|Posts library/ })
    .click();
  await page.getByPlaceholder('Search backlog drafts...').fill('Orientation');
  await page.reload();
  await expect(page.getByPlaceholder('Search backlog drafts...')).toHaveValue('Orientation');
});
