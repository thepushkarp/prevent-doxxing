# AI Coding Assistant Guide

This file provides guidance to AI coding assistants when working with code in this repository.

## How to work

- Use parallel agents to work on the code wherever it is possible to boost efficiency.
- Ask the user for clarifying questions if something is unclear or if you get stuck. Unblock yourself fast.

## Project Overview

**Prevent Doxxing** is a privacy-protection web application that automatically detects and masks sensitive information in files and images. Built for the OpenAI Hackathon (Multimodal Intelligence track), it helps users prevent doxxing by identifying and redacting personal data like SSNs, phone numbers, addresses, faces, license plates, and other sensitive information.

**Deployment**: https://prevent-doxxing.thepushkarp.com/ (Vercel with CI/CD from main branch)

## Development Commands

### Essential Commands
```bash
# Start development server (default: http://localhost:3000)
bun run dev

# Production build
bun run build

# Start production server
bun run start

# Run tests (currently a no-op placeholder)
bun run test

# Run linter
bun run lint

# Auto-format
bun run format
```

**Package Manager**: This project uses **Bun** (not npm/yarn/pnpm). Always use `bun` commands.

## Tech Stack

- **Framework**: Next.js 16.1.6 (App Router)
- **React**: 19.2.3
- **Styling**: Tailwind CSS 4
- **Fonts**: Geist Sans & Geist Mono (via next/font)
- **Linting/Formatting**: Biome (biome.json)
- **Pre-commit**: Husky + lint-staged
- **Package Manager**: Bun

## Project Structure

```
src/
├── app/
│   ├── layout.js           # Root layout with Geist fonts + metadata
│   ├── page.js             # Main app (state machine for workflow)
│   ├── globals.css         # Global styles with Tailwind
│   └── api/                # API routes (CORS fallback if needed)
│
├── components/
│   ├── APIKeyManager.jsx   # API key input, validation, storage
│   ├── UploadZone.jsx      # Image upload with drag-drop + compression
│   └── ImagePreview.jsx    # Image with bbox overlays + toggles
│
└── lib/
    ├── apiKeyManager.js    # localStorage/sessionStorage management
    ├── apiClient.js        # OpenAI API calls with CORS fallback
    ├── detection.js        # GPT-5.2 vision detection with reasoning
    ├── imageCompressor.js  # Canvas-based compression (<5MB)
    └── imageRedactor.js    # Canvas-based black box drawing

docs/
├── doxx-preventor.md       # Project documentation
└── plans/                  # Implementation plans

public/                     # Static assets
```

**Path Aliases**: Use `@/` for imports (configured in jsconfig.json)
- Example: `import Component from '@/components/Component'`

## Architecture

### Current State: Phase 1 MVP Complete ✅

**Implemented**: Client-side image detection and redaction workflow with GPT-5.2 vision + medium reasoning.

### Architecture Decision: Client-Side Processing

**Why Client-Side?**
- **Privacy-first**: User's API key and images never touch our servers
- **Transparency**: All processing visible in browser (DevTools Network tab)
- **Cost-effective**: No server infrastructure needed for API proxying
- **Speed**: Direct OpenAI API calls (with CORS fallback if needed)

**Trade-offs**:
- ❌ User must provide their own OpenAI API key
- ❌ Limited to browser-supported formats (no server-side PDF libraries)
- ✅ Maximum privacy and security
- ✅ Zero backend costs
- ✅ Works offline after page load (except API calls)

### Implemented Workflow (Phase 1)

```
┌─────────────┐
│ User enters │
│   API key   │ → Validated against OpenAI /models endpoint
└──────┬──────┘
       │
       ▼
┌─────────────┐
│Upload image │ → Auto-compressed if >5MB or >4000px
└──────┬──────┘   (canvas-based JPEG compression)
       │
       ▼
┌─────────────┐
│ GPT-5.2     │ → Single agent with medium reasoning
│ Detection   │   Returns: [{type, text, bbox, confidence}]
└──────┬──────┘   bbox: {x, y, width, height} normalized to 0–1000
       │
       ▼
┌─────────────┐
│   Review    │ → Interactive overlay with bounding boxes
│  Detections │   User toggles which to redact
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Canvas    │ → Draw black rectangles over enabled detections
│  Redaction  │   Export as blob → Download
└─────────────┘
```

### Data Flow Details

**1. API Key Storage**:
- `localStorage` (persistent) or `sessionStorage` (temporary)
- Validated with `GET https://api.openai.com/v1/models`
- Masked display: `sk-proj...x7K2`

