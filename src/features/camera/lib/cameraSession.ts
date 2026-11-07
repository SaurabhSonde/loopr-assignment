import { useCameraStore } from '../cameraStore'
import { cameraError, toCameraError, type CameraError } from './cameraErrors'
import {
  buildVideoConstraints,
  type CameraSelection,
  type Facing,
} from './constraints'
import { raiseStreamToMax } from './capture'
import {
  cameraSetKey,
  isBackCameraLabel,
  pickMainCamera,
  probeCamera,
  type CameraProfile,
} from './mainCamera'
import { getCameraSupport } from './support'

export type CameraStatus = 'idle' | 'starting' | 'live' | 'error'

export type CameraState = {
  status: CameraStatus
  stream: MediaStream | null
  error: CameraError | null
  /** Available cameras; labels are only filled in once permission is granted. */
  devices: MediaDeviceInfo[]
  /** Facing of the live camera; null when the browser doesn't say (most webcams). */
  facing: Facing | null
  deviceId: string | null
}

export const INITIAL_CAMERA_STATE: CameraState = {
  status: 'idle',
  stream: null,
  error: null,
  devices: [],
  facing: null,
  deviceId: null,
}

/** Errors where trying a looser constraint (another camera) can help. */
const isDeviceError = (error: unknown) =>
  error instanceof DOMException &&
  (error.name === 'OverconstrainedError' || error.name === 'NotFoundError')

const openStream = async (selection: CameraSelection, highRes: boolean) => {
  let lastError: unknown
  for (const video of buildVideoConstraints(selection, highRes)) {
    try {
      return await navigator.mediaDevices.getUserMedia({ audio: false, video })
    } catch (error) {
      if (!isDeviceError(error)) throw error
      lastError = error
    }
  }
  throw lastError
}

const listCameras = async () =>
  (await navigator.mediaDevices.enumerateDevices()).filter(
    (device) => device.kind === 'videoinput',
  )

const stopTracks = (stream: MediaStream | null) =>
  stream?.getTracks().forEach((track) => track.stop())

const backCameras = (devices: MediaDeviceInfo[]) =>
  devices.filter((device) => isBackCameraLabel(device.label))

/** Several back lenses we haven't worked out the main one for yet. */
const needsMainCameraProbe = (devices: MediaDeviceInfo[]) => {
  const back = backCameras(devices)
  return (
    back.length > 1 &&
    useCameraStore.getState().mainBackCamera?.key !== cameraSetKey(back)
  )
}

/**
 * The main back lens, probing each back camera once (one at a time: phones
 * can't open two cameras at once). Null before permission is granted (no
 * labels yet) or with a single back camera, where facingMode is enough.
 */
const findMainBackCamera = async (): Promise<string | null> => {
  const back = backCameras(await listCameras())
  if (back.length < 2) return null
  const key = cameraSetKey(back)
  const prefs = useCameraStore.getState()
  if (prefs.mainBackCamera?.key === key) return prefs.mainBackCamera.deviceId

  const profiles: CameraProfile[] = []
  for (const device of back) {
    const profile = await probeCamera(device.deviceId)
    if (profile) profiles.push(profile)
  }
  const main = pickMainCamera(profiles)
  prefs.setMainBackCamera({
    key,
    deviceId: main?.deviceId ?? null,
    summaries: Object.fromEntries(
      profiles.map(({ deviceId, maxPixels, torch }) => [
        deviceId,
        { maxPixels, torch },
      ]),
    ),
  })
  return main?.deviceId ?? null
}

/**
 * Owns the camera stream outside React: opening, switching and releasing it,
 * and discarding results of starts that were superseded by a newer call.
 * Every change is reported through `onChange`.
 */
export const createCameraSession = (onChange: (state: CameraState) => void) => {
  let state = INITIAL_CAMERA_STATE
  let stream: MediaStream | null = null
  /** Incremented on every start/stop; a start only applies if it's still current. */
  let generation = 0
  let resumeWhenVisible = false

  const update = (patch: Partial<CameraState>) => {
    state = { ...state, ...patch }
    onChange(state)
  }

  const release = () => {
    generation++
    stopTracks(stream)
    stream = null
  }

  const start = async (overrides: Partial<CameraSelection> = {}) => {
    release()
    const current = generation

    const support = getCameraSupport()
    if (!support.secureContext || !support.getUserMedia) {
      update({
        status: 'error',
        stream: null,
        error: cameraError(support.secureContext ? 'unsupported' : 'insecure'),
      })
      return
    }

    const prefs = useCameraStore.getState()
    const selection = { ...prefs.selection, ...overrides }
    // Without a working takePhoto(), the video frame is the photo.
    const highRes = !support.imageCapture || prefs.imageCaptureBroken
    // No camera picked by hand: open the main back lens, not just any back lens.
    const automaticBack =
      selection.deviceId === null && selection.facing === 'environment'
    update({ status: 'starting', stream: null, error: null })

    try {
      const mainBackId = automaticBack ? await findMainBackCamera() : null
      if (current !== generation) return

      const opened = await openStream(
        mainBackId ? { ...selection, deviceId: mainBackId } : selection,
        highRes,
      )
      if (current !== generation) {
        stopTracks(opened)
        return
      }
      stream = opened
      const [track] = opened.getVideoTracks()
      if (highRes) await raiseStreamToMax(track)
      const devices = await listCameras()
      if (current !== generation) return

      // First visit: the back lenses only become identifiable once permission
      // is granted, so start over to probe them and reopen the main one.
      if (automaticBack && !mainBackId && needsMainCameraProbe(devices)) {
        return start(overrides)
      }

      const settings = track.getSettings()
      const facing =
        settings.facingMode === 'user' || settings.facingMode === 'environment'
          ? settings.facingMode
          : null

      track.addEventListener('ended', () => {
        if (stream !== opened) return
        release()
        update({
          status: 'error',
          stream: null,
          error: cameraError('disconnected'),
        })
      })

      prefs.setSelection({
        // Only a hand-picked camera is saved; forget it if it's gone.
        deviceId:
          selection.deviceId && settings.deviceId === selection.deviceId
            ? selection.deviceId
            : null,
        facing: facing ?? selection.facing,
      })
      prefs.markCameraUsed()
      update({
        status: 'live',
        stream: opened,
        error: null,
        devices,
        facing,
        deviceId: settings.deviceId ?? null,
      })
    } catch (error) {
      if (current !== generation) return
      release()
      update({ status: 'error', stream: null, error: toCameraError(error) })
    }
  }

  const stop = () => {
    release()
    update({ status: 'idle', stream: null })
  }

  /** Starts the camera unless it's already running or starting. */
  const ensureStarted = () => {
    if (state.status === 'idle' || state.status === 'error') void start()
  }

  const flip = () => {
    const facing = state.facing ?? useCameraStore.getState().selection.facing
    return start({
      deviceId: null,
      facing: facing === 'user' ? 'environment' : 'user',
    })
  }

  /** A specific camera, or null for the automatic main back camera. */
  const selectDevice = (deviceId: string | null) =>
    start(deviceId ? { deviceId } : { deviceId: null, facing: 'environment' })

  /** Releases the camera while the page is hidden and resumes it afterwards. */
  const handleVisibility = (visibility: DocumentVisibilityState) => {
    if (visibility === 'hidden' && stream) {
      resumeWhenVisible = true
      stop()
    } else if (visibility === 'visible' && resumeWhenVisible) {
      resumeWhenVisible = false
      void start()
    }
  }

  return { start, stop, ensureStarted, flip, selectDevice, handleVisibility }
}

export type CameraSession = ReturnType<typeof createCameraSession>
