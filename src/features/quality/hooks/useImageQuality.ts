import { useEffect, useState } from 'react'
import type { CapturedImage } from '@/lib/image'
import { analyzeImage } from '../lib/analyzeImage'
import { assessQuality, type QualityReport } from '../lib/assess'

type Result = { blob: Blob; report: QualityReport; analysisFailed: boolean }

/**
 * Quality report for an image. Resolution and file size are known at once;
 * pixel checks (sharpness, exposure) arrive when analysis finishes.
 */
export const useImageQuality = (image: CapturedImage | null) => {
  const [result, setResult] = useState<Result | null>(null)

  useEffect(() => {
    if (!image) return
    let cancelled = false
    analyzeImage(image.blob)
      .then((metrics) => ({
        report: assessQuality(image, metrics),
        analysisFailed: false,
      }))
      .catch(() => ({
        report: assessQuality(image, null),
        analysisFailed: true,
      }))
      .then((next) => {
        if (!cancelled) setResult({ blob: image.blob, ...next })
      })
    return () => {
      cancelled = true
    }
  }, [image])

  const current = image && result?.blob === image.blob ? result : null
  return {
    /** Metadata-only until the pixel analysis completes. */
    report: current?.report ?? (image ? assessQuality(image, null) : null),
    analyzing: Boolean(image) && !current,
    analysisFailed: current?.analysisFailed ?? false,
  }
}
