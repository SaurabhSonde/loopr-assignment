import { useEffect, useEffectEvent } from 'react'

type Shortcuts = {
  onDelete: () => void
  onNudge: (dx: number, dy: number) => void
  onEscape: () => void
  onUndo: () => void
  onRedo: () => void
  onToggleHidden: () => void
}

const NUDGE: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
}

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))

/**
 * Editor keyboard shortcuts: Delete/Backspace, arrows to nudge (Shift for
 * 10 px), Esc, Cmd/Ctrl+Z to undo, Shift+Cmd/Ctrl+Z or Ctrl+Y to redo, H to
 * hide boxes. Ignored while typing in a field.
 */
export const useAnnotationShortcuts = (shortcuts: Shortcuts) => {
  const handleKey = useEffectEvent((event: KeyboardEvent) => {
    if (isTyping(event.target)) return
    const mod = event.metaKey || event.ctrlKey
    const key = event.key

    if (mod && key.toLowerCase() === 'z') {
      event.preventDefault()
      if (event.shiftKey) shortcuts.onRedo()
      else shortcuts.onUndo()
    } else if (mod && key.toLowerCase() === 'y') {
      event.preventDefault()
      shortcuts.onRedo()
    } else if (key === 'Delete' || key === 'Backspace') {
      event.preventDefault()
      shortcuts.onDelete()
    } else if (key in NUDGE && !mod) {
      event.preventDefault()
      const [dx, dy] = NUDGE[key]
      const step = event.shiftKey ? 10 : 1
      shortcuts.onNudge(dx * step, dy * step)
    } else if (key === 'Escape') {
      shortcuts.onEscape()
    } else if (key.toLowerCase() === 'h' && !mod && !event.altKey) {
      shortcuts.onToggleHidden()
    }
  })

  useEffect(() => {
    const listener = (event: KeyboardEvent) => handleKey(event)
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [])
}
