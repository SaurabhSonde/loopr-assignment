import { describe, expect, it } from 'vitest'
import { cameraError, toCameraError } from './cameraErrors'

const domError = (name: string) => new DOMException('test', name)

describe('toCameraError', () => {
  it.each([
    ['NotAllowedError', 'permission-denied'],
    ['NotFoundError', 'not-found'],
    ['OverconstrainedError', 'not-found'],
    ['NotReadableError', 'in-use'],
    ['AbortError', 'in-use'],
    ['SecurityError', 'insecure'],
  ])('maps %s to %s', (name, kind) => {
    expect(toCameraError(domError(name)).kind).toBe(kind)
  })

  it('maps a TypeError (missing API) to unsupported', () => {
    expect(toCameraError(new TypeError('no mediaDevices')).kind).toBe(
      'unsupported',
    )
  })

  it('falls back to unknown for anything else', () => {
    expect(toCameraError('boom').kind).toBe('unknown')
    expect(toCameraError(domError('WeirdError')).kind).toBe('unknown')
  })
})

describe('cameraError', () => {
  it('only offers retry when retrying can help', () => {
    expect(cameraError('in-use').canRetry).toBe(true)
    expect(cameraError('insecure').canRetry).toBe(false)
    expect(cameraError('unsupported').canRetry).toBe(false)
  })
})
