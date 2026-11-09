import { useEffect, useState } from 'react'
import { HardDriveIcon } from 'lucide-react'
import { formatBytes } from '@/lib/format'

type StorageMeterProps = {
  /** Re-measure whenever the number of photos changes. */
  photoCount: number
}

/** How much of the browser's storage allowance the saved photos use. */
export const StorageMeter = ({ photoCount }: StorageMeterProps) => {
  const [estimate, setEstimate] = useState<{
    usage: number
    quota: number
  } | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.resolve(navigator.storage?.estimate?.())
      .then((result) => {
        if (!cancelled && result?.quota) {
          setEstimate({ usage: result.usage ?? 0, quota: result.quota })
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [photoCount])

  if (!estimate) return null
  const percent = Math.min(100, (estimate.usage / estimate.quota) * 100)

  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <HardDriveIcon className="size-4 shrink-0" aria-hidden />
      <div
        role="meter"
        aria-label="Storage used"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${Math.max(percent, 1)}%` }}
        />
      </div>
      <span className="shrink-0 tabular-nums">
        {formatBytes(estimate.usage)} of {formatBytes(estimate.quota)}
      </span>
    </div>
  )
}
