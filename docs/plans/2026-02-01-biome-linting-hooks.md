# Biome Linting & Hooks Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace ESLint with Biome, add autoformatting, and enforce quality via Husky + lint-staged pre-commit hooks.

**Architecture:** Use a root `biome.json` for formatting/linting rules, `package.json` scripts for lint/format/prepare, and Husky+lint-staged to run `biome check --write` on staged files. Remove ESLint config/deps to keep a single toolchain.

**Tech Stack:** Next.js, Bun, Biome, Husky, lint-staged

---

### Task 1: Add Biome configuration

**Files:**
- Create: `biome.json`

**Step 1: Create `biome.json`**
```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineEnding": "lf",
    "lineWidth": 100
  },
  "organizeImports": {
    "enabled": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  },
  "files": {
    "ignore": [
      ".next",
      "out",
      "build",
      "node_modules"
    ]
  }
}
```

**Step 2: Verify Biome config loads**
Run: `bunx biome check . --files-ignore-unknown=true --no-errors-on-unmatched`
Expected: FAIL (Biome not installed yet)

---

### Task 2: Replace ESLint with Biome tooling

**Files:**
- Modify: `package.json`
- Delete: `eslint.config.mjs`

**Step 1: Update scripts**
Set scripts:
- `lint`: `biome check .`
- `format`: `biome format --write .`
- `prepare`: `husky`

**Step 2: Update devDependencies**
- Add: `@biomejs/biome`, `husky`, `lint-staged`
- Remove: `eslint`, `eslint-config-next`

**Step 3: Add lint-staged config in `package.json`**
```json
"lint-staged": {
  "**/*": [
    "biome check --write --files-ignore-unknown=true --no-errors-on-unmatched"
  ]
}
```

**Step 4: Remove ESLint config file**
Delete: `eslint.config.mjs`

**Step 5: Install dependencies**
Run: `bun install`
Expected: install completes

**Step 6: Verify lint/format**
Run: `bun run lint`
Expected: PASS (Biome check)

Run: `bun run format`
Expected: PASS (Biome format)

---

### Task 3: Set up Husky pre-commit hook

**Files:**
- Create/Modify: `.husky/pre-commit`

**Step 1: Initialize Husky**
Run: `bunx husky init`
Expected: `.husky/` created with a sample `pre-commit`

**Step 2: Replace pre-commit contents**
```sh
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

bunx lint-staged
```

**Step 3: Verify hook script is executable**
Run: `ls -l .husky/pre-commit`
Expected: executable bit set

---

### Task 4: Update docs

**Files:**
- Modify: `docs/doxx-preventor.md`

**Step 1: Update Tech Stack section**
Add Biome + Husky/lint-staged as tooling for lint/format/hooks.

**Step 2: Quick verification**
Run: `rg -n "Biome" docs/doxx-preventor.md`
Expected: line mentions Biome in tooling context

---

### Task 5: Sanity check workflow

**Files:**
- None

**Step 1: Stage a small change to verify lint-staged path**
Run:
```bash
printf "// lint hook test\n" >> src/app/page.js

git add src/app/page.js
bunx lint-staged
```
Expected: Biome runs and fixes if needed; no errors

**Step 2: Revert the test change**
Run: `git restore src/app/page.js`
Expected: file restored

---

## Unresolved Questions
- None
