import { useEffect, type RefObject } from 'react'
import { cn } from '@/lib/utils'

type ViewfinderProps = {
  stream: MediaStream | null
  /** Mirror the preview like a mirror for front cameras; captures stay unmirrored. */
  mirrored: boolean
  videoRef: RefObject<HTMLVideoElement | null>
}

export const Viewfinder = ({ stream, mirrored, videoRef }: ViewfinderProps) => {
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.srcObject = stream
    // muted + playsInline lets iOS autoplay; play() covers browsers that still wait.
    if (stream) video.play().catch(() => {})
  }, [stream, videoRef])

  return (
    <video
      ref={videoRef}
      autoPlay
      muted
      playsInline
      // object-contain shows the whole frame, i.e. exactly what will be captured.
      className={cn('size-full object-contain', mirrored && '-scale-x-100')}
    />
  )
}
