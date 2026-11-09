import { Link } from 'react-router'
import { toast } from 'sonner'
import { CameraIcon, ImagesIcon, TriangleAlertIcon } from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'
import { buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { usePhotoStore } from '@/store/photoStore'
import { PhotoCard } from './components/PhotoCard'
import { StorageMeter } from './components/StorageMeter'

const GalleryScreen = () => {
  const photos = usePhotoStore((s) => s.photos)
  const annotations = usePhotoStore((s) => s.annotations)
  const loaded = usePhotoStore((s) => s.loaded)
  const persistence = usePhotoStore((s) => s.persistence)
  const deletePhoto = usePhotoStore((s) => s.deletePhoto)

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold">Gallery</h1>
            <p className="text-xs text-muted-foreground">
              {loaded
                ? `${photos.length} ${photos.length === 1 ? 'photo' : 'photos'}`
                : 'Loading…'}
            </p>
          </div>
          <ThemeToggle />
          <Link to="/" className={cn(buttonVariants(), 'h-11 px-4')}>
            <CameraIcon />
            Camera
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-4 px-4 py-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {persistence === 'memory' ? (
          <p className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            <TriangleAlertIcon className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
            Storage is unavailable in this browser, so photos are kept only
            until you close this tab.
          </p>
        ) : (
          <StorageMeter photoCount={photos.length} />
        )}

        {!loaded ? (
          <ul
            aria-label="Loading photos"
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
          >
            {Array.from({ length: 4 }, (_, index) => (
              <li key={index}>
                <Skeleton className="aspect-square rounded-xl" />
              </li>
            ))}
          </ul>
        ) : photos.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-muted">
              <ImagesIcon className="size-7 text-muted-foreground" />
            </div>
            <h2 className="text-base font-semibold">No photos yet</h2>
            <p className="max-w-xs text-sm text-muted-foreground">
              Photos you keep after capturing appear here, with their boxes.
            </p>
            <Link to="/" className={cn(buttonVariants(), 'h-11 px-4')}>
              <CameraIcon />
              Take a photo
            </Link>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {photos.map((photo) => (
              <PhotoCard
                key={photo.id}
                photo={photo}
                boxCount={annotations[photo.id]?.length ?? 0}
                onDelete={async (id) => {
                  if (await deletePhoto(id)) toast('Photo deleted')
                }}
              />
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}

export default GalleryScreen
