import { describe, expect, it } from 'vitest'
import { assessQuality, worstSeverity, type QualityCheckId } from './assess'
import type { ImageMetrics } from './metrics'

const GOOD_METRICS: ImageMetrics = {
  brightness: 128,
  contrast: 55,
  clippedShadows: 0.01,
  clippedHighlights: 0.01,
  sharpness: 75,
}

const phonePhoto = {
  width: 4080,
  height: 3060,
  size: 3_200_000,
  atDeviceMax: true,
  captureMethod: 'image-capture' as const,
}

const checkOf = (
  report: ReturnType<typeof assessQuality>,
  id: QualityCheckId,
) => report.checks.find((check) => check.id === id)!

describe('worstSeverity', () => {
  it('picks the most severe rating', () => {
    expect(worstSeverity([])).toBe('good')
    expect(worstSeverity(['good', 'fair', 'good'])).toBe('fair')
    expect(worstSeverity(['fair', 'poor', 'good'])).toBe('poor')
  })
})

describe('assessQuality', () => {
  it('rates a sharp, well-exposed 12 MP phone photo as good', () => {
    const report = assessQuality(phonePhoto, GOOD_METRICS)
    expect(report.overall).toBe('good')
    expect(report.checks.every((check) => check.tip === null)).toBe(true)
  })

  it('takes the worst check as the overall rating', () => {
    const report = assessQuality(phonePhoto, { ...GOOD_METRICS, sharpness: 20 })
    expect(report.overall).toBe('poor')
    expect(checkOf(report, 'sharpness')).toMatchObject({
      severity: 'poor',
      summary: 'Blurry',
    })
  })

  it.each([
    [30, 'poor', 'Too dark'],
    [60, 'fair', 'A little dark'],
    [128, 'good', 'Well exposed'],
    [200, 'fair', 'A little bright'],
    [230, 'poor', 'Overexposed'],
  ])('rates brightness %d as %s (%s)', (brightness, severity, summary) => {
    const report = assessQuality(phonePhoto, { ...GOOD_METRICS, brightness })
    expect(checkOf(report, 'brightness')).toMatchObject({ severity, summary })
  })

  it('names the clipped side', () => {
    const blown = assessQuality(phonePhoto, {
      ...GOOD_METRICS,
      clippedHighlights: 0.3,
    })
    expect(checkOf(blown, 'clipping')).toMatchObject({
      severity: 'poor',
      summary: 'Blown-out highlights',
    })
    const crushed = assessQuality(phonePhoto, {
      ...GOOD_METRICS,
      clippedShadows: 0.1,
    })
    expect(checkOf(crushed, 'clipping')).toMatchObject({
      severity: 'fair',
      summary: 'Crushed shadows',
    })
  })

  describe('resolution advice', () => {
    const webcam = { ...phonePhoto, width: 1280, height: 720, size: 400_000 }

    it("doesn't ask for a retake when the camera can't do better", () => {
      const check = checkOf(assessQuality(webcam, GOOD_METRICS), 'resolution')
      expect(check.severity).toBe('poor')
      expect(check.tip).toMatch(/highest resolution the browser can get/)
    })

    it('asks for a retake when the camera can do better', () => {
      const check = checkOf(
        assessQuality({ ...webcam, atDeviceMax: false }, GOOD_METRICS),
        'resolution',
      )
      expect(check.tip).toMatch(/Retake/)
    })

    it('suggests the original for uploads', () => {
      const check = checkOf(
        assessQuality(
          { ...webcam, captureMethod: 'upload', atDeviceMax: null },
          GOOD_METRICS,
        ),
        'resolution',
      )
      expect(check.tip).toMatch(/original/)
    })

    it('rates 2–8 MP as fair', () => {
      const check = checkOf(
        assessQuality(
          { ...phonePhoto, width: 1920, height: 1080 },
          GOOD_METRICS,
        ),
        'resolution',
      )
      expect(check.severity).toBe('fair')
    })
  })

  it.each([
    [50_000, 'poor'],
    [300_000, 'fair'],
    [3_000_000, 'good'],
    [20 * 1024 * 1024, 'fair'],
  ])('rates a %d-byte file as %s', (size, severity) => {
    const check = checkOf(
      assessQuality({ ...phonePhoto, size }, GOOD_METRICS),
      'fileSize',
    )
    expect(check.severity).toBe(severity)
  })

  it('still rates metadata when the pixels could not be analyzed', () => {
    const report = assessQuality(phonePhoto, null)
    expect(report.checks.map((check) => check.id)).toEqual([
      'resolution',
      'fileSize',
    ])
    expect(report.overall).toBe('good')
    expect(report.metrics).toBeNull()
  })
})
