# Technical notes

How the app captures photos, judges their quality and keeps annotations aligned. File references point to `src/`.

**Live app:** https://loopr-assignment.vercel.app. Open it on a phone for the rear camera and torch. Setup and scripts are in the [README](../README.md).

## 1. Image capture strategy

### A fallback ladder

Every browser can take a photo; each one uses the best method it supports (`features/camera/lib/capture.ts`):

1. **`ImageCapture.takePhoto()`** at the maximum `imageWidth` / `imageHeight` from `getPhotoCapabilities()`.
   - This is a real still from the camera hardware at full sensor resolution, available in Chromium and Safari 18.4+.
   - The returned JPEG is stored byte-for-byte: no re-encoding, so no extra compression loss, and EXIF is kept.
2. **A frame from the live stream**, drawn on a canvas and encoded as JPEG at quality 0.95.
   - Used when `takePhoto()` is missing (Firefox, older iOS, in-app browsers), when it throws, when it hangs (8 s timeout), or when it returns something smaller than the video frame.
   - Before grabbing the frame, the stream is raised to the camera's maximum resolution (see below), and the app waits for the larger frames to arrive.
3. **Upload.** If the camera can't be used at all (permission denied, no camera, not HTTPS), an existing photo goes through the same review and quality flow.

If `takePhoto()` fails once, the session remembers it and later captures go straight to the maximum-resolution stream.

### Adaptive stream resolution

`features/camera/lib/constraints.ts` builds the stream request:

- **When `takePhoto()` will capture the still:** the preview only needs to look good, so it asks for about 1920 × 1440. That's 4:3, matching phone sensors, so the preview frames exactly what the photo will contain. It also runs smoother and cooler than a 4K stream.
- **When the video frame _is_ the photo:** it asks for 4096 × 3072, then calls `applyConstraints` up to `getCapabilities().width.max` / `height.max`.

`atDeviceMax` records whether the result is the largest the camera can produce. The quality check uses it so it never recommends a retake that can't produce a bigger image.

### Choosing the main back lens

On multi-lens Android phones, `facingMode: 'environment'` often opens a secondary lens: an ultra-wide with no flash, worse focus and lower resolution. On a Samsung S24 the torch only worked after switching cameras by hand. `features/camera/lib/mainCamera.ts` fixes this:

1. Once permission is granted (device labels only appear then), each back camera is opened briefly, one at a time, because phones can't open two at once.
2. Each one reports its photo and stream resolution and whether it has a flash.
3. The pick is ranked: flash first, then resolution, then a general-purpose lens over iOS's named Ultra Wide or Telephoto, then Android's numbering.
4. The result is remembered per set of cameras, so this happens once. Later starts open the main lens directly.

A camera picked by hand from the menu always wins over the automatic choice.

Browsers can only use the cameras Android exposes to apps. The S24 shows 2 back and 2 front cameras for its 3 + 1 physical lenses. High-megapixel sensors are capped at their binned output: the S24's 50 MP sensor gives 12.5 MP (4080 × 3060), which is also what Samsung's own camera app uses by default.

### Torch

`features/camera/hooks/useTorch.ts` handles the torch:

- **Detection is asynchronous.** Chrome on Android fills in the `torch` capability only after the photo capabilities have been fetched, so the hook calls `getPhotoCapabilities()`, then re-checks a few times over about 2.5 s. Until then the button shows a neutral "checking" state.
- **Its state is read back, not assumed.** `applyConstraints({ advanced: [{ torch }] })` resolves even when the camera ignores it, so after every change the button shows `track.getSettings().torch`.
- **It survives a retake.** The choice is remembered for the session and re-applied when the stream restarts.
- **When unsupported**, the button stays in place, dimmed, with a tooltip (or a toast on tap) explaining why, instead of disappearing.

### Lifecycle and errors

The camera session (`features/camera/lib/cameraSession.ts`) is a plain closure-based controller outside React:

- A generation counter discards starts that a newer start or stop has replaced. This matters with fast flips and with StrictMode mounting effects twice.
- The camera is released after capture, when navigating away, on `pagehide` and while the tab is hidden, and restarts when the tab is visible again.
- Every `getUserMedia` failure becomes a typed error with a title, an explanation and the right recovery: retry, upload, or "open over HTTPS".
- Permission is requested in context. A first visit shows an explainer; once access has been granted the camera starts on its own. The Permissions API `change` event recovers without a reload when the user allows access in browser settings.

