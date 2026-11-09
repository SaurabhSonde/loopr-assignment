import { describe, expect, it } from 'vitest'
import { clampView, FIT_VIEW, MAX_ZOOM, pinchView, zoomAt } from './zoom'

// A 400×300 photo centered in a 600×300 stage (100 px gaps left and right).
const photo = { width: 400, height: 300 }
const stage = { width: 600, height: 300 }

/** Where a photo-local point lands on the stage for a given view. */
const toStage = (view: typeof FIT_VIEW, x: number, y: number) => ({
  x: 100 + view.x + x * view.zoom,
  y: 0 + view.y + y * view.zoom,
})

describe('clampView', () => {
  it('keeps zoom between fit and the maximum', () => {
    expect(clampView({ zoom: 0.2, x: 0, y: 0 }, photo, stage).zoom).toBe(1)
    expect(clampView({ zoom: 99, x: 0, y: 0 }, photo, stage).zoom).toBe(
      MAX_ZOOM,
    )
  })

  it('centers the photo along an axis where it still fits', () => {
    // At 1.25× the photo is 500 px wide: still narrower than the stage.
    const view = clampView({ zoom: 1.25, x: 999, y: 0 }, photo, stage)
    expect(toStage(view, 0, 0).x).toBe(50)
  })

  it("doesn't let a zoomed photo leave gaps at the stage edges", () => {
    const view = clampView({ zoom: 2, x: 5000, y: -5000 }, photo, stage)
    expect(toStage(view, 0, 0).x).toBe(0) // left edge pinned
    expect(toStage(view, 0, 300).y).toBe(300) // bottom edge pinned
  })
})

describe('zoomAt', () => {
  it('keeps the point under the cursor in place', () => {
    const focus = { x: 300, y: 150 }
    const view = zoomAt(FIT_VIEW, 2, focus, photo, stage)
    // Photo point (200, 150) was under the cursor at fit; it still is.
    expect(toStage(view, 200, 150)).toEqual(focus)
    expect(view.zoom).toBe(2)
  })
})

describe('pinchView', () => {
  it('zooms by finger spread and follows the midpoint', () => {
    const start = zoomAt(FIT_VIEW, 2, { x: 300, y: 150 }, photo, stage)
    const view = pinchView(
      start,
      { x: 300, y: 150 },
      100,
      { x: 320, y: 150 },
      150,
      photo,
      stage,
    )
    expect(view.zoom).toBe(3)
    // The photo point that was between the fingers moved with them.
    expect(toStage(view, 200, 150)).toEqual({ x: 320, y: 150 })
  })
})
