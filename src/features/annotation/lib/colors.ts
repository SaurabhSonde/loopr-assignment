/** Saturated colors that stand out on photos, each with readable chip text. */
const PALETTE = [
  { stroke: '#f43f5e', text: '#ffffff' }, // rose
  { stroke: '#f59e0b', text: '#1c1917' }, // amber
  { stroke: '#22c55e', text: '#052e16' }, // green
  { stroke: '#3b82f6', text: '#ffffff' }, // blue
  { stroke: '#a855f7', text: '#ffffff' }, // purple
  { stroke: '#f97316', text: '#1c1917' }, // orange
  { stroke: '#06b6d4', text: '#083344' }, // cyan
  { stroke: '#84cc16', text: '#1a2e05' }, // lime
] as const

export type LabelColor = { stroke: string; text: string }

/** Unlabeled boxes are neutral (and drawn dashed). */
export const UNLABELED_COLOR: LabelColor = {
  stroke: '#f5f5f5',
  text: '#171717',
}

/** FNV-1a: a small, stable string hash. */
const hash = (text: string) => {
  let value = 2166136261
  for (const char of text) {
    value ^= char.codePointAt(0) ?? 0
    value = Math.imul(value, 16777619)
  }
  return value >>> 0
}

/** The same label always gets the same color, on every photo. */
export const labelColor = (label: string | null): LabelColor =>
  label ? PALETTE[hash(label.toLowerCase()) % PALETTE.length] : UNLABELED_COLOR
