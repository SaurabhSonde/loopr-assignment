import type { QualityWorkerResponse } from '../quality.worker'
import { measureImage } from './measureImage'
import type { ImageMetrics } from './metrics'

const canUseWorker = () =>
  typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined'

/**
 * Measures an image off the main thread when the browser allows it, so
 * decoding a large photo never blocks the UI; falls back to the main thread.
 */
export const analyzeImage = (blob: Blob): Promise<ImageMetrics> => {
  if (!canUseWorker()) return measureImage(blob)

  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL('../quality.worker.ts', import.meta.url),
      {
        type: 'module',
      },
    )
    const fallback = () => {
      worker.terminate()
      measureImage(blob).then(resolve, reject)
    }
    worker.addEventListener(
      'message',
      (event: MessageEvent<QualityWorkerResponse>) => {
        if (!event.data.ok) return fallback()
        worker.terminate()
        resolve(event.data.metrics)
      },
    )
    worker.addEventListener('error', fallback)
    worker.postMessage(blob)
  })
}
