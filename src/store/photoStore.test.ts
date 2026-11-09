import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { closePhotoDb, loadLibrary } from '@/lib/db'
import type { CapturedImage } from '@/lib/image'
import { usePhotoStore } from './photoStore'

vi.mock('@/lib/thumbnail', () => ({
  createThumbnail: async () => new Blob(['thumb'], { type: 'image/jpeg' }),
}))

const capture = (): CapturedImage => ({
  blob: new Blob(['photo'], { type: 'image/jpeg' }),
  width: 4080,
  height: 3060,
  size: 3_000_000,
  mimeType: 'image/jpeg',
  captureMethod: 'image-capture',
  atDeviceMax: true,
  capturedAt: Date.now(),
})

const box = { id: 'a', label: 'Car', x: 10, y: 20, width: 100, height: 50 }

const freshStore = () =>
  usePhotoStore.setState({
    pendingCapture: null,
    photos: [],
    annotations: {},
    loaded: false,
    persistence: 'pending',
  })

/** Like reloading the page: drop in-memory state and read the device again. */
const reload = async () => {
  await closePhotoDb()
  freshStore()
  await usePhotoStore.getState().load()
}

/** Commit a capture and wait for its (async) save to finish. */
const savePhoto = async () => {
  const store = usePhotoStore.getState()
  store.setPendingCapture(capture())
  const id = store.commitPendingCapture(null)!
  await vi.waitFor(async () => {
    const { photos } = await loadLibrary()
    expect(photos.map((p) => p.id)).toContain(id)
  })
  return id
}

beforeEach(async () => {
  indexedDB.deleteDatabase('loppr-capture')
  freshStore()
  await usePhotoStore.getState().load()
})

afterEach(async () => {
  await closePhotoDb()
})

describe('photoStore persistence', () => {
  it('keeps saved photos, with thumbnails, across a reload', async () => {
    const id = await savePhoto()
    await reload()

    const { photos, persistence } = usePhotoStore.getState()
    expect(persistence).toBe('indexeddb')
    expect(photos).toHaveLength(1)
    expect(photos[0]).toMatchObject({ id, width: 4080, height: 3060 })
    expect(photos[0].thumbBlob).not.toBeNull()
  })

  it('saves annotation edits after a short pause', async () => {
    const id = await savePhoto()
    usePhotoStore.getState().saveAnnotations(id, [box])
    await usePhotoStore.getState().flushAnnotations()
    await reload()

    expect(usePhotoStore.getState().annotations[id]).toEqual([box])
  })

  it('deletes a photo together with its annotations', async () => {
    const id = await savePhoto()
    usePhotoStore.getState().saveAnnotations(id, [box])
    await usePhotoStore.getState().deletePhoto(id)
    await usePhotoStore.getState().flushAnnotations()
    await reload()

    expect(usePhotoStore.getState().photos).toEqual([])
    expect(usePhotoStore.getState().annotations[id]).toBeUndefined()
  })

  it('discards the pending shot on retake without saving it', async () => {
    usePhotoStore.getState().setPendingCapture(capture())
    usePhotoStore.getState().discardPendingCapture()
    expect(usePhotoStore.getState().pendingCapture).toBeNull()
    expect((await loadLibrary()).photos).toEqual([])
  })
})
