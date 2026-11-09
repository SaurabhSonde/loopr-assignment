import { fitWithin } from './image'

const THUMBNAIL_SIZE = 320
const THUMBNAIL_QUALITY = 0.8

/**
 * A small JPEG for the gallery grid, so it never decodes 12 MP originals.
 * Null if the browser can't produce one (the gallery then shows a placeholder).
 */
export const createThumbnail = async (blob: Blob): Promise<Blob | null> => {
  try {
    const bitmap = await createImageBitmap(blob)
    const { width, height } = fitWithin(
      bitmap.width,
      bitmap.height,
      THUMBNAIL_SIZE,
    )
    const canvas = Object.assign(document.createElement('canvas'), {
      width,
      height,
    })
    const context = canvas.getContext('2d')
    if (!context) return null
    context.imageSmoothingQuality = 'high'
    context.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()
    return await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', THUMBNAIL_QUALITY),
    )
  } catch {
    return null
  }
}
