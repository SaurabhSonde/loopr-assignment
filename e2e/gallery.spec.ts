import { expect, test } from '@playwright/test'

test('keeps photos and boxes across reloads, and deletes from the gallery', async ({
  page,
}) => {
  await page.goto('/')
  const shutter = page.getByRole('button', { name: 'Take photo' })
  await expect(shutter).toBeEnabled()
  await shutter.click()
  await page.getByRole('button', { name: /^Use (photo|anyway)$/ }).click()

  // Draw and label one box.
  const stage = page.getByTestId('annotation-stage')
  const area = (await stage.boundingBox())!
  await page.mouse.move(area.x + area.width * 0.3, area.y + area.height * 0.3)
  await page.mouse.down()
  await page.mouse.move(area.x + area.width * 0.6, area.y + area.height * 0.7, {
    steps: 8,
  })
  await page.mouse.up()
  const label = page.getByRole('textbox', { name: 'Label' })
  await label.fill('Car')
  await label.press('Enter')
  const box = page.getByRole('button', { name: /^Car, \d+ by \d+ pixels$/ })
  await expect(box).toBeVisible()

  // Edits are saved after a short pause; then a reload restores them.
  await page.waitForTimeout(1000)
  await page.reload()
  await expect(box).toBeVisible()

  await page.goto('/gallery')
  const card = page.getByRole('link', { name: /^Photo from .+, 1 box$/ })
  await expect(card).toBeVisible()

  await page.getByRole('button', { name: /^Delete photo from/ }).click()
  const dialog = page.getByRole('alertdialog')
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByText('No photos yet')).toBeVisible()

  await page.reload()
  await expect(page.getByText('No photos yet')).toBeVisible()
})

test('shows the latest photo on the camera’s gallery button', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Take photo' }).click()
  await page.getByRole('button', { name: /^Use (photo|anyway)$/ }).click()
  await expect(page).toHaveURL(/\/annotate\//)
  await page.getByRole('button', { name: 'Back' }).click()

  await expect(page).toHaveURL(/\/$/)
  await expect(
    page.getByRole('link', { name: 'Gallery' }).locator('img'),
  ).toBeVisible()
})
