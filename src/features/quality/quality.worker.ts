import { measureImage } from './lib/measureImage'

export type QualityWorkerResponse =
  | { ok: true; metrics: Awaited<ReturnType<typeof measureImage>> }
  | { ok: false; error: string }

self.addEventListener('message', async (event: MessageEvent<Blob>) => {
  let response: QualityWorkerResponse
  try {
    response = { ok: true, metrics: await measureImage(event.data) }
  } catch (error) {
    response = { ok: false, error: String(error) }
  }
  self.postMessage(response)
})
