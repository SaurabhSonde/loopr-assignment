import { useState } from 'react'
import { CheckIcon, PlusIcon, XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { labelColor } from '../lib/colors'
import { MAX_LABEL_LENGTH } from '../lib/editor'

type QuickLabelBarProps = {
  recent: string[]
  currentLabel: string | null
  /** Open straight into the text field (desktop); on touch, chips come first. */
  startTyping: boolean
  onSubmit: (label: string) => void
  onDismiss: () => void
}

/**
 * Labels the box that was just drawn (or picked for renaming). One tap on a
 * recent label is enough; the keyboard only opens for a new one, so it
 * doesn't cover the photo after every box on a phone.
 */
export const QuickLabelBar = ({
  recent,
  currentLabel,
  startTyping,
  onSubmit,
  onDismiss,
}: QuickLabelBarProps) => {
  const [typing, setTyping] = useState(startTyping || recent.length === 0)
  const [value, setValue] = useState(currentLabel ?? '')

  return (
    <div
      role="dialog"
      aria-label="Label this box"
      className="flex w-full max-w-xl flex-col gap-2 rounded-xl border bg-popover/95 p-2 text-popover-foreground shadow-lg backdrop-blur"
    >
      <div className="flex items-center gap-2">
        <p className="flex-1 px-1 text-sm font-medium">
          {currentLabel ? 'Rename box' : 'Label this box'}
        </p>
        <Button
          variant="ghost"
          size="icon"
          className="size-9"
          aria-label="Close"
          onClick={onDismiss}
        >
          <XIcon />
        </Button>
      </div>

      {recent.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {recent.map((label) => (
            <Button
              key={label}
              variant="secondary"
              size="sm"
              className="h-9 rounded-full px-3"
              onClick={() => onSubmit(label)}
            >
              <span
                aria-hidden
                className="size-2.5 rounded-full"
                style={{ backgroundColor: labelColor(label).stroke }}
              />
              {label}
            </Button>
          ))}
          {!typing && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 rounded-full px-3"
              onClick={() => setTyping(true)}
            >
              <PlusIcon />
              New label
            </Button>
          )}
        </div>
      )}

      {typing && (
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            onSubmit(value)
          }}
        >
          <Input
            autoFocus
            aria-label="Label"
            placeholder="Label, e.g. Scratch"
            value={value}
            maxLength={MAX_LABEL_LENGTH}
            enterKeyHint="done"
            autoComplete="off"
            // 16 px text stops iOS from zooming in on focus.
            className="h-10 text-base"
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') onDismiss()
            }}
          />
          <Button type="submit" className="h-10" aria-label="Save label">
            <CheckIcon />
          </Button>
        </form>
      )}
    </div>
  )
}
