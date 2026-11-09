import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type PointerEvent,
  type RefObject,
} from 'react'
import type { Point, Size } from '../lib/geometry'
import { clampView, FIT_VIEW, pinchView, zoomAt, type View } from '../lib/zoom'

/** Zoom step for buttons and keys. */
const STEP = 1.5
/** How strongly wheel/trackpad-pinch deltas zoom. */
const WHEEL_SENSITIVITY = 0.01

type Fitted = Size & { stage: Size }

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)
const midpoint = (a: Point, b: Point) => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
})

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))

/**
 * Zoom and pan for the annotation stage:
 * - two fingers pinch to zoom and drag to pan (one finger stays for editing);
 * - trackpad pinch / Ctrl+wheel zooms at the cursor, scrolling pans;
 * - buttons and +, -, 0 keys.
 */
export const useZoomPan = (
  containerRef: RefObject<HTMLElement | null>,
  fitted: Fitted | null,
) => {
  const [rawView, setView] = useState<View>(FIT_VIEW)
  const touches = useRef(new Map<number, Point>())
  const pinch = useRef<{
    start: View
    startMid: Point
    startDistance: number
  } | null>(null)

  // Re-clamped on every render, so rotation or resizing never leaves gaps.
  const view = fitted ? clampView(rawView, fitted, fitted.stage) : FIT_VIEW

  const toStage = (clientX: number, clientY: number): Point => {
    const box = containerRef.current?.getBoundingClientRect()
    return box
      ? { x: clientX - box.left, y: clientY - box.top }
      : { x: 0, y: 0 }
  }

  const zoomTo = (zoom: number, focus?: Point) => {
    if (!fitted) return
    const center = { x: fitted.stage.width / 2, y: fitted.stage.height / 2 }
    setView(zoomAt(view, zoom, focus ?? center, fitted, fitted.stage))
  }

  const zoomIn = () => zoomTo(view.zoom * STEP)
  const zoomOut = () => zoomTo(view.zoom / STEP)
  const fit = () => setView(FIT_VIEW)

  const handleWheel = useEffectEvent((event: WheelEvent) => {
    if (!fitted) return
    if (event.ctrlKey || event.metaKey) {
      // Trackpad pinch arrives as Ctrl+wheel; keep it from zooming the page.
      event.preventDefault()
      const factor = Math.exp(-event.deltaY * WHEEL_SENSITIVITY)
      zoomTo(view.zoom * factor, toStage(event.clientX, event.clientY))
    } else if (view.zoom > 1) {
      event.preventDefault()
      setView(
        clampView(
          { ...view, x: view.x - event.deltaX, y: view.y - event.deltaY },
          fitted,
          fitted.stage,
        ),
      )
    }
  })

  const handleKey = useEffectEvent((event: KeyboardEvent) => {
    if (isTyping(event.target) || event.metaKey || event.ctrlKey) return
    if (event.key === '+' || event.key === '=') zoomIn()
    else if (event.key === '-' || event.key === '_') zoomOut()
    else if (event.key === '0') fit()
  })

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    // Non-passive so preventDefault can stop the browser's own zoom/scroll.
    const onWheel = (event: WheelEvent) => handleWheel(event)
    const onKey = (event: KeyboardEvent) => handleKey(event)
    container.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('keydown', onKey)
    return () => {
      container.removeEventListener('wheel', onWheel)
      window.removeEventListener('keydown', onKey)
    }
  }, [containerRef])

  // Bubbled pointer events from the stage; only touch drives pinch/pan.
  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== 'touch') return
    touches.current.set(event.pointerId, toStage(event.clientX, event.clientY))
    if (touches.current.size === 2) {
      const [a, b] = [...touches.current.values()]
      pinch.current = {
        start: view,
        startMid: midpoint(a, b),
        startDistance: Math.max(1, distance(a, b)),
      }
    }
  }

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    if (!touches.current.has(event.pointerId)) return
    touches.current.set(event.pointerId, toStage(event.clientX, event.clientY))
    const gesture = pinch.current
    if (!gesture || !fitted || touches.current.size < 2) return
    const [a, b] = [...touches.current.values()]
    setView(
      pinchView(
        gesture.start,
        gesture.startMid,
        gesture.startDistance,
        midpoint(a, b),
        distance(a, b),
        fitted,
        fitted.stage,
      ),
    )
  }

  const onPointerEnd = (event: PointerEvent<HTMLElement>) => {
    touches.current.delete(event.pointerId)
    if (touches.current.size < 2) pinch.current = null
  }

  return {
    view,
    zoomIn,
    zoomOut,
    fit,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: onPointerEnd,
      onPointerCancel: onPointerEnd,
    },
  }
}