## 2. Image quality assessment

### What's measured

- **Metadata:** resolution in megapixels and file size.
- **Pixel metrics** (`features/quality/lib/metrics.ts`), on a copy shrunk to 640 px on its longest side:
  - **Brightness:** mean luma (Rec. 601), 0–255.
  - **Contrast:** standard deviation of luma.
  - **Exposure range:** the share of near-black (≤ 5) and near-white (≥ 250) pixels, reported separately so the advice can name the problem (crushed shadows versus blown highlights).
  - **Sharpness:** the blur-effect metric (Crété-Roffet et al., 2007; also scikit-image's `blur_effect`), shown as 0–100. It re-blurs the image with an 11-pixel box filter along each axis and measures how much pixel-to-pixel detail that removes. Re-blurring a sharp image changes it a lot; re-blurring an already blurry one barely does. Because it's a ratio it doesn't depend on the scene's contrast, and taking the worse axis catches one-directional camera shake.

Decoding and measuring run in a Web Worker with `OffscreenCanvas`, with a main-thread fallback, so a 12 MP decode never freezes the UI. Resolution and file size appear immediately; the pixel checks follow within about a second.

### Thresholds

All thresholds live in `features/quality/lib/thresholds.ts`, and the README lists them. The overall rating is the worst individual check, so any problem is visible.

**Calibrating sharpness on real photos:**

| Attempt                                                     | Sharp shot | Shaken shot | Verdict                                                                                       |
| ----------------------------------------------------------- | ---------- | ----------- | --------------------------------------------------------------------------------------------- |
| Laplacian variance at 640 px (low-quality shrink)           | 5533       | 1140        | Content-dependent; a "blurry" shot of a busy, high-contrast subject still passed.             |
| Blur effect on a 1024 px center crop                        | 79         | **84**      | The shaken photo scored _sharper_: S24 sensor grain survives a 2× shrink and reads as detail. |
| **Blur effect, whole photo at 640 px, high-quality shrink** | **79**     | **58**      | Averaging cancels the grain while visible blur remains. **Chosen.**                           |

A temporary on-screen table on the review screen measured both photos under seven setups at once to choose between them. Synthetic Gaussian-like blur gives about 63 (light) and 47 (medium). The cut-offs are **Good ≥ 70, Fair ≥ 60, Poor < 60**.

A related finding: in normal light the S24's fast shutter, optical stabilization and zero-shutter-lag capture make shake blur hard to produce at all. Only vigorous shaking (which gives ghosted, multi-frame blur) fails the check.

### Feedback

- Every non-good check carries an action. "Too dark" suggests adding light or using the torch; "Blown-out highlights" suggests avoiding glare.
- The resolution advice depends on the source:
  - at the camera's maximum: "the highest resolution the browser can get from this camera"
  - below it: retake
  - an upload: use the original file
- A **Poor** rating shows a "Retake recommended" banner listing the failures, and makes Retake the primary button. "Use anyway" stays available, because heuristics can be wrong, and a dark scene may be intentional.

## 3. Annotation approach

### Coordinates that can't drift

- Boxes are stored in the **photo's own pixels**, for example `{ x: 1200, y: 800, width: 900, height: 600 }` on a 4080 × 3060 image (`features/annotation/lib/editor.ts`).
- The stage renders the `<img>` and an `<svg viewBox="0 0 W H" preserveAspectRatio="none">` in the same box, sized like `object-fit: contain` by a ResizeObserver.
- Because the SVG's coordinate system _is_ the photo's pixel grid, stretched exactly over the image, boxes stay aligned through window resizes, rotation and zoom without recalculating anything.
- Outlines use `vector-effect: non-scaling-stroke`, and handles and label chips are sized in screen pixels, so they stay the same on-screen size at any zoom.

An E2E test checks the invariant directly. After a simulated device rotation, the overlay must sit within 0.5 px of the photo, its grid must equal the photo's pixel size, and the box must cover the same part of the photo.

### Interaction

`features/annotation/hooks/useStageInteraction.ts` is a pointer-event state machine with no modes. Mouse, touch and pen all go through the same code.

- A drag on empty space **draws**; a tap there deselects.
- A press on a box selects it, and dragging **moves** it.
- Eight handles **resize**. Dragging a handle past the opposite edge flips the box instead of making its size negative, because every frame is computed from the box as it was at the start of the gesture.
- A 4 px movement threshold separates taps from drags, and boxes smaller than 8 screen pixels are discarded as accidental.
- `setPointerCapture` keeps a drag alive when the pointer leaves the box. Smaller boxes are drawn on top so they stay reachable, with the selected box above all.
- Pointer positions are converted with the stage's `getBoundingClientRect()`. That's the same coordinate space as pointer events, and it includes CSS zoom. (`getScreenCTM()` disagreed with it under page pinch-zoom, which an E2E test exposed.)
- A **second finger cancels** the current gesture and hands over to zoom.

### Zoom and pan

`features/annotation/hooks/useZoomPan.ts` and `lib/zoom.ts`:

- Zoom is a CSS transform on the fitted photo and overlay together.
- **Two fingers** pinch and pan at once: the photo point between the fingers follows their midpoint.
- **Trackpad pinch and Ctrl+wheel** zoom at the cursor; plain scrolling pans while zoomed.
- **Buttons** (−, level, +, Fit) and the **+, −, 0 keys**.
- The view is re-clamped on every render: centered while it fits, no gaps at the edges once zoomed, and still correct after rotation.
- An E2E test draws at 225 % and checks that the stored box matches the photo pixels under the pointer to within one screen pixel.

### Editing model

- `editorReducer` is pure and wrapped in an undo/redo history: per photo, kept for the session, up to 100 steps.
- A gesture dispatches **once, when it ends**, so one undo reverts a whole drag rather than each pixel. Edits that change nothing aren't recorded.
- **Labels:** after drawing, a quick-label bar appears. Recent labels (remembered across photos) are one-tap chips, and the keyboard only opens for a new label, so it doesn't cover the photo after every box. Each label gets a stable color from a hash of its text. Unlabeled boxes are dashed and counted in the list.
- **Managing boxes:**
  - a list (sidebar on desktop, drawer on phones) to select, rename or delete boxes
  - **Clear all**, and a **Hide boxes** toggle
  - **Copy JSON**, with pixel coordinates plus the same box as 0–1 fractions
  - deleting is instant, with an Undo toast
- **Keyboard:** Delete or Backspace; arrows nudge 1 px (10 px with Shift); Esc; Cmd/Ctrl+Z to undo and Shift+Cmd/Ctrl+Z or Ctrl+Y to redo; H hides boxes.

## 4. Persistence

`lib/db.ts` and `store/photoStore.ts`:

- **IndexedDB** has two stores:
  - **photos:** the original file, a 320 px JPEG thumbnail and the quality report
  - **annotations:** kept separate, so frequent edits don't rewrite multi-megabyte photo records
- **Saving edits:** they're debounced (400 ms per photo) and flushed when the app is hidden or closed.
- **Deleting:** the photo is removed from storage _before_ it disappears from the screen. Doing it the other way round let a quick reload bring a deleted photo back; an E2E test caught that.
- **Failures:**
  - quota errors get a clear message
  - if IndexedDB is unavailable (for example in private browsing), the app keeps photos in memory and says so once
- After the first save the app calls `navigator.storage.persist()`, so browsers are less likely to evict the data.

## 5. Testing strategy

- **Logic is pure and unit-tested** (Vitest, 123 tests). That covers geometry, history, the editor reducer, zoom math, quality metrics against synthetic images (flat, checkerboard, smooth ramps, controlled one-directional blur), the threshold assessment, the capture strategy with mocked `ImageCapture` and canvas, torch detection timing, lens ranking, error mapping, and store persistence against `fake-indexeddb`.
- **Real browser behavior is tested end to end** (Playwright, desktop and Pixel 7 emulation, Chromium's fake camera). That covers capture, review and retake; the denied-permission path and upload; drawing, labeling, resizing and undo; delete with undo; alignment after rotation; drawing accuracy while zoomed; and the reload round trip with gallery delete.
- **Device behavior Chromium can't fake** was verified on a Samsung S24 over a Cloudflare tunnel: the torch, lens selection, full-resolution capture and the sharpness calibration.
