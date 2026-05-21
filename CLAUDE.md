# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start Raycast development server (hot reload)
npm run build        # Production build via ray build
npm run lint         # ESLint via @raycast/eslint-config
npm run fix-lint     # ESLint with auto-fix
npm test             # Run all tests with vitest
npm run publish      # Publish to Raycast store
```

Run a single test file:
```bash
npx vitest run tests/utils/url-parser.test.ts
```

## Architecture

This is a single-command Raycast extension. The command entry point is `src/parse-url.tsx` — registered in `package.json` under `commands[].name: "parse-url"`.

**Data flow:**
1. On mount, the clipboard is read and pre-populated into the form if it contains a valid URL.
2. User edits the raw URL field → `parse()` splits it into components (protocol, host, pathname, params, hash) → individual fields update reactively.
3. User edits any component field → `rebuildUrl()` calls `serialize()` → the generated URL display updates live.
4. Query params are stored as `Param[]` with stable UUIDs so React keys and focus tracking are reliable.

**Key modules:**
- `src/utils/url-parser.ts` — pure `parse()`/`serialize()` functions; no Raycast dependency. All business logic and the `ParsedUrl`/`Param` types live here.
- `src/i18n/` — locale detection via `Intl.DateTimeFormat`. Supports `en` (default) and `zh`. `getStrings(locale?)` auto-detects system locale when called without arguments.
- `src/parse-url.tsx` — all UI state and Raycast `Form` rendering. `focusedParamId` tracks which param row has focus so the delete action targets the right row.

**Testing:** Vitest runs in Node environment (no browser/Raycast APIs). Tests cover `url-parser.ts` and `i18n/index.ts` only — UI logic in `parse-url.tsx` is untested (Raycast APIs are not mockable in Node).

**Encoding contract:** `parse()` decodes percent-encoded values (e.g. `%20` → space) via `URLSearchParams`. `serialize()` re-encodes via `URLSearchParams.toString()` (spaces → `+`). Round-trips are stable but may change encoding style (e.g. `%20` becomes `+`).
