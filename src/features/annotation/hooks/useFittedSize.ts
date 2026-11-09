import { useEffect, useState, type RefObject } from 'react'
import type { Size } from '../lib/geometry'

/**
 * The largest size with the content's aspect ratio that fits the container
 * (like object-fit: contain), plus the scale in screen px per content px.
 * Tracks the container with a ResizeObserver, so it follows window resizes,
 * rotation and side panels opening.
 */
export const useFittedSize = (
  containerRef: RefObject<HTMLElement | null>,
  content: Size,
) => {
  const [available, setAvailable] = useState<Size | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setAvailable({ width, height })
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [containerRef])

  if (!available || available.width <= 0 || available.height <= 0) return null
  const scale = Math.min(
    available.width / content.width,
    available.height / content.height,
  )
  return {
    width: content.width * scale,
    height: content.height * scale,
    scale,
  }
}
