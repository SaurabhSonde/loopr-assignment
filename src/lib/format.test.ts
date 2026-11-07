import { describe, expect, it } from 'vitest'
import {
  formatBytes,
  formatDimensions,
  formatMegapixels,
  megapixels,
} from './format'

describe('formatBytes', () => {
  it.each([
    [0, '0 B'],
    [512, '512 B'],
    [1536, '1.5 KB'],
    [3_250_000, '3.1 MB'],
    [150 * 1024 * 1024, '150 MB'],
    [3 * 1024 ** 3, '3.0 GB'],
  ])('formats %d as %s', (bytes, expected) => {
    expect(formatBytes(bytes)).toBe(expected)
  })

  it('returns a dash for invalid input', () => {
    expect(formatBytes(-1)).toBe('—')
    expect(formatBytes(Number.NaN)).toBe('—')
  })
})

describe('megapixels', () => {
  it('computes MP from dimensions', () => {
    expect(megapixels(4000, 3000)).toBe(12)
    expect(formatMegapixels(1920, 1080)).toBe('2.1 MP')
  })

  it('formats dimensions', () => {
    expect(formatDimensions(4032, 3024)).toBe('4032 × 3024')
  })
})
