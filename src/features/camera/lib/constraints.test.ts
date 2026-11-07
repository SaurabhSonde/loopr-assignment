import { describe, expect, it } from 'vitest'
import {
  buildVideoConstraints,
  HIGH_RES_SIZE,
  maxResolutionConstraints,
  PREVIEW_SIZE,
} from './constraints'

describe('buildVideoConstraints', () => {
  it('asks for a 4:3 preview when takePhoto will capture the still', () => {
    const [first] = buildVideoConstraints(
      { deviceId: null, facing: 'environment' },
      false,
    )
    expect(first).toEqual({
      facingMode: { ideal: 'environment' },
      width: { ideal: PREVIEW_SIZE.width },
      height: { ideal: PREVIEW_SIZE.height },
    })
  })

  it('asks for a high-resolution stream when the frame is the photo', () => {
    const [first] = buildVideoConstraints(
      { deviceId: null, facing: 'user' },
      true,
    )
    expect(first.width).toEqual({ ideal: HIGH_RES_SIZE.width })
    expect(first.height).toEqual({ ideal: HIGH_RES_SIZE.height })
  })

  it('prefers a saved device and falls back to the facing mode', () => {
    const attempts = buildVideoConstraints(
      { deviceId: 'cam-2', facing: 'environment' },
      false,
    )
    expect(attempts).toHaveLength(2)
    expect(attempts[0].deviceId).toEqual({ exact: 'cam-2' })
    expect(attempts[1].facingMode).toEqual({ ideal: 'environment' })
    expect(attempts[1].deviceId).toBeUndefined()
  })
})

describe('maxResolutionConstraints', () => {
  const caps = { width: { max: 4032 }, height: { max: 3024 } }

  it('raises the stream to the reported maximum', () => {
    expect(
      maxResolutionConstraints(caps, { width: 1920, height: 1440 }),
    ).toEqual({ width: { ideal: 4032 }, height: { ideal: 3024 } })
  })

  it('does nothing when already at the maximum', () => {
    expect(
      maxResolutionConstraints(caps, { width: 4032, height: 3024 }),
    ).toBeNull()
  })

  it('does nothing when the browser reports no limits', () => {
    expect(maxResolutionConstraints(undefined, { width: 640 })).toBeNull()
    expect(maxResolutionConstraints({}, { width: 640 })).toBeNull()
  })
})
