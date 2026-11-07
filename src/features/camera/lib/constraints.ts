export type Facing = 'environment' | 'user'

export type CameraSelection = {
  /** A specific camera picked from the device menu; null = choose by facing. */
  deviceId: string | null
  facing: Facing
}

/**
 * Preview size when ImageCapture.takePhoto() will take the actual photo:
 * smooth and cool-running. 4:3 matches phone sensors, so the preview frames
 * exactly what the still photo will contain.
 */
export const PREVIEW_SIZE = { width: 1920, height: 1440 } as const

/**
 * Starting request when the video frame *is* the photo (canvas fallback);
 * raised further to the camera's reported maximum once the stream is open.
 */
export const HIGH_RES_SIZE = { width: 4096, height: 3072 } as const

/** Constraints to try in order: the preferred camera first, then looser fallbacks. */
export const buildVideoConstraints = (
  selection: CameraSelection,
  highRes: boolean,
): MediaTrackConstraints[] => {
  const size = highRes ? HIGH_RES_SIZE : PREVIEW_SIZE
  const resolution = {
    width: { ideal: size.width },
    height: { ideal: size.height },
  }
  const byFacing = { facingMode: { ideal: selection.facing }, ...resolution }

  return selection.deviceId
    ? [
        { deviceId: { exact: selection.deviceId }, ...resolution },
        // The saved device may be gone (unplugged webcam, different phone).
        byFacing,
      ]
    : [byFacing]
}

/**
 * Constraints that raise a live track to the camera's maximum resolution,
 * or null when the browser doesn't report it (Firefox) or it's already there.
 */
export const maxResolutionConstraints = (
  capabilities: MediaTrackCapabilities | undefined,
  settings: MediaTrackSettings,
): MediaTrackConstraints | null => {
  const maxWidth = capabilities?.width?.max
  const maxHeight = capabilities?.height?.max
  if (!maxWidth || !maxHeight) return null
  if ((settings.width ?? 0) >= maxWidth || (settings.height ?? 0) >= maxHeight)
    return null
  return { width: { ideal: maxWidth }, height: { ideal: maxHeight } }
}
