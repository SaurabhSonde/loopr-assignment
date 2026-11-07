import { Link } from 'react-router'
import { buttonVariants } from '@/components/ui/button'

const GalleryScreen = () => (
  <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background p-6 text-foreground">
    <h1 className="text-xl font-semibold">Gallery</h1>
    <Link to="/" className={buttonVariants()}>
      Back to camera
    </Link>
  </main>
)

export default GalleryScreen
