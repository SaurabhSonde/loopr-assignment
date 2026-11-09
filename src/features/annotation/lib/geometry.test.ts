import { describe, expect, it } from 'vitest'
import {
  clampPoint,
  handlePosition,
  HANDLES,
  isLargeEnough,
  moveRect,
  rectFromPoints,
  resizeRect,
  toNormalized,
  type Rect,
} from './geometry'

const bounds = { width: 1000, height: 800 }
const rect: Rect = { x: 100, y: 100, width: 200, height: 100 }

describe('rectFromPoints', () => {
  it('normalizes corners dragged in any direction', () => {
    const expected = { x: 10, y: 20, width: 90, height: 60 }
    expect(rectFromPoints({ x: 10, y: 20 }, { x: 100, y: 80 })).toEqual(
      expected,
    )
    expect(rectFromPoints({ x: 100, y: 80 }, { x: 10, y: 20 })).toEqual(
      expected,
    )
    expect(rectFromPoints({ x: 100, y: 20 }, { x: 10, y: 80 })).toEqual(
      expected,
    )
  })
})

describe('clampPoint', () => {
  it('keeps points on the image', () => {
    expect(clampPoint({ x: -5, y: 900 }, bounds)).toEqual({ x: 0, y: 800 })
  })
})

describe('moveRect', () => {
  it('moves by the drag distance', () => {
    expect(moveRect(rect, 50, -20, bounds)).toEqual({ ...rect, x: 150, y: 80 })
  })

  it('stops at the image edges without changing size', () => {
    expect(moveRect(rect, -500, 5000, bounds)).toEqual({
      x: 0,
      y: 700,
      width: 200,
      height: 100,
    })
  })
})

describe('resizeRect', () => {
  it.each([
    ['nw', { x: 50, y: 50 }, { x: 50, y: 50, width: 250, height: 150 }],
    ['n', { x: 999, y: 50 }, { x: 100, y: 50, width: 200, height: 150 }],
    ['ne', { x: 400, y: 50 }, { x: 100, y: 50, width: 300, height: 150 }],
    ['e', { x: 400, y: 999 }, { x: 100, y: 100, width: 300, height: 100 }],
    ['se', { x: 400, y: 300 }, { x: 100, y: 100, width: 300, height: 200 }],
    ['s', { x: -99, y: 300 }, { x: 100, y: 100, width: 200, height: 200 }],
    ['sw', { x: 50, y: 300 }, { x: 50, y: 100, width: 250, height: 200 }],
    ['w', { x: 50, y: -99 }, { x: 50, y: 100, width: 250, height: 100 }],
  ] as const)('%s moves only its own edges', (handle, point, expected) => {
    expect(resizeRect(rect, handle, point, bounds)).toEqual(expected)
  })

  it('flips instead of going negative when dragged past the opposite edge', () => {
    // Dragging the right edge to the left of the box's left edge.
    expect(resizeRect(rect, 'e', { x: 40, y: 0 }, bounds)).toEqual({
      x: 40,
      y: 100,
      width: 60,
      height: 100,
    })
  })

  it('never resizes beyond the image', () => {
    expect(resizeRect(rect, 'se', { x: 5000, y: 5000 }, bounds)).toEqual({
      x: 100,
      y: 100,
      width: 900,
      height: 700,
    })
  })
})

describe('handlePosition', () => {
  it('places all eight handles on the corners and edge midpoints', () => {
    const positions = HANDLES.map((handle) => handlePosition(rect, handle))
    expect(positions).toEqual([
      { x: 100, y: 100 },
      { x: 200, y: 100 },
      { x: 300, y: 100 },
      { x: 300, y: 150 },
      { x: 300, y: 200 },
      { x: 200, y: 200 },
      { x: 100, y: 200 },
      { x: 100, y: 150 },
    ])
  })
})

describe('isLargeEnough', () => {
  it('rejects accidental taps', () => {
    expect(isLargeEnough({ x: 0, y: 0, width: 3, height: 50 }, 8)).toBe(false)
    expect(isLargeEnough({ x: 0, y: 0, width: 8, height: 8 }, 8)).toBe(true)
  })
})

describe('toNormalized', () => {
  it('expresses a box as fractions of the image', () => {
    expect(toNormalized(rect, bounds)).toEqual({
      x: 0.1,
      y: 0.125,
      width: 0.2,
      height: 0.125,
    })
  })
})
