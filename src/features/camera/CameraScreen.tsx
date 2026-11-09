import { useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import {
  ImagesIcon,
  ImageUpIcon,
  LoaderCircleIcon,
  SwitchCameraIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { UploadButton } from '@/components/UploadButton'
import { Button, buttonVariants } from '@/components/ui/button'
import type { CapturedImage } from '@/lib/image'
import { cn } from '@/lib/utils'
import { usePhotoStore } from '@/store/photoStore'
import { useCameraStore } from './cameraStore'
import { CameraDiagnostics } from './components/CameraDiagnostics'
import { CameraMessage } from './components/CameraMessage'
import { DeviceMenu } from './components/DeviceMenu'
import { TorchToggle } from './components/TorchToggle'
import { Viewfinder } from './components/Viewfinder'
import { useCamera } from './hooks/useCamera'
import { useCameraPermission } from './hooks/useCameraPermission'
import { useTorch } from './hooks/useTorch'
import { cameraError } from './lib/cameraErrors'
import { captureStill, imageFromFile } from './lib/capture'
import { getCameraSupport } from './lib/support'
import { getObjectUrl } from '@/lib/objectUrl'

const CameraScreen = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const camera = useCamera()
  const live = camera.status === 'live'
  const torch = useTorch(live ? camera.track : null)
  const hasUsedCamera = useCameraStore((s) => s.hasUsedCamera)
  const automaticCamera = useCameraStore((s) => s.selection.deviceId === null)
  const mainBackCamera = useCameraStore((s) => s.mainBackCamera)
  const setPendingCapture = usePhotoStore((s) => s.setPendingCapture)
  const latestPhoto = usePhotoStore((s) => s.photos[0])
  const videoRef = useRef<HTMLVideoElement>(null)
  const [capturing, setCapturing] = useState(false)
  const [flashCount, setFlashCount] = useState(0)

  // Start on our own only once access is known to be granted (or was used
  // before, where the browser can't tell us); otherwise ask in context first.
  const permission = useCameraPermission((next) => {
    if (
      next === 'granted' ||
      (next === 'unknown' && useCameraStore.getState().hasUsedCamera)
    ) {
      camera.ensureStarted()
    }
  })

  const openReview = (image: CapturedImage) => {
    setPendingCapture(image)
    navigate('/review')
  }

  const handleUpload = async (file: File) => {
    try {
      openReview(await imageFromFile(file))
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Couldn't open that image.",
      )
    }
  }

  const handleCapture = async () => {
    const video = videoRef.current
    const track = camera.track
    if (!video || !track || capturing) return
    setCapturing(true)
    setFlashCount((count) => count + 1)
    try {
      const prefs = useCameraStore.getState()
      const { image, imageCaptureFailed } = await captureStill({
        video,
        track,
        useImageCapture:
          getCameraSupport().imageCapture && !prefs.imageCaptureBroken,
      })
      if (imageCaptureFailed) prefs.markImageCaptureBroken()
      camera.stop()
      openReview(image)
    } catch {
      toast.error("Couldn't take the photo. Try again.")
      setCapturing(false)
    }
  }

  const showPrompt =
    camera.status === 'idle' &&
    (permission === 'prompt' || (permission === 'unknown' && !hasUsedCamera))
  const error =
    camera.status === 'error'
      ? camera.error
      : camera.status === 'idle' && permission === 'denied'
        ? cameraError('permission-denied')
        : null
  const showSpinner = !live && !showPrompt && !error

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-black text-white select-none phone-landscape:flex-row">
      <header className="flex items-center justify-between gap-2 px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 phone-landscape:flex-col phone-landscape:py-3 phone-landscape:pl-[max(0.75rem,env(safe-area-inset-left))]">
        <TorchToggle
          ready={live}
          supported={torch.supported}
          on={torch.on}
          pending={torch.pending}
          onToggle={torch.toggle}
        />
        <div className="flex items-center gap-1 phone-landscape:flex-col">
          {live && camera.devices.length > 2 && (
            <DeviceMenu
              devices={camera.devices}
              activeDeviceId={camera.deviceId}
              automatic={automaticCamera && camera.facing !== 'user'}
              mainBackCamera={mainBackCamera}
              onSelect={camera.selectDevice}
            />
          )}
          <UploadButton
            variant="ghost"
            className="size-11"
            aria-label="Upload a photo"
            onFile={handleUpload}
          >
            <ImageUpIcon className="size-5" />
          </UploadButton>
        </div>
      </header>

      <section className="relative min-h-0 min-w-0 flex-1">
        <Viewfinder
          stream={camera.stream}
          mirrored={live && camera.facing !== 'environment'}
          videoRef={videoRef}
        />
        {live && searchParams.has('debug') && (
          <CameraDiagnostics track={camera.track} devices={camera.devices} />
        )}
        {flashCount > 0 && (
          <div
            key={flashCount}
            aria-hidden
            className="pointer-events-none absolute inset-0 animate-shutter-flash bg-white motion-reduce:hidden"
          />
        )}
        {(showPrompt || error || showSpinner) && (
          <div className="absolute inset-0 flex items-center justify-center overflow-y-auto">
            {showPrompt && (
              <CameraMessage
                variant="prompt"
                onStart={() => camera.start()}
                onUpload={handleUpload}
              />
            )}
            {error && (
              <CameraMessage
                variant="error"
                error={error}
                onRetry={() => camera.start()}
                onUpload={handleUpload}
              />
            )}
            {showSpinner && (
              <p
                role="status"
                className="flex items-center gap-2 text-sm text-white/70"
              >
                <LoaderCircleIcon className="size-5 animate-spin" />
                Starting camera…
              </p>
            )}
          </div>
        )}
      </section>

      <footer className="grid grid-cols-3 items-center justify-items-center px-6 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] phone-landscape:grid-cols-1 phone-landscape:grid-rows-3 phone-landscape:px-3 phone-landscape:py-3 phone-landscape:pr-[max(0.75rem,env(safe-area-inset-right))]">
        <Link
          to="/gallery"
          aria-label="Gallery"
          className={cn(
            buttonVariants({ variant: 'ghost' }),
            'size-11 overflow-hidden p-0 phone-landscape:order-3',
          )}
        >
          {/* Like a native camera: the latest photo opens the gallery. */}
          {latestPhoto?.thumbBlob ? (
            <img
              src={getObjectUrl(latestPhoto.thumbBlob)}
              alt=""
              className="size-11 rounded-lg object-cover ring-2 ring-white/70"
            />
          ) : (
            <ImagesIcon className="size-6" />
          )}
        </Link>

        <button
          type="button"
          aria-label="Take photo"
          disabled={!live || capturing}
          onClick={handleCapture}
          className="group relative flex size-18 items-center justify-center rounded-full border-4 border-white transition-opacity outline-none focus-visible:ring-4 focus-visible:ring-white/50 disabled:opacity-40 phone-landscape:order-2"
        >
          <span className="size-14 rounded-full bg-white transition-transform group-active:scale-90" />
          {capturing && (
            <LoaderCircleIcon className="absolute size-7 animate-spin text-black" />
          )}
        </button>

        <Button
          variant="ghost"
          className="size-11 phone-landscape:order-1"
          aria-label="Switch camera"
          disabled={!live || camera.devices.length < 2}
          onClick={() => camera.flip()}
        >
          <SwitchCameraIcon className="size-6" />
        </Button>
      </footer>
    </main>
  )
}

export default CameraScreen
