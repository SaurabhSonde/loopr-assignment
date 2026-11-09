import { MinusIcon, PlusIcon, ScanIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MAX_ZOOM } from '../lib/zoom'

type ZoomControlsProps = {
  zoom: number
  onZoomIn: () => void
  onZoomOut: () => void
  onFit: () => void
}

/** Zoom out / level / zoom in / fit, floating over the photo. */
export const ZoomControls = ({
  zoom,
  onZoomIn,
  onZoomOut,
  onFit,
}: ZoomControlsProps) => (
  <div
    role="group"
    aria-label="Zoom"
    className="flex items-center gap-0.5 rounded-full bg-black/70 p-1 text-white shadow-lg backdrop-blur"
  >
    <Button
      variant="ghost"
      size="icon"
      className="size-9 rounded-full hover:bg-white/15 hover:text-white"
      aria-label="Zoom out"
      disabled={zoom <= 1}
      onClick={onZoomOut}
    >
      <MinusIcon />
    </Button>
    <span
      aria-live="polite"
      className="w-12 text-center text-xs font-medium tabular-nums"
    >
      {zoom <= 1 ? 'Fit' : `${Math.round(zoom * 100)}%`}
    </span>
    <Button
      variant="ghost"
      size="icon"
      className="size-9 rounded-full hover:bg-white/15 hover:text-white"
      aria-label="Zoom in"
      disabled={zoom >= MAX_ZOOM}
      onClick={onZoomIn}
    >
      <PlusIcon />
    </Button>
    <Button
      variant="ghost"
      size="icon"
      className="size-9 rounded-full hover:bg-white/15 hover:text-white"
      aria-label="Fit photo to screen"
      disabled={zoom <= 1}
      onClick={onFit}
    >
      <ScanIcon />
    </Button>
  </div>
)
