import { labelColor } from '../lib/colors'
import type { Annotation } from '../lib/editor'
import { HANDLES, handlePosition, type Handle } from '../lib/geometry'

const CURSORS: Record<Handle, string> = {
  nw: 'nwse-resize',
  se: 'nwse-resize',
  ne: 'nesw-resize',
  sw: 'nesw-resize',
  n: 'ns-resize',
  s: 'ns-resize',
  e: 'ew-resize',
  w: 'ew-resize',
}

const CORNERS: Handle[] = ['nw', 'ne', 'se', 'sw']

type ResizeHandlesProps = {
  annotation: Annotation
  /** Image px per screen px, so handles keep a constant on-screen size. */
  unit: number
  /** Touch: larger hit areas, and corners only on small boxes. */
  coarse: boolean
}

export const ResizeHandles = ({
  annotation,
  unit,
  coarse,
}: ResizeHandlesProps) => {
  const visible = 10 * unit
  const hit = (coarse ? 40 : 20) * unit
  const color = labelColor(annotation.label).stroke
  // On small boxes, edge handles would cover the whole box and block moving it.
  const small = Math.min(annotation.width, annotation.height) < hit * 2.5
  const handles = small ? CORNERS : HANDLES

  return (
    <g aria-hidden>
      {handles.map((handle) => {
        const { x, y } = handlePosition(annotation, handle)
        return (
          <g
            key={handle}
            data-handle={handle}
            data-for={annotation.id}
            style={{ cursor: CURSORS[handle] }}
          >
            <rect
              x={x - hit / 2}
              y={y - hit / 2}
              width={hit}
              height={hit}
              fill="transparent"
            />
            <rect
              x={x - visible / 2}
              y={y - visible / 2}
              width={visible}
              height={visible}
              rx={2 * unit}
              fill="white"
              stroke={color}
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
          </g>
        )
      })}
    </g>
  )
}
