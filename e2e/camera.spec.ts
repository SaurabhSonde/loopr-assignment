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
  await expect(page.getByText(/\d+ × \d+ · [\d.]+ MP/)).toBeVisible()

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
    await expect(page.getByText('Uploaded image')).toBeVisible()
  })
})
