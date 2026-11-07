import { useEffect, useState } from 'react'
import { CopyIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { getCameraSupport } from '../lib/support'

type CameraDiagnosticsProps = {
  track: MediaStreamTrack | null
  devices: MediaDeviceInfo[]
}

const describePhotoCapabilities = async (track: MediaStreamTrack) => {
  if (!('ImageCapture' in window)) return 'ImageCapture unavailable'
  try {
    return await new ImageCapture(track).getPhotoCapabilities()
  } catch (error) {
    return `getPhotoCapabilities failed: ${String(error)}`
  }
}

/**
 * What the browser reports about the live camera, shown with `?debug` in the
 * URL. Helps diagnose device-specific behaviour (torch, resolution) on phones
 * without remote devtools.
 */
export const CameraDiagnostics = ({
  track,
  devices,
}: CameraDiagnosticsProps) => {
  const [photo, setPhoto] = useState<{
    trackId: string
    value: unknown
  } | null>(null)
  const [, setTick] = useState(0)

  useEffect(() => {
    if (!track) return
    let cancelled = false
    void describePhotoCapabilities(track).then((value) => {
      if (!cancelled) setPhoto({ trackId: track.id, value })
    })
    // Capabilities can change shortly after start; refresh the readout.
    const interval = setInterval(() => setTick((tick) => tick + 1), 1000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [track])

  const report = {
    userAgent: navigator.userAgent,
    support: getCameraSupport(),
    track: track && {
      label: track.label,
      readyState: track.readyState,
      settings: track.getSettings(),
      capabilities: track.getCapabilities?.() ?? 'getCapabilities unavailable',
    },
    photoCapabilities: photo?.trackId === track?.id ? photo?.value : 'loading…',
    devices: devices.map((device) => device.label || device.deviceId),
  }
  const text = JSON.stringify(report, null, 2)

  return (
    <div className="absolute inset-x-2 top-2 z-10 max-h-[60%] overflow-auto rounded-lg bg-black/80 p-2 font-mono text-[10px] leading-tight text-green-300 select-text">
      <Button
        variant="secondary"
        size="xs"
        className="float-right"
        onClick={() =>
          navigator.clipboard
            .writeText(text)
            .then(() => toast.success('Diagnostics copied'))
            .catch(() => toast.error("Couldn't copy"))
        }
      >
        <CopyIcon />
        Copy
      </Button>
      <pre className="whitespace-pre-wrap">{text}</pre>
    </div>
  )
}
