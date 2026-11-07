import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { CameraSelection } from './lib/constraints'
import type { CameraSummary } from './lib/mainCamera'

export type MainBackCamera = {
  /** The set of back cameras this was worked out for (see cameraSetKey). */
  key: string
  /** null when no back camera could be probed; facingMode is used then. */
  deviceId: string | null
  summaries: Record<string, CameraSummary>
}

type CameraStore = {
  /** Remembered across visits. deviceId null = pick automatically. */
  selection: CameraSelection
  /** The user has started the camera before; used when the Permissions API can't tell us. */
  hasUsedCamera: boolean
  /** The probed main back lens, so later starts open it directly. */
  mainBackCamera: MainBackCamera | null

  /** Session only: re-applied after a retake restarts the stream. */
  wantTorch: boolean
  /** Session only: takePhoto() failed once, so use the max-resolution stream instead. */
  imageCaptureBroken: boolean

  setSelection: (selection: CameraSelection) => void
  markCameraUsed: () => void
  setMainBackCamera: (mainBackCamera: MainBackCamera) => void
  setWantTorch: (wantTorch: boolean) => void
  markImageCaptureBroken: () => void
}

export const useCameraStore = create<CameraStore>()(
  persist(
    (set) => ({
      selection: { deviceId: null, facing: 'environment' },
      hasUsedCamera: false,
      mainBackCamera: null,
      wantTorch: false,
      imageCaptureBroken: false,

      setSelection: (selection) => set({ selection }),
      markCameraUsed: () => set({ hasUsedCamera: true }),
      setMainBackCamera: (mainBackCamera) => set({ mainBackCamera }),
      setWantTorch: (wantTorch) => set({ wantTorch }),
      markImageCaptureBroken: () => set({ imageCaptureBroken: true }),
    }),
    {
      name: 'camera-prefs',
      storage: createJSONStorage(() => localStorage),
      partialize: ({ selection, hasUsedCamera, mainBackCamera }) => ({
        selection,
        hasUsedCamera,
        mainBackCamera,
      }),
    },
  ),
)
