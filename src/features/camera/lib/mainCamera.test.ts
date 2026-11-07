import { describe, expect, it } from 'vitest'
import {
  cameraSetKey,
  describeCamera,
  isBackCameraLabel,
  pickMainCamera,
  type CameraProfile,
} from './mainCamera'

const profile = (overrides: Partial<CameraProfile>): CameraProfile => ({
  deviceId: 'id',
  label: '',
  maxPixels: 12_000_000,
  torch: false,
  ...overrides,
})

describe('isBackCameraLabel', () => {
  it.each([
    ['camera2 0, facing back', true],
    ['Back Ultra Wide Camera', true],
    ['camera2 1, facing front', false],
    ['FaceTime HD Camera', false],
    ['', false],
  ])('%s → %s', (label, expected) => {
    expect(isBackCameraLabel(label)).toBe(expected)
  })
})

describe('pickMainCamera', () => {
  it('prefers the lens with a flash over a sharper one without', () => {
    const main = pickMainCamera([
      profile({
        deviceId: 'wide',
        label: 'camera2 2, facing back',
        maxPixels: 16e6,
      }),
      profile({
        deviceId: 'main',
        label: 'camera2 0, facing back',
        torch: true,
      }),
    ])
    expect(main?.deviceId).toBe('main')
  })

  it('then prefers the higher resolution', () => {
    const main = pickMainCamera([
      profile({ deviceId: 'low', torch: true, maxPixels: 8e6 }),
      profile({ deviceId: 'high', torch: true, maxPixels: 12e6 }),
    ])
    expect(main?.deviceId).toBe('high')
  })

  it('avoids specialised iOS lenses on a tie', () => {
    const main = pickMainCamera([
      profile({
        deviceId: 'ultra',
        label: 'Back Ultra Wide Camera',
        torch: true,
      }),
      profile({
        deviceId: 'tele',
        label: 'Back Telephoto Camera',
        torch: true,
      }),
      profile({ deviceId: 'main', label: 'Back Camera', torch: true }),
    ])
    expect(main?.deviceId).toBe('main')
  })

  it("falls back to Android's numbering, where the main lens comes first", () => {
    const main = pickMainCamera([
      profile({ deviceId: 'b', label: 'camera2 2, facing back', torch: true }),
      profile({ deviceId: 'a', label: 'camera2 0, facing back', torch: true }),
    ])
    expect(main?.deviceId).toBe('a')
  })

  it('returns null when nothing could be probed', () => {
    expect(pickMainCamera([])).toBeNull()
  })
})

describe('cameraSetKey', () => {
  it('is independent of enumeration order', () => {
    expect(cameraSetKey([{ deviceId: 'b' }, { deviceId: 'a' }])).toBe(
      cameraSetKey([{ deviceId: 'a' }, { deviceId: 'b' }]),
    )
  })
})

describe('describeCamera', () => {
  it('turns Android labels into readable names with details', () => {
    expect(
      describeCamera(
        { label: 'camera2 0, facing back' },
        0,
        { maxPixels: 12_192_768, torch: true },
        true,
      ),
    ).toBe('Back camera 0 · main · 12 MP · torch')
  })

  it('keeps other labels and numbers unlabeled cameras', () => {
    expect(describeCamera({ label: 'Back Camera' }, 0)).toBe('Back Camera')
    expect(describeCamera({ label: '' }, 2)).toBe('Camera 3')
  })
})
