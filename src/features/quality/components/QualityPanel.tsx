import { Skeleton } from '@/components/ui/skeleton'
import { formatBytes, formatDimensions, formatMegapixels } from '@/lib/format'
import { CAPTURE_METHOD_LABELS, type CapturedImage } from '@/lib/image'
import { cn } from '@/lib/utils'
import type { QualityReport } from '../lib/assess'
import { SEVERITY_STYLES } from '../lib/severityStyles'
import { QualityBadge } from './QualityBadge'

const formatName = (mimeType: string) =>
  mimeType
    .replace(/^image\//, '')
    .replace('jpeg', 'jpg')
    .toUpperCase()

type QualityPanelProps = {
  image: CapturedImage
  report: QualityReport
  analyzing: boolean
  analysisFailed: boolean
}

/** Image facts plus every quality check, with what to do about each problem. */
export const QualityPanel = ({
  image,
  report,
  analyzing,
  analysisFailed,
}: QualityPanelProps) => (
  <section aria-labelledby="quality-heading" className="space-y-4">
    <div className="flex items-center justify-between gap-3">
      <h2 id="quality-heading" className="text-base font-semibold">
        Image quality
      </h2>
      <QualityBadge severity={report.overall} analyzing={analyzing} />
    </div>

    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg bg-muted/50 p-3 text-sm">
      {[
        ['Resolution', formatDimensions(image.width, image.height)],
        ['Megapixels', formatMegapixels(image.width, image.height)],
        ['File size', formatBytes(image.size)],
        ['Format', formatName(image.mimeType)],
      ].map(([term, value]) => (
        <div key={term}>
          <dt className="text-xs text-muted-foreground">{term}</dt>
          <dd className="font-medium tabular-nums">{value}</dd>
        </div>
      ))}
      <div className="col-span-2">
        <dt className="text-xs text-muted-foreground">Source</dt>
        <dd className="font-medium">
          {CAPTURE_METHOD_LABELS[image.captureMethod]}
        </dd>
      </div>
    </dl>

    <ul className="divide-y divide-border">
      {report.checks.map((check) => {
        const { icon: Icon, className: tone } = SEVERITY_STYLES[check.severity]
        return (
          <li key={check.id} className="flex gap-3 py-3">
            <span
              className={cn(
                'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full',
                tone,
              )}
            >
              <Icon className="size-3.5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-medium">
                  {check.label}
                  <span className="sr-only">
                    : {SEVERITY_STYLES[check.severity].label}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {check.value}
                </p>
              </div>
              <p className="text-sm">{check.summary}</p>
              {check.tip && (
                <p className="text-sm text-muted-foreground">{check.tip}</p>
              )}
            </div>
          </li>
        )
      })}
      {analyzing && (
        <li
          className="space-y-2 py-3"
          aria-label="Analyzing sharpness and exposure"
        >
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-2/3" />
        </li>
      )}
    </ul>

    {analysisFailed && (
      <p className="text-sm text-muted-foreground">
        Sharpness and exposure couldn't be analyzed in this browser; only
        resolution and file size were checked.
      </p>
    )}
  </section>
)
