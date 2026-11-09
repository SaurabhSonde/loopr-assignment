import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

const MAX_RECENT = 8

type LabelStore = {
  /** Most recently used first; shared across photos and visits. */
  recent: string[]
  remember: (label: string) => void
}

export const useLabelStore = create<LabelStore>()(
  persist(
    (set) => ({
      recent: [],
      remember: (label) =>
        set(({ recent }) => ({
          recent: [
            label,
            ...recent.filter(
              (existing) => existing.toLowerCase() !== label.toLowerCase(),
            ),
          ].slice(0, MAX_RECENT),
        })),
    }),
    { name: 'recent-labels', storage: createJSONStorage(() => localStorage) },
  ),
)
