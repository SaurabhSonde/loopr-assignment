# Capture & Annotate

A React app that takes the highest-resolution photo the device and browser allow, rates its quality, and lets you draw, label and manage bounding boxes on it. It works on phones, tablets and desktops, with touch, mouse and pen.

- **Live demo:** _to be added_
- **Demo video:** _to be added_
- **Technical notes:** [docs/TECHNICAL_NOTES.md](docs/TECHNICAL_NOTES.md) (capture strategy, quality assessment, annotation approach)

## Features

**Camera and capture**

- Live preview that starts only after an in-context explainer, or on its own once access is granted.
- Full sensor resolution through `ImageCapture.takePhoto()`, with a fallback to a maximum-resolution video frame.
- Picks the **main back lens** automatically, plus a camera picker with readable lens names and a flip button.
- Torch toggle that reflects the camera's real state, and explains itself where torch isn't supported.
- Review, retake, or upload an existing photo.
- Clear recovery for every camera error: permission denied, no camera, camera busy, not HTTPS, unsupported browser, disconnected.

**Quality indicator**

- Good / Fair / Poor rating with resolution, file size, format and source.
- Six checks: resolution, sharpness, brightness, exposure range, contrast and file size. Each check comes with a plain-language fix.
- Poor photos get a "Retake recommended" banner, but never block you from using the photo.
- Analysis runs in a Web Worker, and the thresholds were calibrated on a real phone.

**Annotation**

- **Draw:** drag on the photo; no mode switching.
- **Edit:** select, move, or resize from eight handles; delete with an undo toast.
- **Label:** a quick-label bar with your recent labels as one-tap chips.
- **Manage:** a box list (sidebar on desktop, drawer on phones), hide all boxes, copy the boxes as JSON.
- Undo and redo, plus keyboard shortcuts.
- Pinch, trackpad and button **zoom and pan**.
- Boxes stay aligned with the photo at any size, rotation or zoom; tests verify this.

**Gallery**

- Photos and boxes are saved on the device (IndexedDB) and restored after a reload.
- Thumbnail grid with quality badges and box counts, and delete with confirmation.
- Storage meter and a Light / Dark / System theme toggle.

## Quick start

Requires **Node 24** and npm.

```bash
npm install
npm run dev            # http://localhost:5173 — localhost counts as secure, so the camera works
```

Browsers only allow camera access on HTTPS pages (or localhost). To test on a phone:

| Option                                | Command                                                          | Notes                                                                                                                                                                                       |
| ------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Same Wi-Fi network                    | `npm run dev:https`                                              | Self-signed certificate on your LAN IP; accept the browser warning.                                                                                                                         |
| Any network (Cloudflare quick tunnel) | `npm run dev:tunnel` and, in a second terminal, `npm run tunnel` | Needs [`cloudflared`](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/). Gives a public `https://….trycloudflare.com` URL with a valid certificate. |

Add `?debug` to the camera URL to see what the browser reports about the camera (capabilities, settings, lenses).

### Scripts

| Script                                                  | What it does                                                                                           |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `npm run dev`                                           | Dev server                                                                                             |
| `npm run build`                                         | Typecheck and production build                                                                         |
| `npm run preview`                                       | Serve the production build                                                                             |
| `npm test`                                              | Unit tests (Vitest)                                                                                    |
| `npm run test:e2e`                                      | End-to-end tests (Playwright, Chromium fake camera). Run `npx playwright install chromium` once first. |
| `npm run lint` / `npm run typecheck` / `npm run format` | ESLint / TypeScript / Prettier                                                                         |

CI (GitHub Actions) runs lint, typecheck, unit and E2E tests on every push.

## Tech stack

| Area      | Choice                                                            |
| --------- | ----------------------------------------------------------------- |
| Framework | React 19 (with React Compiler), TypeScript 6, Vite 8              |
| UI        | Tailwind CSS 4, shadcn/ui on Base UI, Lucide icons, Sonner toasts |
| Routing   | React Router 8 (data router; screens load on demand)              |
| State     | Zustand, plus pure reducers for the editor                        |
| Storage   | IndexedDB via `idb`                                               |
| Tests     | Vitest + Testing Library (jsdom), `fake-indexeddb`, Playwright    |

## Project structure

```
src/
  features/
    camera/       camera session, capture strategy, torch, lens selection, permission flow
    quality/      pixel metrics, thresholds, assessment, Web Worker, quality UI
    review/       review screen (preview, quality, retake / use)
    annotation/   geometry, history, editor reducer, zoom, pointer interaction, editor UI
    gallery/      gallery screen, photo cards, storage meter
  store/          photo library (pending capture, saved photos, annotations, persistence)
  lib/            shared helpers (IndexedDB, image decoding, thumbnails, formatting)
  components/     app-level components; components/ui is generated by shadcn
e2e/              Playwright specs
docs/             technical notes
```

Each feature keeps its logic in `lib/` as pure, unit-tested functions. Hooks connect that logic to React, and components only render. Browser APIs (camera, IndexedDB, canvas) sit behind small modules, so the logic stays testable.

