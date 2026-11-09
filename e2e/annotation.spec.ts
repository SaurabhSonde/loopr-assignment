import { expect, test, type Locator, type Page } from '@playwright/test'

const openEditor = async (page: Page) => {
  await page.goto('/')
  const shutter = page.getByRole('button', { name: 'Take photo' })
  await expect(shutter).toBeEnabled()
  await shutter.click()
  // The fake camera's frame rates Poor, so the button reads "Use anyway".
  await page.getByRole('button', { name: /^Use (photo|anyway)$/ }).click()
  await expect(page).toHaveURL(/\/annotate\//)
  const stage = page.getByTestId('annotation-stage')
  await expect(stage).toBeVisible()
  return stage
}

const boundsOf = async (locator: Locator) => {
  const box = await locator.boundingBox()
  if (!box) throw new Error('Element is not visible')
  return box
}

/** Drags with the mouse between two points, as fractions of `area`. */
const dragAcross = async (
  page: Page,
  area: Locator,
  from: [number, number],
  to: [number, number],
) => {
  const box = await boundsOf(area)
  await page.mouse.move(
    box.x + box.width * from[0],
    box.y + box.height * from[1],
  )
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * to[0], box.y + box.height * to[1], {
    steps: 8,
  })
  await page.mouse.up()
}

/** An element's position and size as fractions of the stage. */
const relativeTo = async (stage: Locator, element: Locator) => {
  const s = await boundsOf(stage)
  const e = await boundsOf(element)
  return {
    x: (e.x - s.x) / s.width,
    y: (e.y - s.y) / s.height,
    width: e.width / s.width,
    height: e.height / s.height,
  }
}

test('draws, labels, resizes and undoes a box', async ({ page }) => {
  const stage = await openEditor(page)
  const boxes = page.locator('[data-annotation-id]')

  await dragAcross(page, stage, [0.2, 0.2], [0.6, 0.7])
  await expect(boxes).toHaveCount(1)

  // A new box asks for a label straight away.
  const labelBar = page.getByRole('dialog', { name: 'Label this box' })
  await labelBar.getByRole('textbox', { name: 'Label' }).fill('Car')
  await labelBar.getByRole('textbox', { name: 'Label' }).press('Enter')
  const box = page.getByRole('button', { name: /^Car, \d+ by \d+ pixels$/ })
  await expect(box).toBeVisible()

  // Resize from the bottom-right handle.
  const before = await relativeTo(stage, box)
  const handle = await boundsOf(page.locator('[data-handle="se"] rect').first())
  const stageBox = await boundsOf(stage)
  await page.mouse.move(
    handle.x + handle.width / 2,
    handle.y + handle.height / 2,
  )
  await page.mouse.down()
  await page.mouse.move(
    handle.x + handle.width / 2 + stageBox.width * 0.15,
    handle.y + handle.height / 2 + stageBox.height * 0.15,
    { steps: 8 },
  )
  await page.mouse.up()
  const resized = await relativeTo(stage, box)
  expect(resized.width).toBeGreaterThan(before.width + 0.1)

  // One undo reverts the whole drag, not each pixel of it.
  await page.keyboard.press('Control+z')
  await expect
    .poll(async () => (await relativeTo(stage, box)).width)
    .toBeCloseTo(before.width, 2)
})

/**
 * One synchronous read of how the overlay sits on the photo:
 * - how far the SVG's box is from the <img> box, in screen px;
 * - whether the SVG's coordinate system is the photo's pixel grid;
 * - where the box is drawn, as fractions of the photo on screen.
 */
const overlayLayout = (page: Page) =>
  page.evaluate(() => {
    const img = document.querySelector<HTMLImageElement>(
      'img[alt="Photo being annotated"]',
    )!
    const svg = document.querySelector<SVGSVGElement>(
      '[data-testid="annotation-stage"]',
    )!
    const shape = svg.querySelector<SVGRectElement>(
      '[data-annotation-id] rect:last-of-type',
    )!
    const photo = img.getBoundingClientRect()
    const overlay = svg.getBoundingClientRect()
    const grid = svg.viewBox.baseVal
    const toScreenX = (x: number) =>
      overlay.x + (x / grid.width) * overlay.width
    const toScreenY = (y: number) =>
      overlay.y + (y / grid.height) * overlay.height
    const x = shape.x.baseVal.value
    const y = shape.y.baseVal.value
    const width = shape.width.baseVal.value
    const height = shape.height.baseVal.value
    return {
      photoWidth: photo.width,
      overlayOffsetPx: Math.max(
        Math.abs(overlay.x - photo.x),
        Math.abs(overlay.y - photo.y),
        Math.abs(overlay.width - photo.width),
        Math.abs(overlay.height - photo.height),
      ),
      gridIsPhotoPixels:
        grid.width === img.naturalWidth && grid.height === img.naturalHeight,
      drawn: {
        x: (toScreenX(x) - photo.x) / photo.width,
        y: (toScreenY(y) - photo.y) / photo.height,
        right: (toScreenX(x + width) - photo.x) / photo.width,
        bottom: (toScreenY(y + height) - photo.y) / photo.height,
      },
    }
  })

