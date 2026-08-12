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
  appSettings: { data: [{ key: 'app_name', value: 'GAT' }, { key: 'app_full_name', value: 'GAT Content Suite' }, { key: 'post_library_hidden_categories', value: '[]' }] },
  platforms: { data: [] }, categories: { data: [
    { name: 'Article Reels', color_class: 'badge-category-article' },
    { name: 'Story Telling', color_class: 'badge-category-story' },
    { name: 'News', color_class: 'badge-category-news' },
    { name: 'Motion', color_class: 'badge-category-motion' }
  ] }, gaSummary: { data: [] }, gaItems: { data: [] }
};

async function openAuthenticatedDashboard(page, { readDelayMs = 0, failRead = false, actionLog = null, role = 'Admin', dashboardData = seededData, initialPath = '/' } = {}) {
  await page.route('**/api/sheets', async (route) => {
    const request = route.request();
    if (request.method() !== 'POST') return route.continue();
    const { action } = request.postDataJSON();
    actionLog?.push(action);
    if ((action === 'read_all' || action === 'read_dashboard') && readDelayMs) {
      await new Promise((resolve) => setTimeout(resolve, readDelayMs));
    }
    if ((action === 'read_all' || action === 'read_dashboard') && failRead) {
      return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, error: 'Database unavailable' }) });
    }
    const body = action === 'validate_mode'
      ? { success: true, valid: true, role, expiresAt: Date.now() + 3_600_000, user: { id: 'e2e-admin', name: role === 'Creator' ? 'Alya' : `Release K ${role}` } }
      : (action === 'read_all' || action === 'read_dashboard') ? dashboardData : { success: true };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });

  await page.goto(initialPath);
  await page.getByRole('textbox', { name: 'Email Address *' }).fill('release-a@example.test');
  await page.getByLabel('Password (NIM) *').fill('test-only-password');
  await page.getByRole('button', { name: 'Login' }).click();
  const navigationName = (page.viewportSize()?.width || 0) < 1024 ? 'Mobile primary navigation' : 'Primary navigation';
  await expect(page.getByRole('navigation', { name: navigationName, exact: true })).toBeVisible();
}

async function openSettings(page) {
  if ((page.viewportSize()?.width || 0) < 1024) {
    await page.getByRole('navigation', { name: 'Mobile primary navigation', exact: true }).getByRole('button', { name: 'More', exact: true }).click();
    await page.getByRole('dialog', { name: 'More tools' }).getByRole('button', { name: /Settings/ }).click();
    return;
  }
  await page.getByRole('button', { name: /Settings/ }).click();
}