**2. Image Upload**:
- Accept: `image/png`, `image/jpeg`, `image/jpg`
- Max size: 20MB (compressed to <5MB for API)
- Compression: Canvas-based with quality adjustment (0.9 → 0.1)

**3. Detection** (using Responses API):
- Endpoint: `POST /v1/responses` (NOT `/v1/chat/completions`)
- Model: `gpt-5.2`
- Reasoning: `medium` (set via `reasoning: { effort: "medium" }`)
- Temperature: `1` (explicitly set)
- Request: `input` array with `input_text` and `input_image` content types
- Response: `output` array with typed items (extract via `output_text`)
- Storage: `store: false` for privacy (Responses API stores by default)
- JSON: `{detections: [{type, text, bbox, confidence}]}`

**4. Coordinate System** ⚠️ CRITICAL:
- GPT returns **normalized 0–1000 coordinates** (not pixels)
- Preview converts normalized coords → CSS percent by dividing by 10
- Redaction converts normalized coords → pixels using canvas dimensions

**5. Redaction**:
- Canvas size = original image size (`img.width`, `img.height`)
- Convert normalized bbox → pixels, then draw black rectangles
- Export as blob (PNG for transparency, JPEG for photos)

### Sensitive Information Types

**Text-based**:
- Government IDs (SSN, Aadhar, PAN, Passport)
- Phone numbers, emails, addresses
- Personal data (name, DOB, gender, race)

**Image-based**:
- Faces, license plates, house numbers
- Text within images (same categories as above)

**Masking Strategy**:
- Files: Remove sensitive text completely (non-selectable, non-searchable)
- Images: Black rectangles over bounding boxes

## Key Learnings & Technical Decisions

### 🎯 Critical Insights

**1. Use Responses API with GPT-5.2 + Medium Reasoning**
- **Problem**: GPT-4o is "trash at bounding boxes" (user feedback)
- **Solution**: Use Responses API (`/v1/responses`) with `gpt-5.2` and `reasoning: { effort: "medium" }`
- **Why Responses API?**: Better multimodal support, cleaner input/output structure
- **Impact**: Significantly more accurate spatial coordinates
- **Parameters**: `max_output_tokens`, `store: false` for privacy

**2. Coordinate System Gotcha** ⚠️
- GPT returns **normalized 0–1000 coordinates**
- CSS positioning: convert normalized → percent (`/ 10`)
- Canvas redaction: convert normalized → pixels using canvas size

**3. Client-Side Architecture Benefits**
- Privacy: No server ever sees user's API key or images
- Simplicity: No backend needed (100% frontend)
- Transparency: User can inspect all API calls in DevTools
- Cost: Zero server costs, user pays for their own API usage

**4. Image Compression Strategy**
- OpenAI limit: ~10MB per image
- Our limit: 5MB (safety margin)
- Method: Canvas-based JPEG compression with quality adjustment
- Dimensions: Scale down if >4000px (maintains aspect ratio)

### Development Guidelines

#### UI/UX Principles
- **Simplicity**: Interface should be usable by anyone (ages 5-80)
- **Clarity**: Clear visual feedback for detected information
- **Control**: Users can keep/remove individual detections
- **Non-destructive**: Preserve all non-sensitive information
- **Privacy-first**: Security warnings about API key usage

#### Code Conventions
- Use `'use client'` directive for browser APIs (canvas, localStorage, dropzone)
- Follow Next.js App Router patterns (client/server components)
- Tailwind CSS for styling (zinc color palette for dark theme)
- Dark mode support (already configured in globals.css)
- All components return early on error states

#### Performance Considerations
- Compress images before sending to API (<5MB target)
- Use retry logic with exponential backoff for API calls
- Client-side image preview (no server upload needed)
- Lazy load components where possible

## Configuration Notes

- **Next.js Config**: Minimal configuration in `next.config.mjs` (ready for image/API config)
- **Tailwind**: v4 with PostCSS integration (no separate config file needed)
- **Trusted Dependencies**: `sharp` and `unrs-resolver` configured in package.json
- **Biome**: `biome.json` at repo root for linting/formatting
- **Husky**: `.husky/pre-commit` runs `lint-staged` (Biome on staged files)

## Git Workflow

- **Main Branch**: `main` (protected, triggers Vercel deployment)
- Feature branches should be created for new development

## Documentation

Project documentation lives in `docs/doxx-preventor.md` - update this as features are implemented. Implementation plans should go in `docs/plans/`.
