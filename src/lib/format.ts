const BYTE_UNITS = ['B', 'KB', 'MB', 'GB'] as const

/** Human-readable size using 1024-based units, e.g. 3_250_000 -> "3.1 MB". */
export const formatBytes = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < BYTE_UNITS.length - 1) {
    value /= 1024
    unit++
  }
  const digits = unit === 0 || value >= 100 ? 0 : 1
  return `${value.toFixed(digits)} ${BYTE_UNITS[unit]}`
}

export const megapixels = (width: number, height: number): number =>
  (width * height) / 1_000_000

/** e.g. 4000×3000 -> "12.0 MP" */
export const formatMegapixels = (width: number, height: number): string =>
  `${megapixels(width, height).toFixed(1)} MP`

/** e.g. 4000, 3000 -> "4000 × 3000" */
export const formatDimensions = (width: number, height: number): string =>
  `${Math.round(width)} × ${Math.round(height)}`
