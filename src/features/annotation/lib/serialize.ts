import type { Annotation } from './editor'
import { toNormalized, type Size } from './geometry'

const round = (value: number, digits: number) => {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

/**
 * Annotations as plain JSON: pixel coordinates in the photo, plus the same
 * box as 0–1 fractions so it can be applied to any copy of the image.
 */
export const serializeAnnotations = (
  image: Size,
  annotations: Annotation[],
) => ({
  image: { width: image.width, height: image.height },
  annotations: annotations.map((annotation) => {
    const norm = toNormalized(annotation, image)
    return {
      label: annotation.label,
      px: {
        x: Math.round(annotation.x),
        y: Math.round(annotation.y),
        width: Math.round(annotation.width),
        height: Math.round(annotation.height),
      },
      norm: {
        x: round(norm.x, 4),
        y: round(norm.y, 4),
        width: round(norm.width, 4),
        height: round(norm.height, 4),
      },
    }
  }),
})
