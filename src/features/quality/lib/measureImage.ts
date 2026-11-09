import { computeMetrics, toLuma, type ImageMetrics } from './metrics'
import { fitWithin } from '@/lib/image'
import { ANALYSIS_SIZE } from './thresholds'

const context2d = (width: number, height: number) => {
  const canvas =
    typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(width, height)
      : Object.assign(document.createElement('canvas'), { width, height })
  const context = canvas.getContext('2d', { willReadFrequently: true }) as
    OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null
  if (!context) throw new Error('2D canvas unavailable')
  return context
}

/**
 * Decodes an image and measures it on a copy shrunk to ANALYSIS_SIZE, so
 * 12 MP is never scanned pixel by pixel and scores don't depend on resolution.
 *
 * The high-quality downscale averages pixels instead of sampling them, which
 * cancels sensor grain. On a Samsung S24, grain at finer scales made shaken
 * photos score as sharp; at this size real blur stays visible (calibration
 * notes in thresholds.ts). Works both in a worker and on the main thread.
 */
export const measureImage = async (blob: Blob): Promise<ImageMetrics> => {
  const bitmap = await createImageBitmap(blob)
  try {
    const { width, height } = fitWithin(
      bitmap.width,
      bitmap.height,
      ANALYSIS_SIZE,
    )
    const context = context2d(width, height)
    context.imageSmoothingQuality = 'high'
    context.drawImage(bitmap, 0, 0, width, height)
    const { data } = context.getImageData(0, 0, width, height)
    return computeMetrics(toLuma(data, width, height))
  } finally {
    bitmap.close()
  }
}
