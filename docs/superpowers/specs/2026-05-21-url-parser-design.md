# URL Parser — Raycast Extension Design Spec

Date: 2026-05-21

## Overview

A Raycast extension that parses a URL into its components, allows inline editing of each part (including query parameter keys and values), and copies the reconstructed URL to the clipboard.

## Requirements

### Core Features
- Auto-read URL from clipboard on launch; input field remains editable
- Parse URL into: protocol, host (including port), pathname, query parameters, hash
- Display each query parameter as an individual editable row (key + value)
- Allow adding and deleting query parameters
- Real-time preview of the reconstructed URL as any field changes
- Copy reconstructed URL to clipboard (`⌘+Enter`)

### Internationalization
- UI language defaults to **English**
- Chinese (`zh-CN`) supported as secondary locale
- All UI strings centralized in `src/i18n/en.ts` and `src/i18n/zh.ts`
- Locale selected at runtime based on system language

### Edge Case Handling

| Scenario | Behavior |
|----------|----------|
| Empty clipboard / non-URL content | Show empty input, display placeholder prompt |
| Invalid URL format | Highlight input field with error, show validation message, block parsing |
| URL with no query parameters | Show empty parameter list with "Add Parameter" row |
| URL-encoded values (`%20`, `%2B`, etc.) | Decode for display; re-encode on serialization |
| Empty key in a parameter row | Highlight row, exclude from output URL |
| Duplicate keys | Allowed — no restriction (some APIs use them legitimately) |
| Non-HTTP/HTTPS schemes (`ftp://`, `mailto:`) | Parse best-effort; no protocol restriction |
| URLs with port (`localhost:3000`) | Port included in host field |
| Very long URLs | Input supports scroll; no truncation |
| Array-style params (`ids[]=1&ids[]=2`) | Treated as regular key-value pairs |

## Architecture

### File Structure

```
raycast-url-parser/
  package.json
  src/
    parse-url.tsx         # Entry command (Form UI)
    utils/
      url-parser.ts       # URL parse / serialize logic
    i18n/
      en.ts               # English strings (default)
      zh.ts               # Chinese strings
      index.ts            # Locale selector
```

### State Model

```ts
interface ParsedUrl {
  protocol: string   // e.g. "https:"
  host: string       // e.g. "example.com" or "localhost:3000"
  pathname: string   // e.g. "/search"
  params: Param[]
  hash: string       // e.g. "#results"
}

interface Param {
  id: string         // stable React key (uuid)
  key: string
  value: string
}
```

### Data Flow

```
Clipboard / user input
        │
        ▼
  url-parser.ts: parse()
        │
        ▼
  React state: { rawUrl, protocol, host, pathname, params[], hash }
        │
  any field change
        │
        ▼
  url-parser.ts: serialize()
        │
        ▼
  Live preview → ⌘+Enter → copyTextToClipboard()
```

## UI Layout

Raycast `Form` component, single screen, top-to-bottom:

1. **URL** — `Form.TextField`, auto-filled from clipboard, full width
2. **URL Components** section — four `Form.TextField` rows: Protocol / Host / Path / Hash
3. **Query Parameters** section — dynamic list of key+value `Form.TextField` pairs per parameter; "Add Parameter" action in the Action Panel adds a new empty row; deletion is done via Action Panel (`⌘K → Delete Parameter`) when focus is on any field of that row — Raycast Form does not support inline buttons per row
4. **Generated URL** — `Form.Description` displaying the live reconstructed URL
5. **Submit action** — `Action.SubmitForm` labeled "Copy URL" (`⌘+Enter`), copies generated URL to clipboard; secondary action "Reset" clears all fields

## Key Implementation Notes

- Use the native `URL` API for parsing (browser-compatible, available in Raycast's Node environment)
- `URLSearchParams` for query param serialization to handle encoding correctly
- Each param row identified by a stable `id` (nanoid/uuid) to avoid React key conflicts when rows are added/deleted
- Locale detection: `Intl.DateTimeFormat().resolvedOptions().locale` to infer system language

## Out of Scope

- Browser history or URL bookmarks
- Batch processing of multiple URLs
- Opening URL in browser (not required)
- Array parameter merging / special syntax handling
