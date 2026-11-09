import { useEffect } from 'react'
import { ThemeProvider, useTheme } from 'next-themes'
import { Outlet, useLocation } from 'react-router'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { usePhotoStore } from '@/store/photoStore'

// Camera, review and annotate always use dark chrome so photos are judged
// against a neutral background; everything else follows the user's theme.
const DARK_ROUTES = [/^\/$/, /^\/review$/, /^\/annotate\//]

const isDarkRoute = (pathname: string) =>
  DARK_ROUTES.some((pattern) => pattern.test(pathname))

const ThemedToaster = () => {
  const { forcedTheme, theme } = useTheme()
  const resolved = (forcedTheme ?? theme) as 'light' | 'dark' | 'system'
  return <Toaster theme={resolved} position="top-center" />
}

export const RootLayout = () => {
  const { pathname } = useLocation()

  // Read saved photos once the toaster is mounted, so storage warnings show.
  useEffect(() => {
    void usePhotoStore.getState().load()
  }, [])

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      forcedTheme={isDarkRoute(pathname) ? 'dark' : undefined}
    >
      <TooltipProvider>
        <Outlet />
        <ThemedToaster />
      </TooltipProvider>
    </ThemeProvider>
  )
}
