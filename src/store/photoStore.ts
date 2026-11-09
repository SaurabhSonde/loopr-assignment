import { create } from 'zustand'
import type { Annotation } from '@/features/annotation/lib/editor'
import type { QualityReport } from '@/features/quality/lib/assess'
import { createId } from '@/lib/id'
import type { CapturedImage } from '@/lib/image'
import { revokeObjectUrl } from '@/lib/objectUrl'

export type Photo = CapturedImage & {
  id: string
  /** null if the quality analysis hadn't finished when the photo was saved. */
  quality: QualityReport | null
}

type PhotoStore = {
  /** The shot on the review screen; in memory only until "Use photo". */
  pendingCapture: CapturedImage | null
  /** Saved photos, newest first. */
  photos: Photo[]
  annotations: Record<string, Annotation[]>

  setPendingCapture: (image: CapturedImage) => void
  /** Discards the pending shot (Retake). */
  discardPendingCapture: () => void
  /** Saves the pending shot ("Use photo") and returns the new photo's id. */
  commitPendingCapture: (quality: QualityReport | null) => string | null
  saveAnnotations: (photoId: string, annotations: Annotation[]) => void
}

export const usePhotoStore = create<PhotoStore>()((set, get) => ({
  pendingCapture: null,
  photos: [],
  annotations: {},

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
    const photo: Photo = { ...pendingCapture, id: createId(), quality }
    // The blob (and its object URL) now belongs to the photo; don't revoke it.
    set({
      pendingCapture: null,
      photos: [photo, ...photos],
      annotations: { ...annotations, [photo.id]: [] },
    })
    return photo.id
  },

  saveAnnotations: (photoId, items) =>
    set((state) => ({
      annotations: { ...state.annotations, [photoId]: items },
    })),
}))
