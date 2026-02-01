# Project Completion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete Prevent Doxxing end-to-end for images + files (detect, review, redact, download) with reliable bbox alignment and clear UX.

**Architecture:** Hybrid. Client-side image flow; serverless API routes for file (PDF/DOCX) processing. Normalize all detections to 0–1000, render overlays using rendered image rect, convert to pixels only at redaction time.

**Tech Stack:** Next.js App Router, React, Tailwind, Bun, Biome, Husky/lint-staged, OpenAI Responses API.

---

## Approach Options (TTRL consensus)

1) Client-only (all in browser) → max privacy, but file processing is hard.
2) Server-only (API routes for all) → simpler for files, weaker privacy story.
3) Hybrid (client images, server files) → best trade-off. **Chosen**.

---

### Task 1: Testing harness (Bun test)

**Parallelizable:** Yes (with Task 2)

**Files:**
- Create: `tests/normalize-bbox.test.js`
- Modify: `package.json`

**Step 1: Write failing test**
```js
import { describe, expect, it } from "bun:test";
import { normalizeBBox } from "../src/lib/detection";

describe("normalizeBBox", () => {
  it("normalizes pixel bboxes to 0-1000", () => {
    const bbox = normalizeBBox({ x: 100, y: 200, width: 300, height: 400 }, 1000, 1000);
    expect(bbox.x).toBe(100);
    expect(bbox.y).toBe(200);
    expect(bbox.width).toBe(300);
    expect(bbox.height).toBe(400);
  });
});
```

**Step 2: Run test (expect FAIL)**
Run: `bun test tests/normalize-bbox.test.js`
Expected: FAIL (normalizeBBox not exported)

**Step 3: Export normalizeBBox**
- Export it from `src/lib/detection.js`

**Step 4: Run test (expect PASS)**
Run: `bun test tests/normalize-bbox.test.js`
Expected: PASS

---

### Task 2: Bounding box alignment fix (image flow)

**Parallelizable:** Yes (with Task 1)

**Files:**
- Modify: `src/lib/imageCompressor.js`
- Modify: `src/components/UploadZone.jsx`
- Modify: `src/lib/detection.js`
- Modify: `src/app/page.js`
- Modify: `src/components/ImagePreview.jsx`

**Step 1: Write failing manual check**
- Upload a tall image; bbox overlays should align (currently off). Document baseline screenshot.

**Step 2: Implement dimension propagation**
- `compressImage` returns `{ dataUrl, width, height }`
- `getDataUrlDimensions` helper for non-compressed paths
- `UploadZone` uses processed dimensions (post-compression)

**Step 3: Normalize bbox values**
- `normalizeBBox(bbox, imageWidth, imageHeight)` with heuristics
- Convert all detections to 0–1000
- Pass `info.width/height` into `detectSensitiveInfo`

**Step 4: Render overlay using rendered rect**
- Compute rendered image rect, store offsets
- Convert normalized → pixels with rect, apply offsets

**Step 5: Manual verification**
- Re-test on wide + tall images; overlay alignment should be close.

---

### Task 3: Image redaction parity

**Parallelizable:** Yes (with Task 4)

**Files:**
- Modify: `src/lib/imageRedactor.js`

**Step 1: Write failing test**
```js
import { describe, expect, it } from "bun:test";
import { normalizeBBox } from "../src/lib/detection";

describe("redaction bbox", () => {
  it("keeps normalized coords within 0-1000", () => {
    const bbox = normalizeBBox({ x: 1200, y: 1300, width: 200, height: 200 }, 1000, 1000);
    expect(bbox.x).toBeLessThanOrEqual(1000);
    expect(bbox.y).toBeLessThanOrEqual(1000);
  });
});
```

**Step 2: Run test (expect PASS)**
Run: `bun test tests/normalize-bbox.test.js`
Expected: PASS

**Step 3: Ensure redactor consumes normalized coords**
- Confirm redactor converts 0–1000 → pixels before drawing (no direct pixel assumption)

---

### Task 4: File pipeline (PDF/DOCX)

**Parallelizable:** Yes (with Task 5)

**Files:**
- Create: `src/app/api/detect/route.js`
- Create: `src/app/api/redact/route.js`
- Create: `src/lib/fileDetection.js`
- Create: `src/lib/fileRedaction.js`
- Modify: `src/app/page.js`
- Modify: `src/components/UploadZone.jsx`

**Step 1: Write failing test (API contract)**
```js
import { describe, expect, it } from "bun:test";

describe("file detect API", () => {
  it("returns detections array", async () => {
    const res = await fetch("/api/detect", { method: "POST" });
    expect(res.status).toBe(400);
  });
});
```

**Step 2: Implement `/api/detect`**
- Accept multipart file
- Extract text (PDF/DOCX)
- Call OpenAI for PII extraction
- Return structured detections

**Step 3: Implement `/api/redact`**
- Apply redactions to file content
- Return redacted file blob

**Step 4: Update UI flow**
- Add file-type branching in upload + review

**Step 5: Manual verification**
- Upload a PDF with SSN, confirm redacted output is non-selectable.

---

### Task 5: UX polish + controls

**Parallelizable:** Yes (with Task 4)

**Files:**
- Modify: `src/components/ImagePreview.jsx`
- Modify: `src/components/UploadZone.jsx`
- Modify: `src/app/page.js`

**Step 1: Write failing UX check**
- Ensure user can toggle all detections and see counts update.

**Step 2: Implement bulk actions**
- Select All / Deselect All for files too

**Step 3: Manual verification**
- Verify toggles + download button states.

---

### Task 6: Docs + runbook

**Parallelizable:** Yes

**Files:**
- Modify: `docs/doxx-preventor.md`
- Modify: `AGENTS.md`

**Step 1: Update bbox normalization notes**
- Document 0–1000 normalization + rendered rect overlay

**Step 2: Add file pipeline notes**
- Describe detect/redact flow for PDFs/DOCX

**Step 3: Verify**
Run: `rg -n "bbox|redact" docs/doxx-preventor.md`
Expected: updated notes

---

### Task 7: Release readiness

**Parallelizable:** No

**Files:**
- Modify: `README.md`
- Modify: `docs/doxx-preventor.md`

**Step 1: Add setup + env notes**
- Mention required OpenAI key, file limits

**Step 2: Manual verification**
- Fresh install: `bun install` → `bun run dev`

---

## Unresolved Questions

- Confirm file formats to support first: PDF + DOCX only?
- Allow server-side storage of files or strictly process in-memory?
- Do we want manual bbox calibration as a fallback?
