import { create } from 'zustand'
import type { CapturedImage } from '@/lib/image'
import { revokeObjectUrl } from '@/lib/objectUrl'

type PhotoStore = {
  /** The shot on the review screen; in memory only until "Use photo". */
  pendingCapture: CapturedImage | null
  setPendingCapture: (image: CapturedImage) => void
  /** Discards the pending shot (Retake). */
  discardPendingCapture: () => void
}

export const usePhotoStore = create<PhotoStore>()((set, get) => ({
  pendingCapture: null,
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
}))
