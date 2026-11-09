import type { Point, Size } from './geometry'

/**
 * Zoom and pan of the fitted photo, applied as a CSS transform. `x`/`y` are
 * screen px offsets from the photo's centered (fit) position.
 */
export type View = { zoom: number; x: number; y: number }

export const FIT_VIEW: View = { zoom: 1, x: 0, y: 0 }
export const MAX_ZOOM = 8

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

/** Offset along one axis: centered while smaller than the stage, else no gaps at the edges. */
const clampOffset = (
  size: number,
  available: number,
  zoom: number,
  offset: number,
) => {
  const scaled = size * zoom
  const base = (available - size) / 2
  if (scaled <= available) return (available - scaled) / 2 - base
  return clamp(offset, available - scaled - base, -base)
}

/** Keeps zoom within limits and the photo covering the stage when zoomed in. */
export const clampView = (view: View, photo: Size, stage: Size): View => {
  const zoom = clamp(view.zoom, 1, MAX_ZOOM)
  return {
    zoom,
    x: clampOffset(photo.width, stage.width, zoom, view.x),
    y: clampOffset(photo.height, stage.height, zoom, view.y),
  }
}

/**
 * Zooms so the photo point under `focus` (stage coordinates) stays under it,
 * like zooming a map at the cursor or between two fingers.
 */
export const zoomAt = (
  view: View,
  nextZoom: number,
  focus: Point,
  photo: Size,
  stage: Size,
): View => {
  const base = {
    x: (stage.width - photo.width) / 2,
    y: (stage.height - photo.height) / 2,
  }
  const local = {
    x: (focus.x - base.x - view.x) / view.zoom,
    y: (focus.y - base.y - view.y) / view.zoom,
  }
  return clampView(
    {
      zoom: nextZoom,
      x: focus.x - base.x - local.x * nextZoom,
      y: focus.y - base.y - local.y * nextZoom,
    },
    photo,
    stage,
  )
}

/**
 * Two-finger gesture: scale by how far the fingers spread, and keep the photo
 * point that was under their starting midpoint under the current midpoint
 * (so it pans and zooms at once).
 */
export const pinchView = (
  start: View,
  startMid: Point,
  startDistance: number,
  mid: Point,
  distance: number,
  photo: Size,
  stage: Size,
): View => {
  const base = {
    x: (stage.width - photo.width) / 2,
    y: (stage.height - photo.height) / 2,
  }
  const zoom = clamp(start.zoom * (distance / startDistance), 1, MAX_ZOOM)
  const local = {
    x: (startMid.x - base.x - start.x) / start.zoom,
    y: (startMid.y - base.y - start.y) / start.zoom,
  }
  return clampView(
    {
      zoom,
      x: mid.x - base.x - local.x * zoom,
      y: mid.y - base.y - local.y * zoom,
    },
    photo,
    stage,
  )
}
