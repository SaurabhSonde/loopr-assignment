/**
 * Every quality threshold in one place (documented in the README).
 * Pixel metrics are measured on a copy downscaled to ANALYSIS_SIZE so they
 * don't depend on the photo's resolution.
 */

/** Longest side, in pixels, of the copy the pixel metrics are measured on. */
export const ANALYSIS_SIZE = 640

const MB = 1024 * 1024
const KB = 1024

export const THRESHOLDS = {
  /** Megapixels: ≥ good is Good, ≥ fair is Fair, below is Poor. */
  resolution: { good: 8, fair: 2 },
  /** Bytes: very small files are usually blank or heavily compressed. */
  fileSize: { poorBelow: 150 * KB, fairBelow: 500 * KB, fairAbove: 15 * MB },
  /** Mean luma (0–255): Good inside [goodMin, goodMax], Fair inside [fairMin, fairMax]. */
  brightness: { goodMin: 70, goodMax: 190, fairMin: 45, fairMax: 215 },
  /** Share of clipped pixels (either end): ≤ good is Good, ≤ fair is Fair. */
  clipping: { good: 0.05, fair: 0.15 },
  /**
   * Sharpness score 0–100 (1 − blur effect): ≥ good is Good, ≥ fair is Fair.
   * Calibrated on a Samsung S24 (12.5 MP): hand-held sharp shots scored 77–79,
   * a visibly shaken one 58. Synthetic Gaussian-like blur gives ~63 (light)
   * and ~47 (medium).
   */
  sharpness: { good: 70, fair: 60 },
  /** Luma standard deviation: ≥ good is Good, ≥ fair is Fair. */
  contrast: { good: 40, fair: 20 },
} as const