test('keeps boxes aligned with the photo when the device rotates', async ({
  page,
}) => {
  const stage = await openEditor(page)
  await dragAcross(page, stage, [0.25, 0.3], [0.55, 0.8])
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-annotation-id]')).toHaveCount(1)

  const before = await overlayLayout(page)
  expect(before.gridIsPhotoPixels).toBe(true)
  expect(before.overlayOffsetPx).toBeLessThan(0.5)

  // Rotate: swap the viewport's width and height.
  const viewport = page.viewportSize()!
  await page.setViewportSize({ width: viewport.height, height: viewport.width })
  await expect
    .poll(async () => (await overlayLayout(page)).photoWidth)
    .not.toBeCloseTo(before.photoWidth, 0)

  const after = await overlayLayout(page)
  expect(after.overlayOffsetPx).toBeLessThan(0.5)
  // The box still covers the same part of the photo.
  for (const edge of ['x', 'y', 'right', 'bottom'] as const) {
    expect(after.drawn[edge]).toBeCloseTo(before.drawn[edge], 3)
  }
})

test('deletes a box and brings it back from the toast', async ({ page }) => {
  const stage = await openEditor(page)
  const boxes = page.locator('[data-annotation-id]')
  await dragAcross(page, stage, [0.3, 0.3], [0.6, 0.6])
  await page.keyboard.press('Escape')
  await expect(boxes).toHaveCount(1)

  await boxes.first().click()
  await page.keyboard.press('Delete')
  await expect(boxes).toHaveCount(0)

  await page
    .locator('[data-sonner-toast]')
    .getByRole('button', { name: 'Undo' })
    .click()
  await expect(boxes).toHaveCount(1)
})

test('draws accurately while zoomed in', async ({ page }) => {
  const stage = await openEditor(page)
  await page.getByRole('button', { name: 'Zoom in' }).click()
  await page.getByRole('button', { name: 'Zoom in' }).click()
  await expect(page.getByRole('group', { name: 'Zoom' })).toContainText('225%')

  // Draw across the middle of the visible area.
  const area = await boundsOf(page.getByRole('main').locator('section').first())
  const start = { x: area.x + area.width * 0.4, y: area.y + area.height * 0.4 }
  const end = { x: area.x + area.width * 0.6, y: area.y + area.height * 0.6 }
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(end.x, end.y, { steps: 8 })
  await page.mouse.up()
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-annotation-id]')).toHaveCount(1)

  // The stored box covers exactly the photo pixels that were under the pointer.
  const result = await page.evaluate(
    ([sx, sy, ex, ey]) => {
      const img = document.querySelector<HTMLImageElement>(
        'img[alt="Photo being annotated"]',
      )!
      const shape = document.querySelector<SVGRectElement>(
        '[data-annotation-id] rect:last-of-type',
      )!
      const photo = img.getBoundingClientRect()
      const toImage = (x: number, y: number) => ({
        x: ((x - photo.left) / photo.width) * img.naturalWidth,
        y: ((y - photo.top) / photo.height) * img.naturalHeight,
      })
      return {
        expected: [toImage(sx, sy), toImage(ex, ey)],
        actual: {
          x: shape.x.baseVal.value,
          y: shape.y.baseVal.value,
          right: shape.x.baseVal.value + shape.width.baseVal.value,
          bottom: shape.y.baseVal.value + shape.height.baseVal.value,
        },
        imagePxPerScreenPx: img.naturalWidth / photo.width,
      }
    },
    [start.x, start.y, end.x, end.y],
  )
  // Within one screen pixel.
  const tolerance = result.imagePxPerScreenPx
  expect(Math.abs(result.actual.x - result.expected[0].x)).toBeLessThan(
    tolerance,
  )
  expect(Math.abs(result.actual.y - result.expected[0].y)).toBeLessThan(
    tolerance,
  )
  expect(Math.abs(result.actual.right - result.expected[1].x)).toBeLessThan(
    tolerance,
  )
  expect(Math.abs(result.actual.bottom - result.expected[1].y)).toBeLessThan(
    tolerance,
  )
  await expect(stage).toBeVisible()
})
