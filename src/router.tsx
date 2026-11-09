import type { ComponentType } from 'react'
import { createBrowserRouter, Navigate } from 'react-router'
import { RootLayout } from '@/components/RootLayout'
import { RouteError } from '@/components/RouteError'
import CameraScreen from '@/features/camera/CameraScreen'

/** Loads a screen's code only when it's first opened. */
const screen =
  (load: () => Promise<{ default: ComponentType }>) => async () => {
    const { default: Component } = await load()
    return { Component }
  }

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <RouteError />,
    children: [
      // The camera is the entry point, so it ships in the main bundle.
      { index: true, element: <CameraScreen /> },
      {
        path: 'review',
        lazy: screen(() => import('@/features/review/ReviewScreen')),
      },
      {
        path: 'annotate/:photoId',
        lazy: screen(() => import('@/features/annotation/AnnotateScreen')),
      },
      {
        path: 'gallery',
        lazy: screen(() => import('@/features/gallery/GalleryScreen')),
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