async function openAuthenticatedView(page, { mobileName, desktopName = mobileName, secondary = false }) {
  if ((page.viewportSize()?.width || 0) < 1024) {
    const navigation = page.getByRole('navigation', { name: 'Mobile primary navigation', exact: true });
    if (secondary) {
      await navigation.getByRole('button', { name: 'More', exact: true }).click();
      await page.getByRole('dialog', { name: 'More tools' }).getByRole('button', { name: mobileName }).click();
    } else {
      await navigation.getByRole('button', { name: mobileName }).click();
    }
    return;
  }
  await page.getByRole('navigation', { name: 'Primary navigation', exact: true }).getByRole('button', { name: desktopName }).click();
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
    await openAuthenticatedView(page, { mobileName: /Tasks/, desktopName: /Task List/, secondary: true });
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

test('authenticated content reflows at 200 and 400 percent zoom equivalents', async ({ page }) => {
  await openAuthenticatedDashboard(page);
  for (const width of [640, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const dimensions = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
    expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
    await expect(page.getByRole('navigation', { name: 'Mobile primary navigation', exact: true })).toBeVisible();
  }
});

test('core controls remain perceivable in Windows forced-colors mode', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' });
  await openAuthenticatedDashboard(page);
  const navigationName = (page.viewportSize()?.width || 0) < 1024 ? 'Mobile primary navigation' : 'Primary navigation';
  await expect(page.getByRole('navigation', { name: navigationName, exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /New Post/ })).toBeVisible();
});

test('dashboard prioritizes actionable deadlines and opens the exact task', async ({ page }) => {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const dashboardData = {
    ...seededData,
    schedule: { data: seededData.schedule.data.map((task) => ({ ...task, Date: tomorrow })) }
  };
  await openAuthenticatedDashboard(page, { dashboardData });
  await expect(page.getByRole('heading', { name: 'What needs attention' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Next deadline|Upcoming deadlines/ })).toBeVisible();
  await page.getByRole('button', { name: 'Open task Campus highlights' }).first().click();
  await expect(page.getByRole('heading', { name: 'Update Scheduled Task (TASK-001)' })).toBeVisible();
  await expect(page).toHaveURL(/view=tasklist&task=TASK-001/);
});

test('dashboard performance actions open analytics', async ({ page }) => {
  test.skip((page.viewportSize()?.width || 0) >= 1024, 'Compact dashboard actions are tested on mobile and tablet.');
  await openAuthenticatedDashboard(page);
  await page.getByRole('button', { name: 'Full analytics' }).click();
  await expect(page).toHaveURL(/view=analytics/);
});

test('admin navigation exposes administration controls', async ({ page }) => {
  await openAuthenticatedDashboard(page, { role: 'Admin' });
  if ((page.viewportSize()?.width || 0) < 1024) {
    const navigation = page.getByRole('navigation', { name: 'Mobile primary navigation', exact: true });
    await navigation.getByRole('button', { name: 'More', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'More tools' }).getByRole('button', { name: /Settings/ })).toBeVisible();
  } else {
    await expect(page.getByRole('navigation', { name: 'Primary navigation', exact: true }).getByRole('button', { name: /Task List/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Settings/ })).toBeVisible();
  }
  await expect(page.getByRole('button', { name: /New Post/ })).toBeVisible();
});

test('creator navigation supports assigned workflows without administration controls', async ({ page }) => {
  await openAuthenticatedDashboard(page, { role: 'Creator' });
  await expect(page.getByRole('heading', { name: 'What needs attention' })).toBeVisible();
  await expect(page.getByRole('button', { name: /New Post/ })).toHaveCount(0);
  await openAuthenticatedView(page, { mobileName: /My Work/ });
  await page.getByRole('button', { name: 'Open task Campus highlights' }).click();
  await expect(page.getByRole('heading', { name: 'Update Scheduled Task (TASK-001)' })).toBeVisible();
  await expect(page.getByTitle('Delete schedule entry')).toHaveCount(0);
});

test('viewer navigation contains reporting destinations without workflow dead ends', async ({ page }) => {
  await openAuthenticatedDashboard(page, { role: 'Viewer' });
  await expect(page.getByRole('heading', { name: 'What needs attention' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /New Post/ })).toHaveCount(0);
  await page.goto('/?view=content');
  await expect(page.locator('main#main-content')).toContainText('Total Views');
  await expect(page.getByRole('heading', { name: 'Posts Library' })).toHaveCount(0);
});

