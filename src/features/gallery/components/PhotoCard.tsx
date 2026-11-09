import { useState } from 'react'
import { Link } from 'react-router'
import { SquareDashedIcon, Trash2Icon } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { QualityBadge } from '@/features/quality/components/QualityBadge'
import { formatDateTime } from '@/lib/format'
import { getObjectUrl } from '@/lib/objectUrl'
import type { Photo } from '@/store/photoStore'

type PhotoCardProps = {
  photo: Photo
  boxCount: number
  onDelete: (id: string) => void
}

export const PhotoCard = ({ photo, boxCount, onDelete }: PhotoCardProps) => {
  const [confirming, setConfirming] = useState(false)
  const taken = formatDateTime(photo.capturedAt)
  const boxes = `${boxCount} ${boxCount === 1 ? 'box' : 'boxes'}`

  return (
    <li className="relative overflow-hidden rounded-xl border bg-card text-card-foreground">
      <Link
        to={`/annotate/${photo.id}`}
        aria-label={`Photo from ${taken}, ${boxes}`}
        className="block outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="relative aspect-square bg-muted">
          {photo.thumbBlob ? (
            <img
              src={getObjectUrl(photo.thumbBlob)}
              alt=""
              loading="lazy"
              className="size-full object-cover"
            />
          ) : (
            <Skeleton className="size-full rounded-none" />
          )}
          {photo.quality && (
            <QualityBadge
              severity={photo.quality.overall}
              // Solid backing so it stays readable on any photo.
              className="absolute bottom-2 left-2 bg-black/70 text-white shadow-sm backdrop-blur dark:text-white"
            />
          )}
        </div>
        <div className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
          <span className="truncate text-muted-foreground">{taken}</span>
          <span className="flex shrink-0 items-center gap-1 font-medium">
            <SquareDashedIcon className="size-3.5" aria-hidden />
            {boxCount}
          </span>
        </div>
      </Link>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Delete photo from ${taken}`}
              className="absolute top-2 right-2 size-9 rounded-full bg-black/55 text-white backdrop-blur hover:bg-black/75 hover:text-white"
            />
          }
        >
          <Trash2Icon />
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this photo?</AlertDialogTitle>
            <AlertDialogDescription>
              The photo and its {boxes} will be removed from this device. This
              can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                setConfirming(false)
                onDelete(photo.id)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  )
}