## Implementation decisions

The [technical notes](docs/TECHNICAL_NOTES.md) explain each of these in detail.

| Decision                                     | Why                                                                                                                                                   |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `takePhoto()` first, video frame as fallback | It gives full sensor resolution where supported (Chromium, Safari 18.4+), while every browser can still capture.                                      |
| Adaptive stream resolution                   | When `takePhoto()` captures the photo, a ~1080p preview is enough and smoother. When the frame _is_ the photo, the stream is raised to its maximum.   |
| Probe for the main back camera               | On multi-lens Android phones, `facingMode: 'environment'` often opens a secondary lens with no flash (seen on a Samsung S24).                         |
| Torch state read back from the track         | `advanced` constraints never reject, so the track's settings are the only proof the torch changed.                                                    |
| Blur-effect sharpness on a 640 px copy       | The first measure, Laplacian variance at a finer scale, rated a visibly shaken S24 photo as sharp because of sensor grain. Calibrated on real photos. |
| SVG overlay in the photo's pixel coordinates | Alignment holds by construction at any size, rotation or zoom; nothing is recalculated.                                                               |
| Modeless editing, two fingers for zoom       | Fewer taps on a phone; the second finger never collides with drawing.                                                                                 |
| Delete from storage before updating the UI   | A reload or a closed tab can't bring a deleted photo back.                                                                                            |
| View transitions tried, then dropped         | Chrome doesn't deliver input during a transition, so a drag right after opening the editor was lost.                                                  |

## Quality thresholds

The pixel metrics are measured on a copy of the photo shrunk to 640 px on its longest side, using high-quality averaging.

| Check                                | Good      | Fair                   | Poor          |
| ------------------------------------ | --------- | ---------------------- | ------------- |
| Resolution                           | ≥ 8 MP    | 2–8 MP                 | < 2 MP        |
| Sharpness (blur-effect score, 0–100) | ≥ 70      | 60–69                  | < 60          |
| Brightness (mean luma, 0–255)        | 70–190    | 45–70 or 190–215       | < 45 or > 215 |
| Exposure range (clipped pixels)      | ≤ 5 %     | ≤ 15 %                 | > 15 %        |
| Contrast (luma std. dev.)            | ≥ 40      | 20–40                  | < 20          |
| File size                            | 0.5–15 MB | 150–500 KB, or > 15 MB | < 150 KB      |

The overall rating is the worst individual check. On a Samsung S24, sharp hand-held photos scored 77–79 for sharpness and a visibly shaken one scored 58.

## Browser support

| Browser                                       | Capture                                                      | Torch        | Tested                    |
| --------------------------------------------- | ------------------------------------------------------------ | ------------ | ------------------------- |
| Chrome on Android                             | `takePhoto()` at full resolution (S24: 4080 × 3060, 12.5 MP) | Yes          | Real device (Samsung S24) |
| Safari on iOS 18.4+                           | `takePhoto()`                                                | iOS 18+      | Not tested on a device    |
| Safari on older iOS, Firefox, in-app browsers | Video frame at the stream's maximum                          | No           | Via the fallback path     |
| Desktop Chrome / Edge                         | `takePhoto()` or video frame (webcam maximum)                | No (webcams) | Playwright, fake camera   |

## Testing

- **Unit tests (123, Vitest):**
  - capture strategy and fallbacks, constraints, camera error mapping, torch detection, main-lens selection
  - quality metrics and assessment, including the resolution advice
  - box geometry, undo/redo history, the editor reducer, zoom math, JSON export
  - store persistence against `fake-indexeddb`
- **E2E (10 specs × desktop and Pixel 7 = 20 runs, Playwright with Chromium's fake camera):**
  - capture, review and retake; explainer, permission denied and upload fallback
  - drawing, labeling, resizing, undo, delete with undo
  - **box alignment after a device rotation**
  - **drawing accuracy at 225 % zoom**
  - reload round trip and gallery delete

  These cover the camera and editor UI flows; there are no separate component tests.

## Known limitations

- **Torch support** depends on the browser. Chrome on Android and Safari on iOS 18+ support it; Firefox and desktop webcams don't.
- **Firefox, older iOS and in-app browsers** have no `takePhoto()`, so they capture at video-stream resolution (often 1080p–4K).
- **Browsers see only the cameras Android exposes to apps.** The S24 shows 2 back and 2 front of its 3 + 1 lenses. High-megapixel sensors are capped at their binned output (S24: 12.5 MP from a 50 MP sensor); the full-resolution mode needs an Android camera request no web API exposes.
- **Sharpness is a heuristic.** It was calibrated on one phone, and scenes with large intentionally soft areas (for example, a blurred background) can score lower than they look.
- **Storage:** Safari may evict data from sites not visited for 7 days (the app requests persistent storage to reduce this). In private browsing, photos are kept in memory until the tab closes. Undo history doesn't survive a reload.
- **Uploads** must be in a format the browser can decode (HEIC works in Safari, not in Chrome).
- **Not built:** live quality hints on the viewfinder before capture.
