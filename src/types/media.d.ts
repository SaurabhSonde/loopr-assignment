// TypeScript's DOM lib types `torch` on MediaTrackSettings only; the
// Image Capture spec also defines it as a capability and a constraint.
export {}

declare global {
  interface MediaTrackCapabilities {
    torch?: boolean
  }

  interface MediaTrackConstraintSet {
    torch?: ConstrainBoolean
  }
}
