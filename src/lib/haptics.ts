/** A short vibration as tactile feedback (Android; a no-op elsewhere). */
export const tapFeedback = () => {
  navigator.vibrate?.(12)
}
