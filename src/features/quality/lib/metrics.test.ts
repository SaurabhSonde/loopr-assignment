import { describe, expect, it } from 'vitest'
import {
  clippedRatios,
  computeMetrics,
  blurEffect,
  luminanceStdDev,
  meanLuminance,
  sharpnessScore,
  toLuma,
  type LumaImage,
} from './metrics'

const image = (
  width: number,
  height: number,
  pixel: (x: number, y: number) => number,
): LumaImage => {
  const data = new Uint8ClampedArray(width * height)
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) data[y * width + x] = pixel(x, y)
  return { data, width, height }
}

const flat = (value: number) => image(32, 32, () => value)
const checkerboard = image(32, 32, (x, y) => ((x + y) % 2 ? 255 : 0))
/** A soft left-to-right ramp: no sharp edges at all. */
const gradient = image(32, 32, (x) => x * 8)

describe('toLuma', () => {
  it('weights green most, then red, then blue', () => {
    const rgba = new Uint8ClampedArray([
      255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255,
    ])
    const { data } = toLuma(rgba, 4, 1)
    expect(data[1]).toBeGreaterThan(data[0])
    expect(data[0]).toBeGreaterThan(data[2])
    expect(data[3]).toBe(255) // weights sum to 256, so white stays white
  })
})

describe('brightness and contrast', () => {
  it('measures the mean and spread of brightness', () => {
    expect(meanLuminance(flat(100))).toBe(100)
    expect(luminanceStdDev(flat(100))).toBe(0)
    expect(meanLuminance(checkerboard)).toBeCloseTo(127.5)
    expect(luminanceStdDev(checkerboard)).toBeCloseTo(127.5)
  })
})

describe('clippedRatios', () => {
  it('counts near-black and near-white pixels separately', () => {
    expect(clippedRatios(flat(0))).toEqual({ shadows: 1, highlights: 0 })
    expect(clippedRatios(flat(255))).toEqual({ shadows: 0, highlights: 1 })
    expect(clippedRatios(checkerboard)).toEqual({
      shadows: 0.5,
      highlights: 0.5,
    })
    expect(clippedRatios(flat(128))).toEqual({ shadows: 0, highlights: 0 })
  })
})

/** Deterministic pseudo-random values (stand-in for real-world detail). */
const noise = (x: number, y: number) => {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return (h ^ (h >>> 16)) & 255
}
/** Edges at two scales: 8 px blocks plus fine grain. */
const scene = image(128, 128, (x, y) =>
  Math.round((noise(x >> 3, y >> 3) + noise(x >> 1, y >> 1) / 4) % 256),
)

/** Box-averages each row; repeated three times it approximates a Gaussian. */
const boxRows = (source: LumaImage, radius: number) =>
  image(source.width, source.height, (x, y) => {
    let sum = 0
    for (let k = -radius; k <= radius; k++) {
      const xx = Math.min(source.width - 1, Math.max(0, x + k))
      sum += source.data[y * source.width + xx]
    }
    return Math.round(sum / (2 * radius + 1))
  })

/** Smooth blur in one direction only, like hand shake during the exposure. */
const shake = (source: LumaImage, radius: number) =>
  boxRows(boxRows(boxRows(source, radius), radius), radius)

describe('blurEffect / sharpnessScore', () => {
  it('treats an image with no detail as fully blurred', () => {
    expect(blurEffect(flat(128))).toBe(1)
    expect(sharpnessScore(flat(128))).toBe(0)
    // A smooth ramp has no edges for blur to remove either.
    expect(sharpnessScore(gradient)).toBeLessThan(15)
  })

  it('scores fine detail and hard edges as sharp', () => {
    expect(sharpnessScore(scene)).toBeGreaterThan(80)
    expect(sharpnessScore(checkerboard)).toBeGreaterThan(80)
  })

  it('catches blur in a single direction (camera shake)', () => {
    expect(sharpnessScore(shake(scene, 3))).toBeLessThan(40)
  })

  it('drops steadily as the blur gets stronger', () => {
    const scores = [1, 2, 4].map((radius) =>
      sharpnessScore(shake(scene, radius)),
    )
    expect(scores).toEqual([...scores].sort((a, b) => b - a))
    expect(scores[0]).toBeGreaterThan(scores[2] + 25)
  })

  it("doesn't depend on the scene's contrast", () => {
    const lowContrast = image(
      128,
      128,
      (x, y) => 64 + (scene.data[y * 128 + x] >> 1),
    )
    expect(
      Math.abs(sharpnessScore(lowContrast) - sharpnessScore(scene)),
    ).toBeLessThanOrEqual(5)
  })
})

describe('computeMetrics', () => {
  it('flags a dark, flat frame', () => {
    const metrics = computeMetrics(flat(3))
    expect(metrics.brightness).toBe(3)
    expect(metrics.contrast).toBe(0)
    expect(metrics.clippedShadows).toBe(1)
    expect(metrics.sharpness).toBe(0)
  })
})
