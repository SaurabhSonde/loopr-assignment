import { labelColor } from '../lib/colors'
import type { Annotation } from '../lib/editor'

type BoxShapeProps = {
  annotation: Annotation
  selected: boolean
  onFocus: (id: string) => void
}

/**
 * One box, drawn in image pixels. `non-scaling-stroke` keeps the outline the
 * same on-screen width at any zoom; a dark halo keeps it visible on bright
 * photos. Unlabeled boxes are dashed.
 */
export const BoxShape = ({ annotation, selected, onFocus }: BoxShapeProps) => {
  const { x, y, width, height, label } = annotation
  const color = labelColor(label)
  const name = label ?? 'Unlabeled box'

  return (
    <g
      data-annotation-id={annotation.id}
      tabIndex={0}
      role="button"
      aria-label={`${name}, ${Math.round(width)} by ${Math.round(height)} pixels`}
      aria-pressed={selected}
      className="cursor-move outline-none"
      onFocus={() => onFocus(annotation.id)}
    >
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="none"
        stroke="rgb(0 0 0 / 0.45)"
        strokeWidth={selected ? 5 : 4}
        vectorEffect="non-scaling-stroke"
      />
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={color.stroke}
        fillOpacity={selected ? 0.2 : 0.08}
        stroke={color.stroke}
        strokeWidth={selected ? 3 : 2}
        strokeDasharray={label ? undefined : '6 4'}
        vectorEffect="non-scaling-stroke"
      />
    </g>
  )
}
