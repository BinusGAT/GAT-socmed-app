import { expect, test } from '@playwright/test';

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
  await expect(page.getByRole('textbox', { name: 'NIM *' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('keeps the login controls usable at mobile width', async ({ page }) => {
  await page.goto('/');
  const email = page.getByRole('textbox', { name: 'Email Address *' });
  const nim = page.getByRole('textbox', { name: 'NIM *' });
  await expect(email).toBeInViewport();
  await expect(nim).toBeInViewport();
  await email.fill('user@example.test');
  await nim.fill('1234567890');
  await expect(page.getByRole('button', { name: 'Login' })).toBeEnabled();
});
