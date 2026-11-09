import { toast } from 'sonner'
import { create } from 'zustand'
import type { Annotation } from '@/features/annotation/lib/editor'
import type { QualityReport } from '@/features/quality/lib/assess'
import { loadLibrary, putAnnotations, putPhoto, removePhoto } from '@/lib/db'
import { createId } from '@/lib/id'
import type { CapturedImage } from '@/lib/image'
import { revokeObjectUrl } from '@/lib/objectUrl'
import { createThumbnail } from '@/lib/thumbnail'

export type Photo = CapturedImage & {
  id: string
  /** null if the quality analysis hadn't finished when the photo was saved. */
  quality: QualityReport | null
  /** Small JPEG for the gallery; null until generated (or if it failed). */
  thumbBlob: Blob | null
}

/** Where photos live: IndexedDB, or memory only when storage is unavailable. */
export type Persistence = 'pending' | 'indexeddb' | 'memory'

type PhotoStore = {
  /** The shot on the review screen; in memory only until "Use photo". */
  pendingCapture: CapturedImage | null
  /** Saved photos, newest first. */
  photos: Photo[]
  annotations: Record<string, Annotation[]>
  /** The saved library has been read (or found unavailable). */
  loaded: boolean
  persistence: Persistence

  /** Reads saved photos from the device; call once at startup. */
  load: () => Promise<void>
  setPendingCapture: (image: CapturedImage) => void
  /** Discards the pending shot (Retake). */
  discardPendingCapture: () => void
  /** Saves the pending shot ("Use photo") and returns the new photo's id. */
  commitPendingCapture: (quality: QualityReport | null) => string | null
  /** Resolves to whether the photo was deleted. */
  deletePhoto: (id: string) => Promise<boolean>
  saveAnnotations: (photoId: string, annotations: Annotation[]) => void
  /** Writes any debounced annotation saves now. */
  flushAnnotations: () => Promise<void>
}

/** Annotation edits are batched: one write per photo after a short pause. */
const SAVE_DELAY_MS = 400
const pendingWrites = new Map<
  string,
  { items: Annotation[]; timer: ReturnType<typeof setTimeout> }
>()

const reportStorageError = (error: unknown) => {
  if (error instanceof DOMException && error.name === 'QuotaExceededError') {
    toast.error('Storage is full', {
      id: 'storage-error',
      description: 'Delete some photos in the gallery to make room.',
    })
  } else {
    toast.error("Couldn't save to this device's storage", {
      id: 'storage-error',
    })
  }
}

let persistRequested = false
/** Asks the browser not to evict our data (Safari otherwise may after 7 days). */
const requestPersistentStorage = () => {
  if (persistRequested) return
  persistRequested = true
  void navigator.storage?.persist?.().catch(() => {})
}

export const usePhotoStore = create<PhotoStore>()((set, get) => {
  const writeAnnotations = async (photoId: string) => {
    const entry = pendingWrites.get(photoId)
    if (!entry) return
    clearTimeout(entry.timer)
    pendingWrites.delete(photoId)
    try {
      await putAnnotations(photoId, entry.items)
    } catch (error) {
      reportStorageError(error)
    }
  }

  const cancelWrite = (photoId: string) => {
    const entry = pendingWrites.get(photoId)
    if (entry) clearTimeout(entry.timer)
    pendingWrites.delete(photoId)
  }

  /** Thumbnail first (for the gallery), then the record itself. */
  const persistPhoto = async (photo: Photo) => {
    const thumbBlob = await createThumbnail(photo.blob)
    set((state) => ({
      photos: state.photos.map((p) =>
        p.id === photo.id ? { ...p, thumbBlob } : p,
      ),
    }))
    if (get().persistence === 'memory') return
    try {
      await putPhoto({ ...photo, thumbBlob })
      await putAnnotations(photo.id, get().annotations[photo.id] ?? [])
      requestPersistentStorage()
    } catch (error) {
      reportStorageError(error)
    }
  }

  return {
    pendingCapture: null,
    photos: [],
    annotations: {},
    loaded: false,
    persistence: 'pending',

    load: async () => {
      if (get().persistence !== 'pending') return
      try {
        const library = await loadLibrary()
        set((state) => ({
          // Keep anything created while loading.
          photos: [
            ...state.photos,
            ...library.photos.filter(
              (saved) => !state.photos.some((p) => p.id === saved.id),
            ),
          ],
          annotations: { ...library.annotations, ...state.annotations },
          loaded: true,
          persistence: 'indexeddb',
        }))
        // Save pending edits when the app goes to the background or closes.
        const flush = () => void get().flushAnnotations()
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'hidden') flush()
        })
        window.addEventListener('pagehide', flush)
      } catch {
        set({ loaded: true, persistence: 'memory' })
        toast.warning("Photos can't be saved on this device", {
          id: 'memory-only',
          description:
            'Storage is unavailable (for example in private browsing), so photos are kept only until you close this tab.',
          duration: 10_000,
        })
      }
    },

    setPendingCapture: (pendingCapture) => {
      const previous = get().pendingCapture
      if (previous && previous.blob !== pendingCapture.blob) {
        revokeObjectUrl(previous.blob)
      }
      set({ pendingCapture })
    },

    discardPendingCapture: () => {
      const previous = get().pendingCapture
      if (previous) revokeObjectUrl(previous.blob)
      set({ pendingCapture: null })
    },

    commitPendingCapture: (quality) => {
      const { pendingCapture, photos, annotations } = get()
      if (!pendingCapture) return null
      const photo: Photo = {
        ...pendingCapture,
        id: createId(),
        quality,
        thumbBlob: null,
      }
      // The blob (and its object URL) now belongs to the photo; don't revoke it.
      set({
        pendingCapture: null,
        photos: [photo, ...photos],
        annotations: { ...annotations, [photo.id]: [] },
      })
      void persistPhoto(photo)
      return photo.id
    },

    deletePhoto: async (id) => {
      const photo = get().photos.find((p) => p.id === id)
      if (!photo) return false
      cancelWrite(id)
      // Delete on the device first: the photo only disappears once it's
      // really gone, so closing the tab right after can't bring it back.
      if (get().persistence !== 'memory') {
        try {
          await removePhoto(id)
        } catch (error) {
          reportStorageError(error)
          return false
        }
      }
      set((state) => {
        const annotations = { ...state.annotations }
        delete annotations[id]
        return { photos: state.photos.filter((p) => p.id !== id), annotations }
      })
      revokeObjectUrl(photo.blob)
      if (photo.thumbBlob) revokeObjectUrl(photo.thumbBlob)
      return true
    },

    saveAnnotations: (photoId, items) => {
      if (get().annotations[photoId] === items) return
      set((state) => ({
        annotations: { ...state.annotations, [photoId]: items },
      }))
      if (get().persistence === 'memory') return
      const existing = pendingWrites.get(photoId)
      if (existing) clearTimeout(existing.timer)
      pendingWrites.set(photoId, {
        items,
        timer: setTimeout(() => void writeAnnotations(photoId), SAVE_DELAY_MS),
      })
    },

    flushAnnotations: async () => {
      await Promise.all([...pendingWrites.keys()].map(writeAnnotations))
    },
  }
})
