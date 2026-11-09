import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Annotation } from '@/features/annotation/lib/editor'
import type { Photo } from '@/store/photoStore'

/**
 * On-device storage (IndexedDB). Photos keep their original file plus a
 * thumbnail; annotations live in their own store so frequent edits don't
 * rewrite multi-megabyte photo records.
 */
interface CaptureDb extends DBSchema {
  photos: { key: string; value: Photo }
  annotations: {
    key: string
    value: { photoId: string; items: Annotation[]; updatedAt: number }
  }
}

const DB_NAME = 'loppr-capture'
const DB_VERSION = 1

let connection: Promise<IDBPDatabase<CaptureDb>> | null = null

const openPhotoDb = () => {
  connection ??= openDB<CaptureDb>(DB_NAME, DB_VERSION, {
    upgrade: (db) => {
      db.createObjectStore('photos', { keyPath: 'id' })
      db.createObjectStore('annotations', { keyPath: 'photoId' })
    },
  }).catch((error: unknown) => {
    connection = null
    throw error
  })
  return connection
}

/** Every saved photo (newest first) and its annotations. */
export const loadLibrary = async () => {
  const db = await openPhotoDb()
  const [photos, annotations] = await Promise.all([
    db.getAll('photos'),
    db.getAll('annotations'),
  ])
  return {
    photos: photos.toSorted((a, b) => b.capturedAt - a.capturedAt),
    annotations: Object.fromEntries(
      annotations.map((entry) => [entry.photoId, entry.items]),
    ) as Record<string, Annotation[]>,
  }
}

export const putPhoto = async (photo: Photo) => {
  await (await openPhotoDb()).put('photos', photo)
}

export const putAnnotations = async (photoId: string, items: Annotation[]) => {
  await (
    await openPhotoDb()
  ).put('annotations', {
    photoId,
    items,
    updatedAt: Date.now(),
  })
}

/** Removes a photo and its annotations together. */
export const removePhoto = async (photoId: string) => {
  const db = await openPhotoDb()
  const tx = db.transaction(['photos', 'annotations'], 'readwrite')
  await Promise.all([
    tx.objectStore('photos').delete(photoId),
    tx.objectStore('annotations').delete(photoId),
    tx.done,
  ])
}

/** Closes the connection (tests simulate a reload with this). */
export const closePhotoDb = async () => {
  const current = connection
  connection = null
  if (current) (await current).close()
}
