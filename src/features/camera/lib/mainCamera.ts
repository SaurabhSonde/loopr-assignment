/**
 * Phones with several back lenses don't always open the main one for
 * `facingMode: 'environment'` (Chrome on many Android phones picks a
 * secondary lens without a flash). We probe the back cameras once, pick the
 * main one, and remember it.
 */

export type CameraProfile = {
  deviceId: string
  label: string
  /** Largest still the camera can produce (photo or stream), in pixels. */
  maxPixels: number
  torch: boolean
}

/** Labels are only available once camera permission has been granted. */
export const isBackCameraLabel = (label: string) =>
  /\b(back|rear|environment)\b/i.test(label)

/** iOS names its secondary lenses; Android labels don't say. */
const SPECIALIZED_LENS = /ultra|tele|macro|depth/i

/** "camera2 0, facing back" → 0. Android numbers the main lens first. */
const androidIndex = (label: string) =>
  Number(/camera2? (\d+)/i.exec(label)?.[1] ?? Number.POSITIVE_INFINITY)

/** Prefers a flash, then resolution, then a general-purpose lens, then Android's order. */
export const pickMainCamera = (
  profiles: CameraProfile[],
): CameraProfile | null =>
  profiles.toSorted(
    (a, b) =>
      Number(b.torch) - Number(a.torch) ||
      b.maxPixels - a.maxPixels ||
      Number(SPECIALIZED_LENS.test(a.label)) -
        Number(SPECIALIZED_LENS.test(b.label)) ||
      androidIndex(a.label) - androidIndex(b.label),
  )[0] ?? null

/** Identifies a set of cameras, so a new phone or webcam triggers a fresh probe. */
export const cameraSetKey = (devices: Pick<MediaDeviceInfo, 'deviceId'>[]) =>
  devices
    .map((device) => device.deviceId)
    .toSorted()
    .join('|')

/** Opens one camera briefly to read what it can do. */
export const probeCamera = async (
  deviceId: string,
): Promise<CameraProfile | null> => {
  let stream: MediaStream
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { deviceId: { exact: deviceId } },
    })
  } catch {
    return null
  }

  try {
    const [track] = stream.getVideoTracks()
    let photoPixels = 0
    let flash = false
    if ('ImageCapture' in window) {
      try {
        // Also makes Chrome fill in the track's torch capability.
        const photo = await new ImageCapture(track).getPhotoCapabilities()
        photoPixels =
          (photo.imageWidth?.max ?? 0) * (photo.imageHeight?.max ?? 0)
        flash = photo.fillLightMode?.includes('flash') ?? false
      } catch {
        // Fall back to the stream capabilities below.
      }
    }
    const capabilities = track.getCapabilities?.() ?? {}
    const streamPixels =
      (capabilities.width?.max ?? 0) * (capabilities.height?.max ?? 0)

    return {
      deviceId,
      label: track.label,
      maxPixels: Math.max(photoPixels, streamPixels),
      torch: Boolean(capabilities.torch) || flash,
    }
  } finally {
    stream.getTracks().forEach((track) => track.stop())
  }
}

export type CameraSummary = { maxPixels: number; torch: boolean }

/** A readable menu label, e.g. "Back camera 0 · main · 12 MP · torch". */
export const describeCamera = (
  device: Pick<MediaDeviceInfo, 'label'>,
  index: number,
  summary?: CameraSummary,
  isMain = false,
) => {
  const android = /camera2? (\d+), facing (back|front)/i.exec(device.label)
  const name = android
    ? `${android[2] === 'back' ? 'Back' : 'Front'} camera ${android[1]}`
    : device.label || `Camera ${index + 1}`
  const details = [
    isMain && 'main',
    summary?.maxPixels && `${Math.round(summary.maxPixels / 1_000_000)} MP`,
    summary?.torch && 'torch',
  ].filter(Boolean)
  return details.length > 0 ? `${name} · ${details.join(' · ')}` : name
}
