/** One brightness value (0–255) per pixel. */
export type LumaImage = {
  data: Uint8ClampedArray
  width: number
  height: number
}

export type ImageMetrics = {
  /** Mean luma, 0–255. */
  brightness: number
  /** Standard deviation of luma; low means flat/washed out. */
  contrast: number
  /** Share of near-black pixels (crushed shadows), 0–1. */
  clippedShadows: number
  /** Share of near-white pixels (blown highlights), 0–1. */
  clippedHighlights: number
  /** 0–100 from the blur-effect metric; low means blurred (any direction). */
  sharpness: number
}

const SHADOW_CLIP = 5
const HIGHLIGHT_CLIP = 250

/** RGBA → luma with Rec. 601 weights (integer approximation). */
export const toLuma = (
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
): LumaImage => {
  const data = new Uint8ClampedArray(width * height)
  for (let i = 0, p = 0; p < data.length; i += 4, p++) {
    data[p] = (77 * rgba[i] + 150 * rgba[i + 1] + 29 * rgba[i + 2]) >> 8
  }
  return { data, width, height }
}

export const meanLuminance = ({ data }: LumaImage) => {
  let sum = 0
  for (const value of data) sum += value
  return data.length ? sum / data.length : 0
}

export const luminanceStdDev = (
  luma: LumaImage,
  mean = meanLuminance(luma),
) => {
  let sum = 0
  for (const value of luma.data) sum += (value - mean) ** 2
  return luma.data.length ? Math.sqrt(sum / luma.data.length) : 0
}

export const clippedRatios = ({ data }: LumaImage) => {
  let shadows = 0
  let highlights = 0
  for (const value of data) {
    if (value <= SHADOW_CLIP) shadows++
    else if (value >= HIGHLIGHT_CLIP) highlights++
  }
  const total = data.length || 1
  return { shadows: shadows / total, highlights: highlights / total }
}

/** Width of the re-blur filter, as in the reference implementation. */
const REBLUR_SIZE = 11
const REBLUR_RADIUS = (REBLUR_SIZE - 1) / 2

/**
 * Blur along one axis: how little the neighbour-to-neighbour differences
 * shrink when the image is blurred a bit more. 0 = sharp, 1 = no detail left.
 */
const axisBlur = ({ data, width, height }: LumaImage, horizontal: boolean) => {
  const lines = horizontal ? height : width
  const length = horizontal ? width : height
  const step = horizontal ? 1 : width
  const at = (line: number, i: number) =>
    data[(horizontal ? line * width : line) + i * step]
  const clamp = (i: number) => Math.min(length - 1, Math.max(0, i))
  const blurred = new Float32Array(length)
  let original = 0
  let lost = 0

  for (let line = 0; line < lines; line++) {
    // Box blur via a running sum (edges repeat the border pixel).
    let sum = 0
    for (let k = -REBLUR_RADIUS; k <= REBLUR_RADIUS; k++)
      sum += at(line, clamp(k))
    for (let i = 0; i < length; i++) {
      blurred[i] = sum / REBLUR_SIZE
      sum +=
        at(line, clamp(i + REBLUR_RADIUS + 1)) -
        at(line, clamp(i - REBLUR_RADIUS))
    }
    for (let i = 1; i < length; i++) {
      const difference = Math.abs(at(line, i) - at(line, i - 1))
      const blurredDifference = Math.abs(blurred[i] - blurred[i - 1])
      original += difference
      lost += Math.max(0, difference - blurredDifference)
    }
  }
  return original === 0 ? 1 : (original - lost) / original
}

/**
 * The "blur effect" no-reference metric (Crété-Roffet et al., 2007; also
 * scikit-image's `blur_effect`). Re-blurring a sharp image changes it a lot;
 * re-blurring an already blurry one barely does. Being a ratio, it doesn't
 * depend on the scene's contrast, and taking the worse axis catches
 * one-directional motion blur (camera shake).
 */
export const blurEffect = (luma: LumaImage) =>
  Math.max(axisBlur(luma, true), axisBlur(luma, false))

/** 0–100, higher is sharper. */
export const sharpnessScore = (luma: LumaImage) =>
  Math.round((1 - blurEffect(luma)) * 100)

export const computeMetrics = (luma: LumaImage): ImageMetrics => {
  const brightness = meanLuminance(luma)
  const clipped = clippedRatios(luma)
  return {
    brightness,
    contrast: luminanceStdDev(luma, brightness),
    clippedShadows: clipped.shadows,
    clippedHighlights: clipped.highlights,
    sharpness: sharpnessScore(luma),
  }
}
