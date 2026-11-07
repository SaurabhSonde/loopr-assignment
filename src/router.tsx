import { createBrowserRouter, Navigate } from 'react-router'
import { RootLayout } from '@/components/RootLayout'
import { RouteError } from '@/components/RouteError'
import CameraScreen from '@/features/camera/CameraScreen'
import ReviewScreen from '@/features/review/ReviewScreen'
import GalleryScreen from '@/features/gallery/GalleryScreen'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <CameraScreen /> },
      { path: 'review', element: <ReviewScreen /> },
      {
        path: 'annotate/:photoId',
        // The editor is the heaviest screen; keep it out of the initial bundle.
        lazy: async () => {
          const { default: Component } =
            await import('@/features/annotation/AnnotateScreen')
          return { Component }
        },
      },
      { path: 'gallery', element: <GalleryScreen /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
