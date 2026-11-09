import { useRef } from 'react'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'
import { useFittedSize } from '../hooks/useFittedSize'
import { useStageInteraction } from '../hooks/useStageInteraction'
import { useZoomPan } from '../hooks/useZoomPan'
import type { Annotation } from '../lib/editor'
import type { Rect, Size } from '../lib/geometry'
import { BoxShape } from './BoxShape'
import { LabelChips } from './LabelChips'
import { ResizeHandles } from './ResizeHandles'
import { ZoomControls } from './ZoomControls'

type AnnotationStageProps = {
  src: string
  imageSize: Size
  annotations: Annotation[]
  selectedId: string | null
  hidden: boolean
  onSelect: (id: string | null) => void
  onCreate: (rect: Rect) => void
  onChange: (id: string, rect: Rect) => void
  onEditLabel: (id: string) => void
}

const area = (rect: Rect) => rect.width * rect.height

/**
 * The photo with an SVG layer whose viewBox is the photo's own pixel size,
 * both filling the same box sized to fit the available space. Boxes are
 * stored in image pixels, so they stay aligned with the image at any window
 * size, rotation or zoom: alignment holds by construction rather than by
 * recalculating positions.
 */
export const AnnotationStage = ({
  src,
  imageSize,
  annotations,
  selectedId,
  hidden,
  onSelect,
  onCreate,
  onChange,
  onEditLabel,
}: AnnotationStageProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const fitted = useFittedSize(containerRef, imageSize)
  const zoomPan = useZoomPan(containerRef, fitted)
  const { zoom } = zoomPan.view
  const coarse = useMediaQuery('(pointer: coarse)')
  const { draft, handlers } = useStageInteraction({
    svgRef,
    imageSize,
    annotations,
    enabled: !hidden,
    onSelect,
    onCreate,
    onChange,
  })

  // Show the live shape of a box while it's being dragged.
  const shown = annotations.map((annotation) =>
    draft?.id === annotation.id ? { ...annotation, ...draft.rect } : annotation,
  )
  const selected = shown.find((annotation) => annotation.id === selectedId)
  // Smaller boxes on top so they stay reachable; the selected box above all.
  const ordered = shown
    .filter((annotation) => annotation.id !== selectedId)
    .toSorted((a, b) => area(b) - area(a))
  // Screen px per image px, including zoom; keeps handles a constant size.
  const screenScale = fitted ? fitted.scale * zoom : 1
  const unit = 1 / screenScale

  return (
    <div
      ref={containerRef}
      // touch-none: pinches here zoom the photo, not the page.
      className="relative flex size-full touch-none items-center justify-center overflow-hidden"
      {...zoomPan.handlers}
    >
      {fitted && (
        <div
          className="relative shrink-0 will-change-transform"
          style={{
            width: fitted.width,
            height: fitted.height,
            transform: `translate(${zoomPan.view.x}px, ${zoomPan.view.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
        >
          <img
            src={src}
            alt="Photo being annotated"
            draggable={false}
            className="pointer-events-none absolute inset-0 size-full select-none"
          />
          <svg
            ref={svgRef}
            viewBox={`0 0 ${imageSize.width} ${imageSize.height}`}
            // Stretch the image-pixel grid exactly over the <img> box (never
            // letterbox), so overlay and photo can't drift apart.
            preserveAspectRatio="none"
            data-testid="annotation-stage"
            aria-label="Annotation canvas: drag to draw a box"
            className={cn(
              'absolute inset-0 size-full touch-none select-none',
              hidden ? 'pointer-events-none' : 'cursor-crosshair',
            )}
            {...handlers}
          >
            {!hidden && (
              <>
                {ordered.map((annotation) => (
                  <BoxShape
                    key={annotation.id}
                    annotation={annotation}
                    selected={false}
                    onFocus={onSelect}
                  />
                ))}
                {selected && (
                  <>
                    <BoxShape
                      annotation={selected}
                      selected
                      onFocus={onSelect}
                    />
                    <ResizeHandles
                      annotation={selected}
                      unit={unit}
                      coarse={coarse}
                    />
                  </>
                )}
              </>
            )}
            {draft?.id === null && (
              <rect
                {...draft.rect}
                fill="rgb(255 255 255 / 0.12)"
                stroke="white"
                strokeWidth={2}
                strokeDasharray="6 4"
                vectorEffect="non-scaling-stroke"
              />
            )}
          </svg>
          {!hidden && (
            <LabelChips
              annotations={shown}
              imageSize={imageSize}
              scale={screenScale}
              zoom={zoom}
              selectedId={selectedId}
              onEditLabel={onEditLabel}
            />
          )}
        </div>
      )}
      <div className="absolute top-2 right-2">
        <ZoomControls
          zoom={zoom}
          onZoomIn={zoomPan.zoomIn}
          onZoomOut={zoomPan.zoomOut}
          onFit={zoomPan.fit}
        />
      </div>
    </div>
  )
}
