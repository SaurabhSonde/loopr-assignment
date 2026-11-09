export type CaptureMethod = 'image-capture' | 'video-frame' | 'upload'

export const CAPTURE_METHOD_LABELS: Record<CaptureMethod, string> = {
  'image-capture': 'Full-resolution photo',
  'video-frame': 'Video frame',
  upload: 'Uploaded image',
}

/** A captured (or uploaded) photo, before it is saved to the gallery. */
export type CapturedImage = {
  blob: Blob
  /** Displayed size, after EXIF orientation is applied. */
  width: number
  height: number
  size: number
  mimeType: string
  captureMethod: CaptureMethod
  /**
   * Whether this is the largest image the camera can produce.
   * `null` when the browser doesn't expose the camera's limits (and for uploads).
   */
  atDeviceMax: boolean | null
  capturedAt: number
}

/** Decodes an image just enough to read its oriented dimensions. */
export const decodeImageSize = async (
  blob: Blob,
): Promise<{ width: number; height: number }> => {
  const bitmap = await createImageBitmap(blob)
  const size = { width: bitmap.width, height: bitmap.height }
  bitmap.close()
  return size
}
