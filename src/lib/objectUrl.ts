// One object URL per blob, created on first use and revoked explicitly when
// the blob is discarded. Safe to call during render (idempotent), unlike
// creating URLs in effects, which StrictMode would revoke and leave dangling.
const urls = new WeakMap<Blob, string>()

export const getObjectUrl = (blob: Blob): string => {
  let url = urls.get(blob)
  if (!url) {
    url = URL.createObjectURL(blob)
    urls.set(blob, url)
  }
  return url
}

export const revokeObjectUrl = (blob: Blob) => {
  const url = urls.get(blob)
  if (!url) return
  URL.revokeObjectURL(url)
  urls.delete(blob)
}
