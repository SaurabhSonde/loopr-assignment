import { isRouteErrorResponse, Link, useRouteError } from 'react-router'
import { buttonVariants } from '@/components/ui/button'

export const RouteError = () => {
  const error = useRouteError()
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'Unknown error'

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="max-w-md text-sm text-muted-foreground">{message}</p>
      <Link to="/" className={buttonVariants()}>
        Back to camera
      </Link>
    </main>
  )
}
