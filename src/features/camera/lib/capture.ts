import { decodeImageSize, type CapturedImage } from '@/lib/image'
import { maxResolutionConstraints } from './constraints'

/** Visually lossless; ~2–4 MB for a 4K frame. */
export const JPEG_QUALITY = 0.95

/** takePhoto() can hang on some Android camera drivers. */
const TAKE_PHOTO_TIMEOUT_MS = 8000

/** Treat anything within 2% of the reported maximum as "at max" (rounding, crop). */
const AT_MAX_TOLERANCE = 0.98

export type CaptureResult = {
  image: CapturedImage
  /** takePhoto() was attempted and failed; skip it for the rest of the session. */
  imageCaptureFailed: boolean
}

type CaptureOptions = {
  video: HTMLVideoElement
  track: MediaStreamTrack
  /** False when unsupported, or when it already failed this session. */
  useImageCapture: boolean
}

/**
 * Takes the best still the browser allows:
 * 1. ImageCapture.takePhoto() at the sensor's maximum, kept byte-for-byte.
 * 2. Otherwise a frame from the live stream (raised to its maximum first),
 *    encoded as JPEG.
 */
export const captureStill = async ({
  video,
  track,
  useImageCapture,
}: CaptureOptions): Promise<CaptureResult> => {
  let imageCaptureFailed = false

  if (useImageCapture) {
    try {
      const image = await takeFullResolutionPhoto(track)
      // Some devices return a downscaled photo; the video frame is better then.
      if (image.width * image.height >= video.videoWidth * video.videoHeight) {
        return { image, imageCaptureFailed: false }
      }
    } catch {
      // Fall through to the canvas.
    }
    imageCaptureFailed = true
    // The preview was kept small for takePhoto; the frame is the photo now.
    await raiseStreamToMax(track, video)
  }

  return { image: await grabVideoFrame(video, track), imageCaptureFailed }
}

const takeFullResolutionPhoto = async (
  track: MediaStreamTrack,
): Promise<CapturedImage> => {
  const imageCapture = new ImageCapture(track)
  const capabilities = await imageCapture.getPhotoCapabilities()
  const maxWidth = capabilities.imageWidth?.max
  const maxHeight = capabilities.imageHeight?.max
  const settings: PhotoSettings | undefined =
    maxWidth && maxHeight
      ? { imageWidth: maxWidth, imageHeight: maxHeight }
      : undefined

  const blob = await withTimeout(
    imageCapture.takePhoto(settings),
    TAKE_PHOTO_TIMEOUT_MS,
  )
  const { width, height } = await decodeImageSize(blob)

  return {
    blob,
    width,
    height,
    size: blob.size,
    mimeType: blob.type || 'image/jpeg',
    captureMethod: 'image-capture',
    atDeviceMax:
      maxWidth && maxHeight
        ? width * height >= maxWidth * maxHeight * AT_MAX_TOLERANCE
        : null,
    capturedAt: Date.now(),
  }
}

const grabVideoFrame = async (
  video: HTMLVideoElement,
  track: MediaStreamTrack,
): Promise<CapturedImage> => {
  const width = video.videoWidth
  const height = video.videoHeight
  if (!width || !height) throw new Error('The camera has no frame yet')

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas 2D is unavailable')
  // Drawn unmirrored, even when the preview is mirrored for the front camera.
  context.drawImage(video, 0, 0, width, height)

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
  )
  if (!blob) throw new Error('Could not encode the photo')

  return {
    blob,
    width,
    height,
    size: blob.size,
    mimeType: 'image/jpeg',
    captureMethod: 'video-frame',
    atDeviceMax: frameIsAtMax(track.getCapabilities?.(), width, height),
    capturedAt: Date.now(),
  }
}

/** Whether a frame size is the camera's maximum; null when unknown. */
export const frameIsAtMax = (
  capabilities: MediaTrackCapabilities | undefined,
  width: number,
  height: number,
): boolean | null => {
  const maxWidth = capabilities?.width?.max
  const maxHeight = capabilities?.height?.max
  if (!maxWidth || !maxHeight) return null
  // Width and height maxima can belong to different aspect ratios, so
  // reaching either one means the camera can't do better.
  return (
    Math.max(width, height) >=
      Math.max(maxWidth, maxHeight) * AT_MAX_TOLERANCE ||
    Math.min(width, height) >= Math.min(maxWidth, maxHeight) * AT_MAX_TOLERANCE
  )
}

/** Best-effort: raise the stream to its maximum and wait for the bigger frames. */
export const raiseStreamToMax = async (
  track: MediaStreamTrack,
  video?: HTMLVideoElement,
) => {
  const constraints = maxResolutionConstraints(
    track.getCapabilities?.(),
    track.getSettings(),
  )
  if (!constraints) return
  try {
    await track.applyConstraints(constraints)
  } catch {
    return
  }
  if (video) await waitForResize(video)
}

const waitForResize = (video: HTMLVideoElement) =>
  new Promise<void>((resolve) => {
    const done = () => {
      clearTimeout(timer)
      video.removeEventListener('resize', done)
      resolve()
    }
    const timer = setTimeout(done, 1500)
    video.addEventListener('resize', done)
  })

const withTimeout = <T>(promise: Promise<T>, ms: number) =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timed out after ${ms} ms`)),
      ms,
    )
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error: unknown) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })

/** Wraps a picked file in the same shape as a camera capture. */
export const imageFromFile = async (file: File): Promise<CapturedImage> => {
  if (!file.type.startsWith('image/')) {
    throw new Error('That file is not an image.')
  }
  let size: { width: number; height: number }
  try {
    size = await decodeImageSize(file)
  } catch {
    throw new Error("This image format can't be opened in this browser.")
  }
  return {
    blob: file,
    ...size,
    size: file.size,
    mimeType: file.type,
    captureMethod: 'upload',
    atDeviceMax: null,
    capturedAt: Date.now(),
  }
}
