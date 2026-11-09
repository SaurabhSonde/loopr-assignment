import { PencilIcon, Trash2Icon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { labelColor } from '../lib/colors'
import type { Annotation } from '../lib/editor'

type AnnotationListProps = {
  annotations: Annotation[]
  selectedId: string | null
  onSelect: (id: string) => void
  onEditLabel: (id: string) => void
  onDelete: (id: string) => void
  onClear: () => void
}

/** Every box on the photo: select, rename or delete it, or clear them all. */
export const AnnotationList = ({
  annotations,
  selectedId,
  onSelect,
  onEditLabel,
  onDelete,
  onClear,
}: AnnotationListProps) => {
  const unlabeled = annotations.filter((annotation) => !annotation.label).length

  return (
    <section aria-labelledby="boxes-heading" className="flex min-h-0 flex-col">
      <div className="flex items-center gap-2 px-1 pb-2">
        <h2 id="boxes-heading" className="text-base font-semibold">
          Boxes
        </h2>
        <Badge variant="secondary">{annotations.length}</Badge>
        {unlabeled > 0 && (
          <span className="text-xs text-amber-600 dark:text-amber-400">
            {unlabeled} unlabeled
          </span>
        )}
        {annotations.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            onClick={onClear}
          >
            Clear all
          </Button>
        )}
      </div>

      {annotations.length === 0 ? (
        <p className="px-1 py-6 text-center text-sm text-muted-foreground">
          No boxes yet. Drag on the photo to draw one.
        </p>
      ) : (
        <ul className="-mx-1 min-h-0 space-y-0.5 overflow-y-auto">
          {annotations.map((annotation) => {
            const selected = annotation.id === selectedId
            const name = annotation.label ?? 'Unlabeled'
            return (
              <li
                key={annotation.id}
                className={cn(
                  'flex items-center gap-1 rounded-lg pr-1',
                  selected && 'bg-muted',
                )}
              >
                <button
                  type="button"
                  aria-pressed={selected}
                  className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => onSelect(annotation.id)}
                >
                  <span
                    aria-hidden
                    className="size-3 shrink-0 rounded-full"
                    style={{
                      backgroundColor: labelColor(annotation.label).stroke,
                    }}
                  />
                  <span
                    className={cn(
                      'truncate text-sm',
                      !annotation.label && 'text-muted-foreground italic',
                    )}
                  >
                    {name}
                  </span>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground tabular-nums">
                    {Math.round(annotation.width)} ×{' '}
                    {Math.round(annotation.height)}
                  </span>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-9"
                  aria-label={`Rename ${name}`}
                  onClick={() => onEditLabel(annotation.id)}
                >
                  <PencilIcon />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-9"
                  aria-label={`Delete ${name}`}
                  onClick={() => onDelete(annotation.id)}
                >
                  <Trash2Icon />
                </Button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
