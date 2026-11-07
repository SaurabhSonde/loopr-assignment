import { useEffect, useEffectEvent, useState } from 'react'

export type CameraPermission =
  | 'checking'
  | 'granted'
  | 'prompt'
  | 'denied'
  /** The Permissions API can't report camera access in this browser. */
  | 'unknown'

/**
 * Tracks the camera permission and reports every change, so the camera can
 * start on its own once access is granted, including from browser settings.
 */
export const useCameraPermission = (
  onChange: (permission: CameraPermission) => void,
): CameraPermission => {
  const [permission, setPermission] = useState<CameraPermission>('checking')
  const notify = useEffectEvent(onChange)

  useEffect(() => {
    let status: PermissionStatus | null = null
    let cancelled = false

    const report = (next: CameraPermission) => {
      if (cancelled) return
      setPermission(next)
      notify(next)
    }
    const onStatusChange = () => {
      if (status) report(status.state)
    }

    Promise.resolve()
      .then(() =>
        navigator.permissions.query({ name: 'camera' as PermissionName }),
      )
      .then((result) => {
        status = result
        status.addEventListener('change', onStatusChange)
        report(result.state)
      })
      .catch(() => report('unknown'))

    return () => {
      cancelled = true
      status?.removeEventListener('change', onStatusChange)
    }
  }, [])

  return permission
}
