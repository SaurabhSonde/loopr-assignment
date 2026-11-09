import { useRef, useState, type PointerEvent, type RefObject } from 'react'
import type { Annotation } from '../lib/editor'
import {
  clampPoint,
  isLargeEnough,
  moveRect,
  rectFromPoints,
  resizeRect,
  type Handle,
  type Point,
  type Rect,
  type Size,
} from '../lib/geometry'

/** Movement (screen px) before a press becomes a drag; below it, it's a tap. */
const DRAG_SLOP_PX = 4
/** Smallest box (screen px per side) worth keeping; smaller is an accidental drag. */
const MIN_BOX_PX = 8

type GestureBase = {
  pointerId: number
  startClient: Point
  /** Screen px per image px when the gesture started. */
  screenScale: number
  /** Passed the drag slop; until then the gesture is a potential tap. */
  dragging: boolean
}

type Gesture = GestureBase &
  (
    | { kind: 'draw'; origin: Point }
    | { kind: 'move'; id: string; origin: Point; startRect: Rect }
    | { kind: 'resize'; id: string; handle: Handle; startRect: Rect }
  )

/** The box being drawn (id null) or the live shape of a box being edited. */
export type Draft = { id: string | null; rect: Rect } | null

type Options = {
  svgRef: RefObject<SVGSVGElement | null>
  imageSize: Size
  annotations: Annotation[]
  enabled: boolean
  onSelect: (id: string | null) => void
  onCreate: (rect: Rect) => void
  onChange: (id: string, rect: Rect) => void
}

/**
 * Pointer handling for the annotation stage, without modes:
 * - drag on empty space draws a box; a tap there deselects;
 * - press on a box selects it, dragging moves it;
 * - drag a handle to resize.
 * Pointer Events cover mouse, touch and pen alike. A second finger cancels
 * the gesture, leaving two-finger gestures for zoom and pan. Edits are
 * reported once, when the gesture ends.
 */
export const useStageInteraction = ({
  svgRef,
  imageSize,
  annotations,
  enabled,
  onSelect,
  onCreate,
  onChange,
}: Options) => {
  const gestureRef = useRef<Gesture | null>(null)
  const pointersRef = useRef(new Set<number>())
  const [draft, setDraft] = useState<Draft>(null)

  /**
   * Screen → image coordinates, from the stage's on-screen box: the same
   * coordinate space as pointer events, including any CSS scale/translate
   * (zoom). getScreenCTM() can disagree with it when the page is pinch-zoomed.
   */
  const toImage = (clientX: number, clientY: number): Point | null => {
    const box = svgRef.current?.getBoundingClientRect()
    if (!box || box.width === 0 || box.height === 0) return null
    return clampPoint(
      {
        x: ((clientX - box.left) / box.width) * imageSize.width,
        y: ((clientY - box.top) / box.height) * imageSize.height,
      },
      imageSize,
    )
  }

  /** Screen px per image px right now. */
  const screenScale = () =>
    (svgRef.current?.getBoundingClientRect().width ?? 0) / imageSize.width

  const rectFor = (gesture: Gesture, point: Point): Rect => {
    switch (gesture.kind) {
      case 'draw':
        return rectFromPoints(gesture.origin, point)
      case 'move':
        return moveRect(
          gesture.startRect,
          point.x - gesture.origin.x,
          point.y - gesture.origin.y,
          imageSize,
        )
      case 'resize':
        return resizeRect(gesture.startRect, gesture.handle, point, imageSize)
    }
  }

  const cancel = () => {
    gestureRef.current = null
    setDraft(null)
  }

  const onPointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (!enabled) return
    if (event.pointerType === 'mouse' && event.button !== 0) return
    pointersRef.current.add(event.pointerId)
    if (pointersRef.current.size > 1) return cancel()

    const point = toImage(event.clientX, event.clientY)
    if (!point) return

    const target = event.target as Element
    const handle = target.closest<SVGElement>('[data-handle]')
    const box = target.closest<SVGElement>('[data-annotation-id]')
    const base: GestureBase = {
      pointerId: event.pointerId,
      startClient: { x: event.clientX, y: event.clientY },
      screenScale: screenScale(),
      dragging: false,
    }
    const find = (id: string | undefined) =>
      annotations.find((annotation) => annotation.id === id)

    event.currentTarget.setPointerCapture(event.pointerId)
    const resized = find(handle?.dataset.for)
    const moved = find(box?.dataset.annotationId)
    if (handle && resized) {
      gestureRef.current = {
        ...base,
        kind: 'resize',
        id: resized.id,
        handle: handle.dataset.handle as Handle,
        startRect: resized,
      }
    } else if (moved) {
      onSelect(moved.id)
      gestureRef.current = {
        ...base,
        kind: 'move',
        id: moved.id,
        origin: point,
        startRect: moved,
      }
    } else {
      gestureRef.current = { ...base, kind: 'draw', origin: point }
    }
  }

  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const gesture = gestureRef.current
    if (!gesture || event.pointerId !== gesture.pointerId) return
    if (!gesture.dragging) {
      const distance = Math.hypot(
        event.clientX - gesture.startClient.x,
        event.clientY - gesture.startClient.y,
      )
      if (distance < DRAG_SLOP_PX) return
      gesture.dragging = true
    }
    const point = toImage(event.clientX, event.clientY)
    if (!point) return
    setDraft({
      id: gesture.kind === 'draw' ? null : gesture.id,
      rect: rectFor(gesture, point),
    })
  }

  const onPointerUp = (event: PointerEvent<SVGSVGElement>) => {
    pointersRef.current.delete(event.pointerId)
    const gesture = gestureRef.current
    if (!gesture || event.pointerId !== gesture.pointerId) return
    gestureRef.current = null
    setDraft(null)

    const point = toImage(event.clientX, event.clientY)
    if (!gesture.dragging || !point) {
      // A tap on empty space clears the selection.
      if (gesture.kind === 'draw') onSelect(null)
      return
    }
    const rect = rectFor(gesture, point)
    if (gesture.kind === 'draw') {
      if (isLargeEnough(rect, MIN_BOX_PX / gesture.screenScale)) onCreate(rect)
    } else {
      onChange(gesture.id, rect)
    }
  }

  const onPointerCancel = (event: PointerEvent<SVGSVGElement>) => {
    pointersRef.current.delete(event.pointerId)
    if (gestureRef.current?.pointerId === event.pointerId) cancel()
  }

  return {
    draft,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
    },
  }
}
