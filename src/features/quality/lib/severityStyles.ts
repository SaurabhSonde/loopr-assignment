import {
  CircleCheckIcon,
  OctagonXIcon,
  TriangleAlertIcon,
  type LucideIcon,
} from 'lucide-react'
import type { Severity } from './assess'

/** Each rating pairs a color with an icon and a word, never color alone. */
export const SEVERITY_STYLES: Record<
  Severity,
  { label: string; icon: LucideIcon; className: string }
> = {
  good: {
    label: 'Good',
    icon: CircleCheckIcon,
    className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  },
  fair: {
    label: 'Fair',
    icon: TriangleAlertIcon,
    className: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  },
  poor: {
    label: 'Poor',
    icon: OctagonXIcon,
    className: 'bg-red-500/15 text-red-700 dark:text-red-400',
  },
}
