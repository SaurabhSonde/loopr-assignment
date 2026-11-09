import { useEffect, useReducer, useState } from 'react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router'
import {
  ArrowLeftIcon,
  CopyIcon,
  EyeOffIcon,
  ListIcon,
  Redo2Icon,
  TagIcon,
  Trash2Icon,
  Undo2Icon,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { createId } from '@/lib/id'
import { getObjectUrl } from '@/lib/objectUrl'
import { cn } from '@/lib/utils'
import { usePhotoStore, type Photo } from '@/store/photoStore'
import { AnnotationList } from './components/AnnotationList'
import { AnnotationStage } from './components/AnnotationStage'
import { QuickLabelBar } from './components/QuickLabelBar'
import { useAnnotationShortcuts } from './hooks/useAnnotationShortcuts'
import { useLabelStore } from './labelStore'
import {
  createEditorState,
  editorReducer,
  normalizeLabel,
  type EditorAction,
} from './lib/editor'
import { moveRect, type Rect } from './lib/geometry'
import { canRedo, canUndo } from './lib/history'
import { serializeAnnotations } from './lib/serialize'

const AnnotateScreen = () => {
  const { photoId } = useParams()
  const photo = usePhotoStore((s) => s.photos.find((p) => p.id === photoId))
  const loaded = usePhotoStore((s) => s.loaded)
  if (!photo) {
    // After a reload the saved photos arrive a moment later.
    return loaded ? (
      <Navigate to="/gallery" replace />
    ) : (
      <main className="flex h-dvh items-center justify-center bg-background text-sm text-muted-foreground">
        Loading photo…
      </main>
    )
  }
  // Keyed so switching photos starts a fresh editor (and undo history).
  return <AnnotationEditor key={photo.id} photo={photo} />
}

const AnnotationEditor = ({ photo }: { photo: Photo }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const [state, dispatch] = useReducer(editorReducer, photo.id, (id) =>
    createEditorState(usePhotoStore.getState().annotations[id] ?? []),
  )
  const saveAnnotations = usePhotoStore((s) => s.saveAnnotations)
  const recentLabels = useLabelStore((s) => s.recent)
  const rememberLabel = useLabelStore((s) => s.remember)
  const finePointer = useMediaQuery('(pointer: fine)')
  const [hidden, setHidden] = useState(false)
  const [labelingId, setLabelingId] = useState<string | null>(null)
  const [listOpen, setListOpen] = useState(false)

  const annotations = state.history.present
  const selected = annotations.find((a) => a.id === state.selectedId) ?? null
  const labeling = annotations.find((a) => a.id === labelingId) ?? null

  // Keep the saved copy in sync with every committed edit.
  useEffect(() => {
    saveAnnotations(photo.id, annotations)
  }, [annotations, photo.id, saveAnnotations])

  const undo = () => dispatch({ type: 'undo' })
  const redo = () => dispatch({ type: 'redo' })

  /** Dispatches an edit and offers to undo it from a toast. */
  const undoable = (action: EditorAction, message: string) => {
    dispatch(action)
    toast(message, { action: { label: 'Undo', onClick: undo } })
  }

  const select = (id: string | null) => {
    dispatch({ type: 'select', id })
    if (id !== labelingId) setLabelingId(null)
  }

  const create = (rect: Rect) => {
    const id = createId()
    dispatch({ type: 'add', annotation: { id, label: null, ...rect } })
    setLabelingId(id)
  }

  const change = (id: string, rect: Rect) =>
    dispatch({ type: 'update', id, rect })

  const editLabel = (id: string) => {
    dispatch({ type: 'select', id })
    setLabelingId(id)
    setListOpen(false)
  }

  const submitLabel = (label: string) => {
    if (!labelingId) return
    const normalized = normalizeLabel(label)
    dispatch({ type: 'rename', id: labelingId, label: normalized })
    if (normalized) rememberLabel(normalized)
    setLabelingId(null)
  }

  const remove = (id: string) => {
    if (labelingId === id) setLabelingId(null)
    undoable({ type: 'remove', id }, 'Box deleted')
  }

  const clearAll = () => {
    setLabelingId(null)
    undoable({ type: 'clear' }, 'All boxes cleared')
  }

  const copyJson = async () => {
    const json = serializeAnnotations(photo, annotations)
    try {
      await navigator.clipboard.writeText(JSON.stringify(json, null, 2))
      toast.success(
        `Copied ${annotations.length} ${annotations.length === 1 ? 'box' : 'boxes'} as JSON`,
      )
    } catch {
      toast.error("Couldn't copy to the clipboard")
    }
  }

  useAnnotationShortcuts({
    onDelete: () => selected && remove(selected.id),
    onNudge: (dx, dy) =>
      selected &&
      dispatch({
        type: 'update',
        id: selected.id,
        rect: moveRect(selected, dx, dy, photo),
      }),
    onEscape: () => (labelingId ? setLabelingId(null) : select(null)),
    onUndo: undo,
    onRedo: redo,
    onToggleHidden: () => setHidden((value) => !value),
  })

  const list = (
    <AnnotationList
      annotations={annotations}
      selectedId={state.selectedId}
      onSelect={select}
      onEditLabel={editLabel}
      onDelete={remove}
      onClear={clearAll}
    />
  )

  return (
    <main className="flex h-dvh flex-col bg-background text-foreground">
      <header className="flex items-center gap-1 border-b px-2 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2">
        <Button
          variant="ghost"
          size="icon"
          className="size-11"
          aria-label="Back"
          // Back to wherever the editor was opened from (camera or gallery);
          // the gallery when opened directly from a link.
          onClick={() =>
            location.key === 'default' ? navigate('/gallery') : navigate(-1)
          }
        >
          <ArrowLeftIcon className="size-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold">Annotate</h1>
          <p className="text-xs text-muted-foreground">
            {annotations.length} {annotations.length === 1 ? 'box' : 'boxes'}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-11"
          aria-label="Undo"
          disabled={!canUndo(state.history)}
          onClick={undo}
        >
          <Undo2Icon className="size-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-11"
          aria-label="Redo"
          disabled={!canRedo(state.history)}
          onClick={redo}
        >
          <Redo2Icon className="size-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Hide boxes"
          aria-pressed={hidden}
          className={cn('size-11', hidden && 'bg-muted')}
          onClick={() => setHidden((value) => !value)}
        >
          <EyeOffIcon className="size-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-11"
          aria-label="Copy annotations as JSON"
          onClick={copyJson}
        >
          <CopyIcon className="size-5" />
        </Button>
      </header>

      <div className="flex min-h-0 flex-1">
        <section className="relative min-h-0 min-w-0 flex-1 bg-black p-2">
          <AnnotationStage
            src={getObjectUrl(photo.blob)}
            imageSize={photo}
            annotations={annotations}
            selectedId={state.selectedId}
            hidden={hidden}
            onSelect={select}
            onCreate={create}
            onChange={change}
            onEditLabel={editLabel}
          />
          {annotations.length === 0 && !labeling && (
            <p className="pointer-events-none absolute inset-x-0 bottom-4 mx-auto w-fit rounded-full bg-black/70 px-3 py-1.5 text-sm text-white">
              Drag on the photo to draw a box
            </p>
          )}
          {hidden && (
            <p className="pointer-events-none absolute inset-x-0 bottom-4 mx-auto w-fit rounded-full bg-black/70 px-3 py-1.5 text-sm text-white">
              Boxes hidden · press H or the eye to show
            </p>
          )}
          {labeling && (
            <div className="absolute inset-x-2 bottom-2 flex justify-center">
              <QuickLabelBar
                key={labeling.id}
                recent={recentLabels}
                currentLabel={labeling.label}
                startTyping={finePointer}
                onSubmit={submitLabel}
                onDismiss={() => setLabelingId(null)}
              />
            </div>
          )}
        </section>

        <aside className="hidden w-80 shrink-0 flex-col border-l p-3 lg:flex">
          {list}
        </aside>
      </div>

      <footer className="flex items-center gap-2 border-t px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden">
        {selected ? (
          <>
            <Button
              variant="outline"
              className="h-11 min-w-0"
              onClick={() => editLabel(selected.id)}
            >
              <TagIcon />
              <span className="truncate">{selected.label ?? 'Add label'}</span>
            </Button>
            <Button
              variant="outline"
              className="h-11"
              aria-label="Delete box"
              onClick={() => remove(selected.id)}
            >
              <Trash2Icon />
            </Button>
          </>
        ) : (
          <p className="min-w-0 flex-1 truncate px-1 text-sm text-muted-foreground">
            Tap a box to edit it
          </p>
        )}
        <Drawer open={listOpen} onOpenChange={setListOpen}>
          <DrawerTrigger
            render={<Button variant="outline" className="ml-auto h-11" />}
          >
            <ListIcon />
            Boxes
            <Badge variant="secondary">{annotations.length}</Badge>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader className="sr-only">
              <DrawerTitle>Boxes</DrawerTitle>
              <DrawerDescription>
                Select, rename or delete the boxes on this photo
              </DrawerDescription>
            </DrawerHeader>
            <div className="flex min-h-0 flex-col p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              {list}
            </div>
          </DrawerContent>
        </Drawer>
      </footer>
    </main>
  )
}

export default AnnotateScreen
