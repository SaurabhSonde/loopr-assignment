import { cn } from '@/lib/utils'
import { labelColor } from '../lib/colors'
import type { Annotation } from '../lib/editor'
import type { Size } from '../lib/geometry'

type LabelChipsProps = {
  annotations: Annotation[]
  imageSize: Size
  /** Screen px per image px, including zoom. */
  scale: number
  /** Current zoom; chips counter-scale so text keeps its size. */
  zoom: number
  selectedId: string | null
  onEditLabel: (id: string) => void
}

const percent = (value: number, total: number) => `${(value / total) * 100}%`

/**
 * Label tags as HTML over the photo, positioned in percentages of the image
 * so they stay attached to their boxes at any size or zoom. Text stays crisp
 * and readable, and the selected box's tag is a button to rename it.
 */
export const LabelChips = ({
  annotations,
  imageSize,
  scale,
  zoom,
  selectedId,
  onEditLabel,
}: LabelChipsProps) => (
  <div className="pointer-events-none absolute inset-0">
    {annotations.map((annotation) => {
      const color = labelColor(annotation.label)
      const selected = annotation.id === selectedId
      // Sit above the box unless that would leave the photo.
      const above = annotation.y * scale > 22
      return (
        <button
          key={annotation.id}
          type="button"
          tabIndex={-1}
          onClick={() => onEditLabel(annotation.id)}
          style={{
            left: percent(annotation.x, imageSize.width),
            top: percent(annotation.y, imageSize.height),
            backgroundColor: color.stroke,
            color: color.text,
            // Undo the stage's zoom, then sit just above (or inside) the box.
            transform: `scale(${1 / zoom}) translateY(${above ? 'calc(-100% - 2px)' : '2px'})`,
            transformOrigin: '0 0',
          }}
          className={cn(
            'absolute max-w-40 truncate rounded-md px-1.5 py-0.5 text-xs leading-4 font-medium shadow-sm',
            !annotation.label && 'italic',
            selected ? 'pointer-events-auto ring-2 ring-white' : 'opacity-90',
          )}
        >
          {annotation.label ?? 'Unlabeled'}
        </button>
      )
    })}
  </div>
)
