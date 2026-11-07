import { useEffect, useState } from 'react'
import {
  createCameraSession,
  INITIAL_CAMERA_STATE,
  type CameraState,
} from '../lib/cameraSession'

/** Live camera state for a screen; the camera is released when the screen unmounts. */
export const useCamera = () => {
  const [state, setState] = useState<CameraState>(INITIAL_CAMERA_STATE)
  const [session] = useState(() => createCameraSession(setState))

  useEffect(() => {
    const onVisibilityChange = () =>
      session.handleVisibility(document.visibilityState)
    const onPageHide = () => session.stop()

    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('pagehide', onPageHide)
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('pagehide', onPageHide)
      session.stop()
    }
  }, [session])

  return {
    ...state,
    track: state.stream?.getVideoTracks()[0] ?? null,
    start: session.start,
    stop: session.stop,
    ensureStarted: session.ensureStarted,
    flip: session.flip,
    selectDevice: session.selectDevice,
  }
}
