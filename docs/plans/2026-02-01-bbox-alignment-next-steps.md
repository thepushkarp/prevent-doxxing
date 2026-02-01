# Bounding Box Alignment & Next Steps Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix bounding box alignment in preview/redaction and lay out the next implementation steps after Phase 1 MVP.

**Architecture:** Normalize all detections into a single coordinate system (0–1000), pass accurate image dimensions through the pipeline (post-compression), and compute overlay positions using the rendered image rect. Keep redaction based on normalized coords converted to pixels at draw time.

**Tech Stack:** Next.js App Router, React, Tailwind, Bun, Biome, Husky/lint-staged

---

## Approach Options (TTRL consensus)

1) **Normalization-first**: normalize bbox values to 0–1000 in `detectSensitiveInfo`, keep preview math simple (`/10` for %). Fast, but breaks if rendered image is letterboxed.
2) **Overlay-first**: compute rendered image rect and offset in `ImagePreview`, keep raw bbox values. Fixes UI but not redaction.
3) **Hybrid (recommended)**: normalize bbox values to 0–1000 **and** compute rendered image rect for overlay positioning. Covers both API variability and UI layout.
4) **Manual calibration**: add a scale/offset slider for users. Useful fallback but adds UX complexity.

**Consensus:** Option 3 (Hybrid) provides the most robust fix with minimal UX complexity. Option 4 can be added later if needed.

---

### Task 1: Propagate accurate image dimensions (post-compression)

**Parallelizable:** Yes (with Task 2)

**Files:**
- Modify: `src/lib/imageCompressor.js`
- Modify: `src/components/UploadZone.jsx`
- Modify: `src/app/page.js`

**Step 1: Add helper to measure data URL dimensions**
- Add `getDataUrlDimensions(dataUrl)` in `src/lib/imageCompressor.js` (load via `Image`, return `{width, height}`)

**Step 2: Return compressed dimensions from compression**
- Update `compressImage` to return `{ dataUrl, width, height }` (use canvas dimensions after scaling)

**Step 3: Update UploadZone to use post-compression dimensions**
- If compressed, use dimensions from `compressImage`
- If not compressed, derive dimensions from data URL (use `getDataUrlDimensions`)
- Pass `{width, height}` from the processed data URL to `onImageProcessed`

**Step 4: Update page state to store processed image dimensions**
- Store `imageInfo.width/height` in state for detection normalization

**Step 5: Manual verification**
- Upload a large image (>4000px). Confirm preview shows correct dimensions and no layout regressions.

---

### Task 2: Normalize bbox coordinates to 0–1000

**Parallelizable:** Yes (with Task 1)

**Files:**
- Modify: `src/lib/detection.js`
- Modify: `src/app/page.js`

**Step 1: Add normalization helper**
- Add `normalizeBBox(bbox, imageWidth, imageHeight)`
- Heuristics:
  - If max value <= 1 → treat as 0–1 fractions
  - Else if max value > 1000 → treat as pixels
  - Else if image dimension > 1200 and max value <= 1000 → treat as normalized
  - Else use a ratio check: if `max / maxDim > 1.2` → treat as normalized, else treat as pixels
- Clamp results to [0, 1000]

**Step 2: Normalize detections**
- After parsing, convert each bbox to normalized 0–1000 using processed image dimensions

**Step 3: Update detectSensitiveInfo signature**
- Accept `imageWidth`/`imageHeight` as parameters
- Update call site in `src/app/page.js`

**Step 4: Manual verification**
- Use a known image with a large face/license plate; confirm overlay and redaction align more closely.

---

### Task 3: Render overlay boxes using rendered image rect

**Parallelizable:** Partial (after Task 1)

**Files:**
- Modify: `src/components/ImagePreview.jsx`

**Step 1: Capture rendered image rect**
- Add state `renderedRect` and compute it via `imageRef.current.getBoundingClientRect()`
- On image load and window resize, update rect

**Step 2: Convert normalized → pixel coords in overlay**
- Compute `left/top/width/height` in pixels using `renderedRect`
- Apply offset relative to container (use container rect)

**Step 3: Manual verification**
- Check alignment on wide images and tall images (letterboxing scenarios)

---

### Task 4: Optional debug overlay (diagnostic)

**Parallelizable:** Yes (with Task 3)

**Files:**
- Modify: `src/components/ImagePreview.jsx`

**Step 1: Add a debug toggle (dev-only)**
- Show raw bbox values and normalized values in a small overlay

**Step 2: Manual verification**
- Confirm toggle appears only in development and does not affect UX

---

### Task 5: Update docs + known-issues note

**Parallelizable:** Yes (with Task 2/3)

**Files:**
- Modify: `docs/doxx-preventor.md`
- Modify: `AGENTS.md`

**Step 1: Document coordinate normalization + overlay logic**
- Add a short note on bbox scale handling and the heuristics

**Step 2: Manual verification**
- `rg -n "bbox" docs/doxx-preventor.md`

---

## Next Implementation Steps (Post-Fix)

These can be picked up by subagents independently:

- **Phase 2A: Manual redaction controls** (drag/resize boxes, add custom boxes)
- **Phase 2B: Batch processing** (multiple images + ZIP download)
- **Phase 2C: API reliability** (exponential backoff, user-visible retry state)
- **Phase 2D: Export formats** (PNG/JPEG quality controls)

---

## Unresolved Questions

- Do you want any automated tests for bbox normalization, or should we rely on manual verification only?
- Should we include a user-facing “calibration” toggle if heuristics aren’t sufficient?
