import {
  formatBytes,
  formatDimensions,
  formatMegapixels,
  megapixels,
} from '@/lib/format'
import type { CapturedImage } from '@/lib/image'
import type { ImageMetrics } from './metrics'
import { THRESHOLDS } from './thresholds'

export type Severity = 'good' | 'fair' | 'poor'

export type QualityCheckId =
  | 'resolution'
  | 'sharpness'
  | 'brightness'
  | 'clipping'
  | 'contrast'
  | 'fileSize'

export type QualityCheck = {
  id: QualityCheckId
  label: string
  value: string
  severity: Severity
  summary: string
  /** What to do about it; null when there's nothing to fix. */
  tip: string | null
}

export type QualityReport = {
  overall: Severity
  checks: QualityCheck[]
  /** null when the pixels couldn't be analyzed (only metadata was checked). */
  metrics: ImageMetrics | null
}

type ImageInfo = Pick<
  CapturedImage,
  'width' | 'height' | 'size' | 'atDeviceMax' | 'captureMethod'
>

const RANK: Record<Severity, number> = { good: 0, fair: 1, poor: 2 }

export const worstSeverity = (severities: Severity[]): Severity =>
  severities.reduce<Severity>(
    (worst, next) => (RANK[next] > RANK[worst] ? next : worst),
    'good',
  )

/** ≥ good → good, ≥ fair → fair, otherwise poor. */
const rateAtLeast = (
  value: number,
  { good, fair }: { good: number; fair: number },
): Severity => (value >= good ? 'good' : value >= fair ? 'fair' : 'poor')

const percent = (ratio: number) => `${Math.round(ratio * 100)}%`

const ADD_LIGHT =
  'Add light: use the torch if available, or move somewhere brighter.'
const REDUCE_LIGHT = 'Avoid direct light and glare, or turn off the torch.'
const HOLD_STEADY =
  'Hold the camera steady, let it focus, and make sure there is enough light.'

const checkResolution = (image: ImageInfo): QualityCheck => {
  const severity = rateAtLeast(
    megapixels(image.width, image.height),
    THRESHOLDS.resolution,
  )
  const base = {
    id: 'resolution' as const,
    label: 'Resolution',
    value: `${formatMegapixels(image.width, image.height)} · ${formatDimensions(image.width, image.height)}`,
    severity,
  }
  if (severity === 'good')
    return { ...base, summary: 'High resolution', tip: null }

  // Don't ask for a retake that can't produce a bigger image.
  const tip =
    image.captureMethod === 'upload'
      ? 'Use the original, full-size image if you have it.'
      : image.atDeviceMax === true
        ? "This is the highest resolution the browser can get from this camera. A phone's rear camera gives more detail."
        : image.atDeviceMax === false
          ? 'The camera can capture more detail than this. Retake the photo.'
          : "A phone's rear camera usually gives more detail."
  return {
    ...base,
    summary: severity === 'fair' ? 'Medium resolution' : 'Low resolution',
    tip,
  }
}

const checkFileSize = (size: number): QualityCheck => {
  const { poorBelow, fairBelow, fairAbove } = THRESHOLDS.fileSize
  const base = {
    id: 'fileSize' as const,
    label: 'File size',
    value: formatBytes(size),
  }
  if (size < poorBelow) {
    return {
      ...base,
      severity: 'poor',
      summary: 'Very small file',
      tip: 'The photo may be blank, very dark or heavily compressed.',
    }
  }
  if (size < fairBelow) {
    return {
      ...base,
      severity: 'fair',
      summary: 'Small file',
      tip: 'Small files usually hold little detail. Check the photo is sharp and well lit.',
    }
  }
  if (size > fairAbove) {
    return {
      ...base,
      severity: 'fair',
      summary: 'Large file',
      tip: 'Large files are slower to save and share.',
    }
  }
  return { ...base, severity: 'good', summary: 'Typical size', tip: null }
}

const checkSharpness = (sharpness: number): QualityCheck => {
  const severity = rateAtLeast(sharpness, THRESHOLDS.sharpness)
  return {
    id: 'sharpness',
    label: 'Sharpness',
    value: `${Math.round(sharpness)} / 100`,
    severity,
    summary: { good: 'Sharp', fair: 'Slightly soft', poor: 'Blurry' }[severity],
    tip: severity === 'good' ? null : HOLD_STEADY,
  }
}

const checkBrightness = (brightness: number): QualityCheck => {
  const { goodMin, goodMax, fairMin, fairMax } = THRESHOLDS.brightness
  const base = {
    id: 'brightness' as const,
    label: 'Brightness',
    value: `${Math.round(brightness)} / 255`,
  }
  if (brightness < fairMin)
    return { ...base, severity: 'poor', summary: 'Too dark', tip: ADD_LIGHT }
  if (brightness < goodMin)
    return {
      ...base,
      severity: 'fair',
      summary: 'A little dark',
      tip: ADD_LIGHT,
    }
  if (brightness > fairMax)
    return {
      ...base,
      severity: 'poor',
      summary: 'Overexposed',
      tip: REDUCE_LIGHT,
    }
  if (brightness > goodMax)
    return {
      ...base,
      severity: 'fair',
      summary: 'A little bright',
      tip: REDUCE_LIGHT,
    }
  return { ...base, severity: 'good', summary: 'Well exposed', tip: null }
}

const checkClipping = (shadows: number, highlights: number): QualityCheck => {
  const worst = Math.max(shadows, highlights)
  const { good, fair } = THRESHOLDS.clipping
  const severity: Severity =
    worst <= good ? 'good' : worst <= fair ? 'fair' : 'poor'
  const brightSide = highlights >= shadows
  return {
    id: 'clipping',
    label: 'Exposure range',
    value: `${percent(highlights)} white · ${percent(shadows)} black`,
    severity,
    summary:
      severity === 'good'
        ? 'Detail kept in highlights and shadows'
        : brightSide
          ? 'Blown-out highlights'
          : 'Crushed shadows',
    tip:
      severity === 'good'
        ? null
        : brightSide
          ? 'Bright areas have lost detail. Avoid glare and reflections.'
          : 'Dark areas have lost detail. Add light.',
  }
}

const checkContrast = (contrast: number): QualityCheck => {
  const severity = rateAtLeast(contrast, THRESHOLDS.contrast)
  return {
    id: 'contrast',
    label: 'Contrast',
    value: `${Math.round(contrast)}`,
    severity,
    summary: { good: 'Good contrast', fair: 'Low contrast', poor: 'Very flat' }[
      severity
    ],
    tip:
      severity === 'good'
        ? null
        : 'The subject blends into the background. Add light or change the angle.',
  }
}

/**
 * Rates a photo from its metadata and (when available) its pixel metrics.
 * The overall rating is the worst individual check, so any problem is visible.
 */
export const assessQuality = (
  image: ImageInfo,
  metrics: ImageMetrics | null,
): QualityReport => {
  const checks: QualityCheck[] = [
    checkResolution(image),
    ...(metrics
      ? [
          checkSharpness(metrics.sharpness),
          checkBrightness(metrics.brightness),
          checkClipping(metrics.clippedShadows, metrics.clippedHighlights),
          checkContrast(metrics.contrast),
        ]
      : []),
    checkFileSize(image.size),
  ]
  return {
    overall: worstSeverity(checks.map((check) => check.severity)),
    checks,
    metrics,
  }
}
