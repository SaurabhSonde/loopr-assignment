import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  captureStill,
  frameIsAtMax,
  imageFromFile,
  JPEG_QUALITY,
} from './capture'

const jpeg = (bytes = 10) =>
  new Blob([new Uint8Array(bytes)], { type: 'image/jpeg' })

const makeVideo = (width: number, height: number) => {
  const video = document.createElement('video')
  Object.defineProperty(video, 'videoWidth', {
    value: width,
    configurable: true,
  })
  Object.defineProperty(video, 'videoHeight', {
    value: height,
    configurable: true,
  })
  return video
}

const makeTrack = (overrides: Partial<MediaStreamTrack> = {}) =>
  ({
    getCapabilities: () => ({ width: { max: 4096 }, height: { max: 3072 } }),
    getSettings: () => ({ width: 1920, height: 1440 }),
    applyConstraints: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }) as unknown as MediaStreamTrack

/** Installs a fake ImageCapture whose takePhoto() result is controlled per test. */
const mockImageCapture = (takePhoto: () => Promise<Blob>) => {
  const takePhotoSpy = vi.fn(takePhoto)
  vi.stubGlobal(
    'ImageCapture',
    class {
      getPhotoCapabilities = () =>
        Promise.resolve({
          imageWidth: { max: 4000, min: 640, step: 1 },
          imageHeight: { max: 3000, min: 480, step: 1 },
        })
      takePhoto = takePhotoSpy
    },
  )
  return takePhotoSpy
}

let decodedSize = { width: 4000, height: 3000 }

beforeEach(() => {
  decodedSize = { width: 4000, height: 3000 }
  vi.stubGlobal('createImageBitmap', async () => ({
    ...decodedSize,
    close: () => {},
  }))
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    drawImage: vi.fn(),
  } as unknown as CanvasRenderingContext2D)
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(
    (callback) => callback(jpeg(42)),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('captureStill', () => {
  it('uses takePhoto at the sensor maximum and keeps its JPEG untouched', async () => {
    const photo = jpeg(3_000_000)
    const takePhoto = mockImageCapture(async () => photo)

    const { image, imageCaptureFailed } = await captureStill({
      video: makeVideo(1920, 1440),
      track: makeTrack(),
      useImageCapture: true,
    })

    expect(takePhoto).toHaveBeenCalledWith({
      imageWidth: 4000,
      imageHeight: 3000,
    })
    expect(image.blob).toBe(photo)
    expect(image).toMatchObject({
      captureMethod: 'image-capture',
      width: 4000,
      height: 3000,
      size: 3_000_000,
      atDeviceMax: true,
    })
    expect(imageCaptureFailed).toBe(false)
  })

  it('falls back to a max-resolution video frame when takePhoto throws', async () => {
    mockImageCapture(async () => {
      throw new DOMException('platform error', 'UnknownError')
    })
    const video = makeVideo(1920, 1440)
    const track = makeTrack({
      applyConstraints: vi.fn(async () => {
        setTimeout(() => video.dispatchEvent(new Event('resize')))
      }),
    })

    const { image, imageCaptureFailed } = await captureStill({
      video,
      track,
      useImageCapture: true,
    })

    expect(track.applyConstraints).toHaveBeenCalledWith({
      width: { ideal: 4096 },
      height: { ideal: 3072 },
    })
    expect(image.captureMethod).toBe('video-frame')
    expect(image.mimeType).toBe('image/jpeg')
    expect(HTMLCanvasElement.prototype.toBlob).toHaveBeenCalledWith(
      expect.any(Function),
      'image/jpeg',
      JPEG_QUALITY,
    )
    expect(imageCaptureFailed).toBe(true)
  })

  it('prefers the video frame when takePhoto returns a smaller image', async () => {
    decodedSize = { width: 640, height: 480 }
    mockImageCapture(async () => jpeg())

    const { image, imageCaptureFailed } = await captureStill({
      video: makeVideo(1920, 1440),
      track: makeTrack({ getCapabilities: () => ({}) }),
      useImageCapture: true,
    })

    expect(image.captureMethod).toBe('video-frame')
    expect(image.width).toBe(1920)
    expect(imageCaptureFailed).toBe(true)
  })

  it('grabs the frame directly when ImageCapture is not used', async () => {
    const takePhoto = mockImageCapture(async () => jpeg())
    const track = makeTrack()

    const { image, imageCaptureFailed } = await captureStill({
      video: makeVideo(4096, 3072),
      track,
      useImageCapture: false,
    })

    expect(takePhoto).not.toHaveBeenCalled()
    expect(track.applyConstraints).not.toHaveBeenCalled()
    expect(image).toMatchObject({
      captureMethod: 'video-frame',
      width: 4096,
      height: 3072,
      atDeviceMax: true,
    })
    expect(imageCaptureFailed).toBe(false)
  })

  it('fails clearly when the camera has no frame yet', async () => {
    await expect(
      captureStill({
        video: makeVideo(0, 0),
        track: makeTrack(),
        useImageCapture: false,
      }),
    ).rejects.toThrow('no frame')
  })
})

describe('frameIsAtMax', () => {
  const caps = { width: { max: 4032 }, height: { max: 3024 } }

  it('is true at the maximum, including rotated portrait frames', () => {
    expect(frameIsAtMax(caps, 4032, 3024)).toBe(true)
    expect(frameIsAtMax(caps, 3024, 4032)).toBe(true)
    // 16:9 at full width still uses the widest sensor readout.
    expect(frameIsAtMax(caps, 4032, 2268)).toBe(true)
  })

  it('is false below the maximum', () => {
    expect(frameIsAtMax(caps, 1920, 1080)).toBe(false)
  })

  it('is null when the browser reports no limits', () => {
    expect(frameIsAtMax(undefined, 1920, 1080)).toBeNull()
  })
})

describe('imageFromFile', () => {
  it('wraps an image file as an upload', async () => {
    decodedSize = { width: 3000, height: 2000 }
    const file = new File([new Uint8Array(500)], 'photo.png', {
      type: 'image/png',
    })

    await expect(imageFromFile(file)).resolves.toMatchObject({
      blob: file,
      width: 3000,
      height: 2000,
      size: 500,
      mimeType: 'image/png',
      captureMethod: 'upload',
      atDeviceMax: null,
    })
  })

  it('rejects non-image files', async () => {
    const file = new File(['hello'], 'notes.txt', { type: 'text/plain' })
    await expect(imageFromFile(file)).rejects.toThrow('not an image')
  })

  it('explains formats the browser cannot decode', async () => {
    vi.stubGlobal('createImageBitmap', async () => {
      throw new DOMException('decode failed', 'InvalidStateError')
    })
    const file = new File([new Uint8Array(10)], 'photo.heic', {
      type: 'image/heic',
    })
    await expect(imageFromFile(file)).rejects.toThrow("can't be opened")
  })
})
