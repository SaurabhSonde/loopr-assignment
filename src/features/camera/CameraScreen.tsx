import { Link } from 'react-router'
import { buttonVariants } from '@/components/ui/button'

const CameraScreen = () => (
  <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background p-6 text-foreground">
    <h1 className="text-xl font-semibold">Camera</h1>
    <Link to="/gallery" className={buttonVariants({ variant: 'outline' })}>
      Gallery
    </Link>
  </main>
)

export default CameraScreen
