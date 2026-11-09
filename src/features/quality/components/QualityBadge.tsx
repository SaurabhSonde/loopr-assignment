import { LoaderCircleIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Severity } from '../lib/assess'
import { SEVERITY_STYLES } from '../lib/severityStyles'

type QualityBadgeProps = {
  severity: Severity
  /** Still measuring sharpness and exposure; the rating isn't final yet. */
  analyzing?: boolean
  className?: string
}

export const QualityBadge = ({
  severity,
  analyzing = false,
  className,
}: QualityBadgeProps) => {
  if (analyzing) {
    return (
      <Badge variant="secondary" className={cn('h-6 px-2.5', className)}>
        <LoaderCircleIcon className="animate-spin" />
        Checking quality…
      </Badge>
    )
  }
  const { label, icon: Icon, className: tone } = SEVERITY_STYLES[severity]
  return (
    <Badge className={cn('h-6 px-2.5', tone, className)}>
      <Icon />
      {label} quality
    </Badge>
  )
}
