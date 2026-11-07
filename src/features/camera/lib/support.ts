export type CameraSupport = {
  /** getUserMedia only exists on HTTPS pages and localhost. */
  secureContext: boolean
  getUserMedia: boolean
  /** Full-resolution stills via ImageCapture.takePhoto() (Chromium, Safari 18.4+). */
  imageCapture: boolean
}

export const getCameraSupport = (): CameraSupport => ({
  secureContext: window.isSecureContext,
  getUserMedia: typeof navigator.mediaDevices?.getUserMedia === 'function',
  imageCapture: 'ImageCapture' in window,
})
