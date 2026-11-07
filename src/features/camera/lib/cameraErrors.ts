export type CameraErrorKind =
  | 'permission-denied'
  | 'not-found'
  | 'in-use'
  | 'insecure'
  | 'unsupported'
  | 'disconnected'
  | 'unknown'

export type CameraError = {
  kind: CameraErrorKind
  title: string
  message: string
  /** Whether trying again can plausibly succeed without changing anything else. */
  canRetry: boolean
}

const ERRORS: Record<CameraErrorKind, Omit<CameraError, 'kind'>> = {
  'permission-denied': {
    title: 'Camera access is blocked',
    message:
      'Allow camera access for this site in your browser settings (usually the icon next to the address bar), then try again. You can also upload a photo instead.',
    canRetry: true,
  },
  'not-found': {
    title: 'No camera found',
    message:
      "This device doesn't seem to have a camera available. You can upload a photo instead.",
    canRetry: true,
  },
  'in-use': {
    title: 'Camera is busy',
    message:
      'Another app or browser tab is using the camera. Close it, then try again.',
    canRetry: true,
  },
  insecure: {
    title: 'A secure connection is required',
    message:
      'Browsers only allow camera access on HTTPS pages. Open this app over https:// (or localhost) to use the camera.',
    canRetry: false,
  },
  unsupported: {
    title: "This browser can't use the camera",
    message:
      "Camera access isn't available here (for example in some in-app browsers). Open the page in Chrome or Safari, or upload a photo instead.",
    canRetry: false,
  },
  disconnected: {
    title: 'The camera stopped',
    message:
      'The camera was disconnected or taken over by the system. Try starting it again.',
    canRetry: true,
  },
  unknown: {
    title: "Couldn't start the camera",
    message: 'Something went wrong while starting the camera. Try again.',
    canRetry: true,
  },
}

export const cameraError = (kind: CameraErrorKind): CameraError => ({
  kind,
  ...ERRORS[kind],
})

const KIND_BY_NAME: Record<string, CameraErrorKind> = {
  NotAllowedError: 'permission-denied',
  PermissionDeniedError: 'permission-denied', // legacy Chrome name
  NotFoundError: 'not-found',
  DevicesNotFoundError: 'not-found', // legacy Chrome name
  OverconstrainedError: 'not-found',
  NotReadableError: 'in-use',
  TrackStartError: 'in-use', // legacy Chrome name
  AbortError: 'in-use',
  SecurityError: 'insecure',
  TypeError: 'unsupported',
}

/** Maps a getUserMedia rejection to a user-facing error. */
export const toCameraError = (error: unknown): CameraError => {
  const name =
    error instanceof Error || error instanceof DOMException ? error.name : ''
  return cameraError(KIND_BY_NAME[name] ?? 'unknown')
}
