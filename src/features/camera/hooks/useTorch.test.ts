import { afterEach, describe, expect, it, vi } from 'vitest'
import { detectTorch } from './useTorch'

/** A track whose torch capability shows up only once `reveal()` is called. */
const lateTorchTrack = () => {
  let capabilities: MediaTrackCapabilities = {}
  const track = {
    readyState: 'live',
    getCapabilities: () => capabilities,
  } as unknown as MediaStreamTrack
  return { track, reveal: () => (capabilities = { torch: true }) }
}

const notCancelled = () => false

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('detectTorch', () => {
  it('detects a torch reported immediately', async () => {
    const { track, reveal } = lateTorchTrack()
    reveal()
    await expect(detectTorch(track, notCancelled)).resolves.toBe(true)
  })

  it('detects a torch that appears once photo capabilities are fetched (Chrome Android)', async () => {
    const { track, reveal } = lateTorchTrack()
    vi.stubGlobal(
      'ImageCapture',
      class {
        getPhotoCapabilities = async () => {
          reveal()
          return {}
        }
      },
    )
    await expect(detectTorch(track, notCancelled)).resolves.toBe(true)
  })

  it('detects a torch reported a moment after the stream starts', async () => {
    vi.useFakeTimers()
    const { track, reveal } = lateTorchTrack()
    setTimeout(reveal, 600)

    const result = detectTorch(track, notCancelled)
    await vi.advanceTimersByTimeAsync(1000)
    await expect(result).resolves.toBe(true)
  })

  it('gives up when the camera never reports a torch', async () => {
    vi.useFakeTimers()
    const { track } = lateTorchTrack()

    const result = detectTorch(track, notCancelled)
    await vi.advanceTimersByTimeAsync(5000)
    await expect(result).resolves.toBe(false)
  })

  it('stops checking once cancelled', async () => {
    vi.useFakeTimers()
    const { track, reveal } = lateTorchTrack()
    let cancelled = false
    setTimeout(() => {
      cancelled = true
      reveal()
    }, 300)

    const result = detectTorch(track, () => cancelled)
    await vi.advanceTimersByTimeAsync(5000)
    await expect(result).resolves.toBe(false)
  })
})
