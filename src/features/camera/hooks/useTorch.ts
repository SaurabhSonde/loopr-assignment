import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useCameraStore } from '../cameraStore'

export const isTorchSupported = (track: MediaStreamTrack) =>
  Boolean(track.getCapabilities?.().torch)

const readTorch = (track: MediaStreamTrack) => track.getSettings().torch

const setTorch = (track: MediaStreamTrack, on: boolean) =>
  track.applyConstraints({ advanced: [{ torch: on }] })

/**
 * The track's settings are the source of truth: `advanced` constraints are
 * best-effort and resolve even when the camera ignores them, so after every
 * change we read back what the camera actually did.
 */
const actualTorch = (track: MediaStreamTrack, fallback: boolean) => {
  const value = readTorch(track)
  return typeof value === 'boolean' ? value : fallback
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Re-checks over ~2.5 s, for devices that report the torch late. */
const RECHECK_DELAYS_MS = [250, 500, 750, 1000]

/**
 * Chrome on Android only fills in the torch capability once the camera's
 * photo capabilities have been fetched, and some devices report it a moment
 * after the stream starts, so a single synchronous check isn't enough.
 */
export const detectTorch = async (
  track: MediaStreamTrack,
  isCancelled: () => boolean,
) => {
  if (isTorchSupported(track)) return true
  if ('ImageCapture' in window) {
    try {
      await new ImageCapture(track).getPhotoCapabilities()
    } catch {
      // Not fatal; keep polling below.
    }
    if (isTorchSupported(track)) return true
  }
  for (const delay of RECHECK_DELAYS_MS) {
    await wait(delay)
    if (isCancelled() || track.readyState === 'ended') return false
    if (isTorchSupported(track)) return true
  }
  return false
}

type TorchState = {
  trackId: string | null
  /** null while still detecting. */
  supported: boolean | null
  on: boolean
  pending: boolean
}

export const useTorch = (track: MediaStreamTrack | null) => {
  const setWantTorch = useCameraStore((s) => s.setWantTorch)
  const [state, setState] = useState<TorchState>({
    trackId: null,
    supported: null,
    on: false,
    pending: false,
  })

  // State belongs to one track; a new camera stream starts undetected and off.
  const current = state.trackId === track?.id ? state : null
  const supported = current?.supported ?? null
  const on = current?.on ?? false
  const pending = current?.pending ?? false

  useEffect(() => {
    if (!track) return
    let cancelled = false
    const isCancelled = () => cancelled

    const init = async () => {
      const hasTorch = await detectTorch(track, isCancelled)
      if (cancelled) return
      // Turn the torch back on after a retake or restart if the user had it on.
      if (hasTorch && useCameraStore.getState().wantTorch) {
        await setTorch(track, true).catch(() => {})
        if (cancelled) return
      }
      setState({
        trackId: track.id,
        supported: hasTorch,
        on: hasTorch ? actualTorch(track, false) : false,
        pending: false,
      })
    }
    void init()

    return () => {
      cancelled = true
    }
  }, [track])

  const toggle = async () => {
    if (!track || !supported || pending) return
    const next = !on
    setState({ trackId: track.id, supported, on, pending: true })
    try {
      await setTorch(track, next)
      const actual = actualTorch(track, next)
      setState({ trackId: track.id, supported, on: actual, pending: false })
      setWantTorch(actual)
      if (actual !== next) toast.warning("The camera didn't switch the torch.")
    } catch {
      setState({
        trackId: track.id,
        supported,
        on: actualTorch(track, on),
        pending: false,
      })
      toast.error("Couldn't switch the torch.")
    }
  }

  return { supported, on, pending, toggle }
}