test('mobile navigation keeps five stable destinations without horizontal scrolling', async ({ page }) => {
  test.skip((page.viewportSize()?.width || 0) >= 1024, 'Mobile navigation is hidden on desktop.');
  await openAuthenticatedDashboard(page);
  const navigation = page.getByRole('navigation', { name: 'Mobile primary navigation', exact: true });
  await expect(navigation.getByRole('button')).toHaveCount(5);
  await expect(page.getByRole('button', { name: 'Toggle sidebar' })).toHaveCount(0);
  const dimensions = await navigation.evaluate((element) => ({ clientWidth: element.clientWidth, scrollWidth: element.scrollWidth }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
});

test('mobile More menu exposes secondary destinations and restores focus', async ({ page }) => {
  test.skip((page.viewportSize()?.width || 0) >= 1024, 'Mobile navigation is hidden on desktop.');
  await openAuthenticatedDashboard(page);
  const moreButton = page.getByRole('navigation', { name: 'Mobile primary navigation', exact: true }).getByRole('button', { name: 'More', exact: true });
  await moreButton.click();
  const menu = page.getByRole('dialog', { name: 'More tools' });
  await expect(menu).toBeVisible();
  await expect(menu.getByRole('button', { name: /Tasks/ })).toBeVisible();
  await expect(menu.getByRole('button', { name: /Settings/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(moreButton).toBeFocused();
});

test('mobile planner uses an agenda strip instead of a compressed month grid', async ({ page }) => {
  test.skip((page.viewportSize()?.width || 0) >= 640, 'Phone-specific planner layout is hidden on larger screens.');
  await openAuthenticatedDashboard(page);
  await openAuthenticatedView(page, { mobileName: /Planner/, desktopName: /Calendar/ });
  await expect(page.locator('.calendar-shell')).toBeHidden();
  const dateStrip = page.locator('[aria-label="Choose a planning date"]');
  await expect(dateStrip.getByRole('button')).toHaveCount(7);
  await dateStrip.getByRole('button', { name: /Tuesday, August 11/ }).click();
  await expect(page.getByText('Campus highlights')).toBeVisible();
  await expect(page.getByText('11/08/2026', { exact: true }).last()).toBeVisible();
});

test('opens the selected My Work assignment in the task editor', async ({ page }) => {
  await openAuthenticatedDashboard(page);
  await openAuthenticatedView(page, { mobileName: /My Work/ });
  await page.getByRole('button', { name: 'Open task Campus highlights' }).click();
  await expect(page.getByRole('heading', { name: 'Update Scheduled Task (TASK-001)' })).toBeVisible();
  await expect(page).toHaveURL(/view=tasklist&task=TASK-001/);
});

test('phone My Work uses compact assignment cards and the correct page title', async ({ page }) => {
  test.skip((page.viewportSize()?.width || 0) >= 640, 'Phone-specific My Work layout is hidden on larger screens.');
  await openAuthenticatedDashboard(page);
  await openAuthenticatedView(page, { mobileName: /My Work/ });
  await expect(page.locator('header').getByRole('heading', { name: 'My Work' })).toBeVisible();
  const assignment = page.getByRole('button', { name: 'Open task Campus highlights' });
  const status = assignment.getByText(/Due|Completed|overdue/);
  const measurements = await Promise.all([assignment.boundingBox(), status.boundingBox()]);
  expect(measurements[0].height).toBeLessThan(150);
  expect(measurements[1].width).toBeLessThan(measurements[0].width * 0.6);
});

test('phone My Work keeps a very long assignment title readable', async ({ page }) => {
  test.skip((page.viewportSize()?.width || 0) >= 640, 'Phone-specific My Work layout is hidden on larger screens.');
  const longTitle = 'Coordinate the complete semester campaign launch across every student community channel';
  const dashboardData = { ...seededData, schedule: { data: [{ ...seededData.schedule.data[0], 'Content Title': longTitle }] } };
  await openAuthenticatedDashboard(page, { dashboardData });
  await page.setViewportSize({ width: 320, height: 720 });
  await openAuthenticatedView(page, { mobileName: /My Work/ });
  const assignment = page.getByRole('button', { name: `Open task ${longTitle}` });
  await expect(assignment).toBeVisible();
  const box = await assignment.boundingBox();
  expect(box.height).toBeLessThan(170);
  const dimensions = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
});

test('My Work shows assignment-shaped placeholders while loading', async ({ page }) => {
  test.skip((page.viewportSize()?.width || 0) >= 640, 'Phone-specific My Work loading state is tested on phones.');
  await openAuthenticatedDashboard(page, { readDelayMs: 800 });
  await openAuthenticatedView(page, { mobileName: /My Work/ });
  const loadingState = page.getByRole('status', { name: 'Loading assigned tasks' });
  await expect(loadingState).toBeVisible();
  await expect(loadingState.locator('[aria-hidden="true"]')).toHaveCount(3);
  await expect(loadingState).toBeHidden();
});

test('My Work provides a useful empty state', async ({ page }) => {
  const dashboardData = { ...seededData, schedule: { data: [] } };
  await openAuthenticatedDashboard(page, { dashboardData });
  await openAuthenticatedView(page, { mobileName: /My Work/ });
  await expect(page.getByRole('status').filter({ hasText: 'Your queue is clear' })).toBeVisible();
  await page.getByRole('button', { name: 'Open Planner' }).click();
  await expect(page).toHaveURL(/view=calendar/);
});

test('keeps the authenticated view in the URL across refresh', async ({ page }) => {
  await openAuthenticatedDashboard(page);
  await openAuthenticatedView(page, { mobileName: /My Work/ });
  await expect(page).toHaveURL(/\?view=my-work$/);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'My Work' })).toBeVisible();
});

test('Home navigation clears stale footer fragments', async ({ page }) => {
  await openAuthenticatedDashboard(page);
  await page.evaluate(() => { window.location.hash = 'terms'; });
  await expect(page).toHaveURL(/#terms$/);
  const navigationName = (page.viewportSize()?.width || 0) < 1024 ? 'Mobile primary navigation' : 'Primary navigation';
  await page.getByRole('navigation', { name: navigationName, exact: true }).getByRole('button', { name: /Home|Dashboard/ }).click();
  await expect(page).not.toHaveURL(/#terms$/);
});

test('clears unknown URL fragments on initial load', async ({ page }) => {
  await openAuthenticatedDashboard(page, { initialPath: '/#outdated-section' });
  await expect(page).not.toHaveURL(/#outdated-section$/);
});

test('invalid authenticated views provide a recovery path', async ({ page }) => {
  await openAuthenticatedDashboard(page, { initialPath: '/?view=missing-workspace' });
  await expect(page.getByRole('heading', { name: 'This workspace view does not exist' })).toBeVisible();
  await page.getByRole('button', { name: 'Return home' }).click();
  await expect(page).not.toHaveURL(/view=missing-workspace/);
  await expect(page.getByRole('heading', { name: 'What needs attention' })).toBeVisible();
});

test('phone moves help and legal links into More instead of the page footer', async ({ page }) => {
  test.skip((page.viewportSize()?.width || 0) >= 640, 'Phone-specific footer treatment is hidden on larger screens.');
  await openAuthenticatedDashboard(page);
  await expect(page.locator('footer')).toBeHidden();
  await page.getByRole('navigation', { name: 'Mobile primary navigation', exact: true }).getByRole('button', { name: 'More', exact: true }).click();
  const menu = page.getByRole('dialog', { name: 'More tools' });
  await expect(menu.getByRole('button', { name: 'Operations Help' })).toBeVisible();
  await expect(menu.getByRole('link', { name: 'Privacy Policy' })).toBeVisible();
  await expect(menu.getByRole('link', { name: 'Terms of Service' })).toBeVisible();
});

test('keeps task editor values visible when required fields are missing', async ({ page }) => {
  await openAuthenticatedDashboard(page);
  await openAuthenticatedView(page, { mobileName: /Tasks/, desktopName: /Task List/, secondary: true });
  await page.getByRole('button', { name: /Add Scheduled Task/ }).click();
  await page.getByPlaceholder('Enter title (optional)').fill('Orientation recap');
  await page.getByRole('button', { name: 'Save Task' }).click();
  await expect(page.locator('.form-error-summary')).toContainText('Choose a scheduled date, PIC, and category before saving.');
  await expect(page.getByPlaceholder('Enter title (optional)')).toHaveValue('Orientation recap');
});

test('task editor traps focus and restores it to its opener', async ({ page }) => {
  await openAuthenticatedDashboard(page);
  await openAuthenticatedView(page, { mobileName: /Tasks/, desktopName: /Task List/, secondary: true });
  const opener = page.getByRole('button', { name: /Add Scheduled Task/ });
  await opener.click();
  const dialog = page.getByRole('dialog', { name: 'Add Scheduled Task' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Close task editor' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('button', { name: 'Save Task' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
});

test('announces successful saves and pending deletions', async ({ page }) => {
  await openAuthenticatedDashboard(page);
  await openAuthenticatedView(page, { mobileName: /Library/, desktopName: /Posts library/ });
  await page.getByRole('button', { name: /Orientation storyboard/ }).click();
  await page.getByPlaceholder('e.g. https://instagram.com/reel/123, https://youtube.com/watch?v=abc').fill('https://example.test/reference');
  await page.getByRole('button', { name: 'Save Script Draft' }).click();
  await expect(page.getByRole('status').filter({ hasText: /Storyboard draft updated|Script draft saved/ })).toBeVisible();
  await page.getByRole('button', { name: /Delete/ }).click();
  await page.getByRole('alertdialog', { name: 'Delete storyboard draft?' }).getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByRole('status').filter({ hasText: /will be deleted shortly/ })).toBeVisible();
});

test('analytics charts expose accessible text alternatives', async ({ page }) => {
  await openAuthenticatedDashboard(page);
  await openAuthenticatedView(page, { mobileName: /Content analytics/, desktopName: /^analytics Analytics$/i, secondary: true });
  for (const name of ['Views and engagement trend chart', 'Platform distribution chart', 'Total views by creator chart', 'Category share by views chart']) {
    await expect(page.getByRole('img', { name })).toHaveAttribute('aria-describedby');
  }
});

test('persists task search filters across refresh', async ({ page }) => {
  await openAuthenticatedDashboard(page);
  await openAuthenticatedView(page, { mobileName: /Tasks/, desktopName: /Task List/, secondary: true });
  await page.getByPlaceholder('Search tasks...').fill('Campus');
  await page.reload();
  await expect(page.getByPlaceholder('Search tasks...')).toHaveValue('Campus');
});

test('protects an unsaved task draft when closing the editor', async ({ page }) => {
  await openAuthenticatedDashboard(page);
  await openAuthenticatedView(page, { mobileName: /Tasks/, desktopName: /Task List/, secondary: true });
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
  await openAuthenticatedView(page, { mobileName: /Library/, desktopName: /Posts library/ });
  await page.getByRole('button', { name: /Orientation storyboard/ }).click();
  await expect(page.getByText('Live Preview Panel')).toHaveCount(0);
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
  await openAuthenticatedView(page, { mobileName: /Meeting memos/, desktopName: /Meeting Memo/, secondary: true });
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
  await page.reload();
  await expect(page.getByRole('status', { name: 'Loading dashboard' })).toBeHidden({ timeout: 10_000 });
  await expect(page.getByText('Edit Post Metrics')).toBeVisible({ timeout: 10_000 });
  await page.reload();
  await expect(page.getByText('Edit Post Metrics')).toBeVisible();
});

test('deep-links to a meeting memo and restores it after refresh', async ({ page }) => {
  await openAuthenticatedDashboard(page);
  await openAuthenticatedView(page, { mobileName: /Meeting memos/, desktopName: /Meeting Memo/, secondary: true });
  await page.getByRole('button', { name: /Weekly content planning decisions/ }).click();
  await expect(page).toHaveURL(/view=meeting&meeting=MM-001/);
  await page.reload();
  await expect(page.locator('.meeting-recap-text-container')).toContainText('Weekly content planning decisions');
});

test('shows a recovery state for an unavailable meeting link', async ({ page }) => {
  await openAuthenticatedDashboard(page);
  await page.goto('/?view=meeting&meeting=MM-MISSING');
  await page.reload();
  await expect(page.getByRole('status', { name: 'Loading dashboard' })).toBeHidden({ timeout: 10_000 });
  await expect(page.getByRole('heading', { name: 'Meeting memo unavailable' })).toBeVisible({ timeout: 10_000 });
  await page.getByRole('button', { name: 'Back to memo directory' }).click();
  await expect(page).not.toHaveURL(/meeting=/);
});

test('persists content-library search across refresh', async ({ page }) => {
  await openAuthenticatedDashboard(page);
  await openAuthenticatedView(page, { mobileName: /Library/, desktopName: /Posts library/ });
  await page.getByPlaceholder('Search backlog drafts...').fill('Orientation');
  await page.reload();
  await expect(page.getByPlaceholder('Search backlog drafts...')).toHaveValue('Orientation');
});

test('lets an admin hide a category from the Post Library without deleting drafts', async ({ page }) => {
  const actionLog = [];
  await openAuthenticatedDashboard(page, { actionLog });
  const navigationName = (page.viewportSize()?.width || 0) < 1024 ? 'Mobile primary navigation' : 'Primary navigation';
  const navigation = page.getByRole('navigation', { name: navigationName, exact: true });
  await openSettings(page);
  await page.getByRole('button', { name: 'categories', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Show Story Telling in Post Library' }).uncheck();
  await page.getByRole('button', { name: 'Save visibility' }).click();
  expect(actionLog).toContain('save_app_settings');
  await navigation.getByRole('button', { name: /Library|Posts library/ }).click();
  await expect(page.getByRole('button', { name: 'Story Telling', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Orientation storyboard/ })).toHaveCount(0);
});

test('keeps at least one Post Library category visible', async ({ page }) => {
  await openAuthenticatedDashboard(page);
  await openSettings(page);
  await page.getByRole('button', { name: 'categories', exact: true }).click();
  const checkboxes = page.getByRole('checkbox', { name: /in Post Library/ });
  const count = await checkboxes.count();
  for (let index = 0; index < count - 1; index += 1) await checkboxes.nth(index).uncheck();
  await checkboxes.last().click();
  await expect(page.getByText('At least one category must remain visible in the Post Library.')).toBeVisible();
  await expect.poll(async () => checkboxes.evaluateAll((items) => items.filter((item) => item.checked).length)).toBe(1);
});

test('undoes a scheduled task deletion before the API call', async ({ page }) => {
  const actionLog = [];
  await openAuthenticatedDashboard(page, { actionLog });
  await openAuthenticatedView(page, { mobileName: /Tasks/, desktopName: /Task List/, secondary: true });
  await page.getByTitle('Delete schedule entry').click();
  await page.getByRole('alertdialog', { name: 'Delete scheduled task?' }).getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText(/Campus highlights.*will be deleted shortly/)).toBeVisible();
  await page.getByRole('button', { name: 'Undo' }).click();
  await page.waitForTimeout(250);
  expect(actionLog).not.toContain('delete_schedule');
});

test('permanently deletes once after the undo window expires', async ({ page }) => {
  const actionLog = [];
  await openAuthenticatedDashboard(page, { actionLog });
  await openAuthenticatedView(page, { mobileName: /Tasks/, desktopName: /Task List/, secondary: true });
  await page.getByTitle('Delete schedule entry').click();
  await page.getByRole('alertdialog', { name: 'Delete scheduled task?' }).getByRole('button', { name: 'Delete' }).click();
  await expect.poll(() => actionLog.filter((action) => action === 'delete_schedule').length, { timeout: 8000 }).toBe(1);
});

test('uses the accessible undo flow for storyboard deletion', async ({ page }) => {
  const actionLog = [];
  await openAuthenticatedDashboard(page, { actionLog });
  await openAuthenticatedView(page, { mobileName: /Library/, desktopName: /Posts library/ });
  await page.getByRole('button', { name: /Orientation storyboard/ }).click();
  await page.getByRole('button', { name: /Delete/ }).click();
  await page.getByRole('alertdialog', { name: 'Delete storyboard draft?' }).getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('button', { name: 'Undo' }).click();
  expect(actionLog).not.toContain('delete_script');
});
