import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { CheckIcon, InfoIcon, OctagonXIcon, RotateCcwIcon } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import { formatBytes, formatMegapixels } from '@/lib/format'
import { getObjectUrl } from '@/lib/objectUrl'
import { usePhotoStore } from '@/store/photoStore'
import { QualityBadge } from '@/features/quality/components/QualityBadge'
import { QualityPanel } from '@/features/quality/components/QualityPanel'
import { useImageQuality } from '@/features/quality/hooks/useImageQuality'

const ReviewScreen = () => {
  const navigate = useNavigate()
  const pending = usePhotoStore((s) => s.pendingCapture)
  const discardPendingCapture = usePhotoStore((s) => s.discardPendingCapture)
  const commitPendingCapture = usePhotoStore((s) => s.commitPendingCapture)
  const quality = useImageQuality(pending)
  // Set while handing the photo to the editor, so the now-empty review
  // screen doesn't redirect to the camera in the meantime.
  const [opening, setOpening] = useState(false)

  if (!pending || !quality.report) {
    return opening ? null : <Navigate to="/" replace />
  }

  const { report } = quality
  const poor = !quality.analyzing && report.overall === 'poor'
  const problems = report.checks.filter((check) => check.severity !== 'good')

  const retake = () => {
    discardPendingCapture()
    // Replace, so the back gesture doesn't return to an empty review screen.
    navigate('/', { replace: true })
  }

  const handleUsePhoto = () => {
    setOpening(true)
    const id = commitPendingCapture(quality.analyzing ? null : report)
    // Replace, so going back from the editor returns to the camera.
    if (id) navigate(`/annotate/${id}`, { replace: true })
  }

  const panel = (
    <QualityPanel
      image={pending}
      report={report}
      analyzing={quality.analyzing}
      analysisFailed={quality.analysisFailed}
    />
  )

  const actions = (
    // A poor photo makes Retake the primary action, but never blocks using it.
    <div className="grid grid-cols-2 gap-3">
      <Button
        variant={poor ? 'default' : 'outline'}
        size="lg"
        className="h-11"
        onClick={retake}
      >
        <RotateCcwIcon />
        Retake
      </Button>
      <Button
        variant={poor ? 'outline' : 'default'}
        size="lg"
        className="h-11"
        onClick={handleUsePhoto}
      >
        <CheckIcon />
        {poor ? 'Use anyway' : 'Use photo'}
      </Button>
    </div>
  )

  return (
    <main className="flex h-dvh flex-col bg-background text-foreground lg:flex-row phone-landscape:flex-row">
      <section className="relative min-h-0 min-w-0 flex-1 bg-black p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <img
          src={getObjectUrl(pending.blob)}
          alt="Captured photo"
          className="size-full object-contain"
        />
      </section>

      {/* Phones: compact summary, full report in a drawer. */}
      <footer className="flex flex-col gap-3 border-t px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] lg:hidden phone-landscape:w-80 phone-landscape:justify-center phone-landscape:border-t-0 phone-landscape:border-l phone-landscape:pr-[max(1rem,env(safe-area-inset-right))]">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <QualityBadge
              severity={report.overall}
              analyzing={quality.analyzing}
            />
            <p className="truncate text-sm text-muted-foreground tabular-nums">
              {formatMegapixels(pending.width, pending.height)} ·{' '}
              {formatBytes(pending.size)}
            </p>
          </div>
          <Drawer>
            <DrawerTrigger
              render={<Button variant="outline" size="lg" className="h-11" />}
            >
              <InfoIcon />
              Details
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader className="sr-only">
                <DrawerTitle>Image quality</DrawerTitle>
                <DrawerDescription>
                  Resolution, file size and quality checks
                </DrawerDescription>
              </DrawerHeader>
              <div className="overflow-y-auto px-4 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
                {panel}
              </div>
            </DrawerContent>
          </Drawer>
        </div>

        {poor && (
          <Alert variant="destructive">
            <OctagonXIcon />
            <AlertTitle>Retake recommended</AlertTitle>
            <AlertDescription>
              {problems
                .filter((check) => check.severity === 'poor')
                .map((check) => check.summary)
                .join(' · ')}
              . {problems.find((check) => check.severity === 'poor')?.tip}
            </AlertDescription>
          </Alert>
        )}
        {!poor && !quality.analyzing && problems.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {problems.length === 1
              ? `${problems[0].summary}. ${problems[0].tip ?? ''}`
              : `${problems.length} suggestions to improve this photo, see Details.`}
          </p>
        )}
        {actions}
      </footer>

      {/* Desktop: the full report alongside the photo. */}
      <aside className="hidden w-96 flex-col border-l lg:flex">
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {poor && (
            <Alert variant="destructive" className="mb-4">
              <OctagonXIcon />
              <AlertTitle>Retake recommended</AlertTitle>
              <AlertDescription>
                This photo doesn't meet the quality thresholds. See the checks
                below for what to fix.
              </AlertDescription>
            </Alert>
          )}
          {panel}
        </div>
        <div className="border-t p-5">{actions}</div>
      </aside>
    </main>
  )
}

export default ReviewScreen
