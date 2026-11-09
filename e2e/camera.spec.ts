import { expect, test } from '@playwright/test'

// 2×2 PNG used for the upload path.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==',
  'base64',
)

test('captures with the camera, reviews, and retakes', async ({ page }) => {
  await page.goto('/')

  // Permission is pre-granted, so the camera starts without the explainer.
  const shutter = page.getByRole('button', { name: 'Take photo' })
  await expect(shutter).toBeEnabled()

  await shutter.click()
  await expect(page).toHaveURL(/\/review$/)
  await expect(page.getByRole('img', { name: 'Captured photo' })).toBeVisible()

  // The fake camera's flat green frame fails the thresholds, so the review
  // recommends a retake but still allows using the photo.
  await expect(
    page.getByRole('alert').filter({ hasText: 'Retake recommended' }),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Use anyway' })).toBeVisible()

  // Full report: inline on desktop, behind "Details" on phones.
  const details = page.getByRole('button', { name: 'Details' })
  if (await details.isVisible()) await details.click()
  const report = page.getByRole('region', { name: 'Image quality' })
  await expect(report.getByText('Resolution', { exact: true })).toBeVisible()
  // Pixel analysis (in the worker) has finished when the sharpness check shows.
  await expect(
    report.getByRole('listitem').filter({ hasText: /^Sharpness/ }),
  ).toBeVisible()
  await expect(report.getByText('Poor quality')).toBeVisible()
  await page.keyboard.press('Escape')

  await page.getByRole('button', { name: 'Retake' }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(shutter).toBeEnabled()
})

test.describe('without camera access', () => {
  test.beforeEach(async ({ page }) => {
    // Behave like a first visit where the user then blocks the prompt.
    await page.addInitScript(() => {
      navigator.permissions.query = async () =>
        ({
          state: 'prompt',
          addEventListener() {},
          removeEventListener() {},
        }) as unknown as PermissionStatus
      navigator.mediaDevices.getUserMedia = async () => {
        throw new DOMException('Permission denied', 'NotAllowedError')
      }
    })
  })

  test('asks in context, explains a denial, and offers upload', async ({
    page,
  }) => {
    await page.goto('/')

    await expect(
      page.getByRole('heading', { name: 'Allow camera access' }),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Start camera' }).click()

    const alert = page.getByRole('alert')
    await expect(
      alert.getByRole('heading', { name: 'Camera access is blocked' }),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Take photo' }),
    ).toBeDisabled()

    await page
      .locator('input[type=file]')
      .first()
      .setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: PNG })
    await expect(page).toHaveURL(/\/review$/)
    const details = page.getByRole('button', { name: 'Details' })
    if (await details.isVisible()) await details.click()
    await expect(
      page
        .getByRole('region', { name: 'Image quality' })
        .getByText('Uploaded image'),
    ).toBeVisible()
  })
})
