/** All coordinates are in the image's own pixels, never screen pixels. */
export type Point = { x: number; y: number }
export type Size = { width: number; height: number }
export type Rect = Point & Size

export type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'
export const HANDLES: readonly Handle[] = [
  'nw',
  'n',
  'ne',
  'e',
  'se',
  's',
  'sw',
  'w',
]

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

export const clampPoint = (point: Point, bounds: Size): Point => ({
  x: clamp(point.x, 0, bounds.width),
  y: clamp(point.y, 0, bounds.height),
})

/** The rectangle spanned by two corners, in any order (dragging up/left works). */
export const rectFromPoints = (a: Point, b: Point): Rect => ({
  x: Math.min(a.x, b.x),
  y: Math.min(a.y, b.y),
  width: Math.abs(b.x - a.x),
  height: Math.abs(b.y - a.y),
})

/** Moves a rectangle, keeping its size and stopping at the image edges. */
export const moveRect = (
  rect: Rect,
  dx: number,
  dy: number,
  bounds: Size,
): Rect => ({
  ...rect,
  x: clamp(rect.x + dx, 0, Math.max(0, bounds.width - rect.width)),
  y: clamp(rect.y + dy, 0, Math.max(0, bounds.height - rect.height)),
})

/**
 * Moves the edges a handle controls to `point` (clamped to the image). The
 * opposite edges stay put, and dragging past them flips the box instead of
 * producing a negative size. Always computed from the rect at gesture start.
 */
export const resizeRect = (
  rect: Rect,
  handle: Handle,
  point: Point,
  bounds: Size,
): Rect => {
  const { x, y } = clampPoint(point, bounds)
  let left = rect.x
  let top = rect.y
  let right = rect.x + rect.width
  let bottom = rect.y + rect.height
  if (handle.includes('w')) left = x
  if (handle.includes('e')) right = x
  if (handle.includes('n')) top = y
  if (handle.includes('s')) bottom = y
  return rectFromPoints({ x: left, y: top }, { x: right, y: bottom })
}

/** Where a handle sits on a rectangle. */
export const handlePosition = (rect: Rect, handle: Handle): Point => ({
  x: handle.includes('w')
    ? rect.x
    : handle.includes('e')
      ? rect.x + rect.width
      : rect.x + rect.width / 2,
  y: handle.includes('n')
    ? rect.y
    : handle.includes('s')
      ? rect.y + rect.height
      : rect.y + rect.height / 2,
})

export const isLargeEnough = (rect: Rect, minSize: number) =>
  rect.width >= minSize && rect.height >= minSize

export const sameRect = (a: Rect, b: Rect) =>
  a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height

/** Coordinates as fractions (0–1) of the image size. */
export const toNormalized = (rect: Rect, size: Size): Rect => ({
  x: rect.x / size.width,
  y: rect.y / size.height,
  width: rect.width / size.width,
  height: rect.height / size.height,
})
