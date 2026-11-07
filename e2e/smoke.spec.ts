import { expect, test } from '@playwright/test'

test('app shell loads and routes between screens', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Camera' })).toBeVisible()

  await page.getByRole('link', { name: 'Gallery' }).click()
  await expect(page).toHaveURL(/\/gallery$/)
  await expect(page.getByRole('heading', { name: 'Gallery' })).toBeVisible()
})

test('unknown routes fall back to the camera', async ({ page }) => {
  await page.goto('/does-not-exist')
  await expect(page).toHaveURL(/\/$/)
})
