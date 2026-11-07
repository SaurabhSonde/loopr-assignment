import { Navigate, useNavigate } from 'react-router'
import { CheckIcon, RotateCcwIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { formatBytes, formatDimensions, formatMegapixels } from '@/lib/format'
import type { CaptureMethod } from '@/lib/image'
import { getObjectUrl } from '@/lib/objectUrl'
import { usePhotoStore } from '@/store/photoStore'

const METHOD_LABELS: Record<CaptureMethod, string> = {
  'image-capture': 'Full-resolution photo',
  'video-frame': 'Video frame',
  upload: 'Uploaded image',
}

const ReviewScreen = () => {
  const navigate = useNavigate()
  const pending = usePhotoStore((s) => s.pendingCapture)
  const discardPendingCapture = usePhotoStore((s) => s.discardPendingCapture)

  if (!pending) return <Navigate to="/" replace />

  const retake = () => {
    discardPendingCapture()
    // Replace, so the back gesture doesn't return to an empty review screen.
    navigate('/', { replace: true })
  }

  const handleUsePhoto = () => {
    // Saving to the gallery and opening the editor arrive in later phases.
    toast.info('Annotation is coming next.')
  }

  return (
    <main className="flex h-dvh flex-col bg-black text-white phone-landscape:flex-row">
      <section className="relative min-h-0 min-w-0 flex-1 p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <img
          src={getObjectUrl(pending.blob)}
          alt="Captured photo"
          className="size-full object-contain"
        />
      </section>

      <footer className="flex flex-col gap-3 px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))] phone-landscape:w-72 phone-landscape:justify-center phone-landscape:pr-[max(1rem,env(safe-area-inset-right))]">
        <p className="text-center text-sm text-white/70">
          {formatDimensions(pending.width, pending.height)} ·{' '}
          {formatMegapixels(pending.width, pending.height)} ·{' '}
          {formatBytes(pending.size)} · {METHOD_LABELS[pending.captureMethod]}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" size="lg" className="h-11" onClick={retake}>
            <RotateCcwIcon />
            Retake
          </Button>
          <Button size="lg" className="h-11" onClick={handleUsePhoto}>
            <CheckIcon />
            Use photo
          </Button>
        </div>
      </footer>
    </main>
  )
}

export default ReviewScreen
