# URL Parser Raycast Extension — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Raycast extension that parses a URL from the clipboard into editable components (protocol, host, path, query params, hash), reconstructs the URL in real time as fields are edited, and copies the result to clipboard on `⌘+Enter`.

**Architecture:** Single Form-based command with three layers — a pure URL parse/serialize utility (`url-parser.ts`) that only uses native Node.js APIs, a locale-aware string catalog (`i18n/`) that selects English or Chinese at runtime, and a React component (`parse-url.tsx`) that wires them together. Clipboard is auto-read on mount; all state lives in the component.

**Tech Stack:** TypeScript, React (Raycast runtime), Raycast API v1, Vitest (unit tests), native `URL` + `URLSearchParams` APIs, Node.js `crypto.randomUUID()`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `package.json` | Create | Extension manifest, dependencies, npm scripts |
| `tsconfig.json` | Create | TypeScript config (extends Raycast's) |
| `vitest.config.ts` | Create | Vitest test runner config |
| `assets/command-icon.png` | Create | Extension icon (512×512 PNG, placeholder OK for dev) |
| `src/utils/url-parser.ts` | Create | `parse()` and `serialize()` — zero Raycast dependency |
| `src/i18n/en.ts` | Create | English UI strings (default) |
| `src/i18n/zh.ts` | Create | Chinese UI strings |
| `src/i18n/index.ts` | Create | `getStrings(locale?)` — returns the right string set |
| `src/parse-url.tsx` | Create | Main Form UI — state, clipboard read, fields, Action Panel |
| `tests/utils/url-parser.test.ts` | Create | Unit tests for `parse()` and `serialize()` |
| `tests/i18n/index.test.ts` | Create | Unit tests for locale selector |

---

## Task 1: Project Setup

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `assets/command-icon.png` (placeholder)

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "url-parser",
  "title": "URL Parser",
  "description": "Parse and edit URL components, then copy the result",
  "icon": "command-icon.png",
  "author": "author",
  "categories": ["Developer Tools"],
  "license": "MIT",
  "commands": [
    {
      "name": "parse-url",
      "title": "Parse URL",
      "subtitle": "URL Parser",
      "description": "Parse a URL into its components and reconstruct it",
      "mode": "view"
    }
  ],
  "dependencies": {
    "@raycast/api": "1.104.18"
  },
  "devDependencies": {
    "@raycast/eslint-config": "2.1.1",
    "@types/node": "24.12.4",
    "@types/react": "19.2.15",
    "eslint": "10.4.0",
    "prettier": "3.8.3",
    "typescript": "6.0.3",
    "vitest": "4.1.7"
  },
  "scripts": {
    "build": "ray build",
    "dev": "ray develop",
    "fix-lint": "ray lint --fix",
    "lint": "ray lint",
    "publish": "npx @raycast/api@latest publish",
    "test": "vitest run"
  },
  "packageManager": "pnpm@10.28.0",
  "engines": {
    "node": ">=24.0.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "extends": "@raycast/api/tsconfig.json"
}
```

- [ ] **Step 3: Create `vitest.config.ts`**

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
  },
});
```

- [ ] **Step 4: Create directory structure and placeholder icon**

```bash
mkdir -p src/utils src/i18n tests/utils tests/i18n assets
```

For `assets/command-icon.png`: copy any 512×512 PNG file and save it there. Raycast requires this file to load the extension — a solid-color placeholder is fine during development.

- [ ] **Step 5: Install dependencies**

```bash
pnpm install
```

Expected: `node_modules/` is created with no errors. Specifically `@raycast/api` is present.

- [ ] **Step 6: Commit**

```bash
git init
git add package.json tsconfig.json vitest.config.ts assets/
git commit -m "chore: scaffold Raycast URL parser extension"
```

(Skip `git init` if already in a git repo.)

---

## Task 2: URL Parser Utility (TDD)

**Files:**
- Create: `tests/utils/url-parser.test.ts`
- Create: `src/utils/url-parser.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/utils/url-parser.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { parse, serialize } from "../../src/utils/url-parser";

describe("parse", () => {
  it("parses protocol, host, pathname, params, and hash from a full URL", () => {
    const result = parse("https://example.com/path?foo=bar&baz=qux#section");
    expect(result).not.toBeNull();
    expect(result!.protocol).toBe("https:");
    expect(result!.host).toBe("example.com");
    expect(result!.pathname).toBe("/path");
    expect(result!.hash).toBe("#section");
    expect(result!.params).toHaveLength(2);
    expect(result!.params[0].key).toBe("foo");
    expect(result!.params[0].value).toBe("bar");
    expect(result!.params[1].key).toBe("baz");
    expect(result!.params[1].value).toBe("qux");
    expect(typeof result!.params[0].id).toBe("string");
    expect(result!.params[0].id).toBeTruthy();
  });

  it("returns null for an invalid URL string", () => {
    expect(parse("not-a-url")).toBeNull();
    expect(parse("http//missing-colon")).toBeNull();
    expect(parse("just text")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(parse("")).toBeNull();
  });

  it("returns an empty params array for a URL with no query string", () => {
    const result = parse("https://example.com/");
    expect(result).not.toBeNull();
    expect(result!.params).toHaveLength(0);
  });

  it("includes the port number in the host field", () => {
    const result = parse("http://localhost:3000/api");
    expect(result).not.toBeNull();
    expect(result!.host).toBe("localhost:3000");
    expect(result!.pathname).toBe("/api");
  });

  it("decodes percent-encoded values for display (e.g. %20 → space)", () => {
    const result = parse("https://example.com/?q=hello%20world&tag=%2Bspecial");
    expect(result).not.toBeNull();
    expect(result!.params[0].value).toBe("hello world");
    expect(result!.params[1].value).toBe("+special");
  });

  it("returns an empty string for hash when the URL has no fragment", () => {
    const result = parse("https://example.com/path");
    expect(result).not.toBeNull();
    expect(result!.hash).toBe("");
  });

  it("allows duplicate keys (treats them as separate rows)", () => {
    const result = parse("https://example.com/?ids%5B%5D=1&ids%5B%5D=2");
    expect(result).not.toBeNull();
    expect(result!.params).toHaveLength(2);
    expect(result!.params[0].key).toBe("ids[]");
    expect(result!.params[1].key).toBe("ids[]");
  });

  it("assigns each param a unique id", () => {
    const result = parse("https://example.com/?a=1&b=2&c=3");
    expect(result).not.toBeNull();
    const ids = result!.params.map((p) => p.id);
    expect(new Set(ids).size).toBe(3);
  });

  it("parses non-HTTP schemes (ftp) without restriction", () => {
    const result = parse("ftp://files.example.com/readme.txt");
    expect(result).not.toBeNull();
    expect(result!.protocol).toBe("ftp:");
    expect(result!.host).toBe("files.example.com");
  });
});

describe("serialize", () => {
  it("reconstructs a full URL from its parts", () => {
    const url = serialize({
      protocol: "https:",
      host: "example.com",
      pathname: "/path",
      params: [
        { id: "1", key: "foo", value: "bar" },
        { id: "2", key: "baz", value: "qux" },
      ],
      hash: "#section",
    });
    expect(url).toBe("https://example.com/path?foo=bar&baz=qux#section");
  });

  it("excludes params whose key is empty or whitespace-only", () => {
    const url = serialize({
      protocol: "https:",
      host: "example.com",
      pathname: "/",
      params: [
        { id: "1", key: "", value: "ignored" },
        { id: "2", key: "   ", value: "also-ignored" },
        { id: "3", key: "valid", value: "kept" },
      ],
      hash: "",
    });
    expect(url).toBe("https://example.com/?valid=kept");
  });

  it("encodes special characters in param values (space → +)", () => {
    const url = serialize({
      protocol: "https:",
      host: "example.com",
      pathname: "/",
      params: [{ id: "1", key: "q", value: "hello world" }],
      hash: "",
    });
    expect(url).toBe("https://example.com/?q=hello+world");
  });

  it("produces no query string when params is empty", () => {
    const url = serialize({
      protocol: "https:",
      host: "example.com",
      pathname: "/path",
      params: [],
      hash: "",
    });
    expect(url).toBe("https://example.com/path");
  });

  it("appends hash when present", () => {
    const url = serialize({
      protocol: "https:",
      host: "example.com",
      pathname: "/",
      params: [],
      hash: "#results",
    });
    expect(url).toBe("https://example.com/#results");
  });

  it("handles a URL with port in host", () => {
    const url = serialize({
      protocol: "http:",
      host: "localhost:3000",
      pathname: "/api",
      params: [{ id: "1", key: "debug", value: "true" }],
      hash: "",
    });
    expect(url).toBe("http://localhost:3000/api?debug=true");
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
pnpm test
```

Expected: All tests fail with `Cannot find module '../../src/utils/url-parser'`.

- [ ] **Step 3: Implement `src/utils/url-parser.ts`**

```typescript
import { randomUUID } from "crypto";

export interface Param {
  id: string;
  key: string;
  value: string;
}

export interface ParsedUrl {
  protocol: string;
  host: string;
  pathname: string;
  params: Param[];
  hash: string;
}

export function parse(rawUrl: string): ParsedUrl | null {
  if (!rawUrl) return null;
  try {
    const url = new URL(rawUrl);
    const params: Param[] = [];
    url.searchParams.forEach((value, key) => {
      params.push({ id: randomUUID(), key, value });
    });
    return {
      protocol: url.protocol,
      host: url.host,
      pathname: url.pathname,
      params,
      hash: url.hash,
    };
  } catch {
    return null;
  }
}

export function serialize(parsed: ParsedUrl): string {
  const searchParams = new URLSearchParams();
  for (const param of parsed.params) {
    if (param.key.trim()) {
      searchParams.append(param.key, param.value);
    }
  }
  const search = searchParams.toString() ? `?${searchParams.toString()}` : "";
  return `${parsed.protocol}//${parsed.host}${parsed.pathname}${search}${parsed.hash}`;
}
```

- [ ] **Step 4: Run tests — verify they all pass**

```bash
pnpm test
```

Expected: All 16 tests pass. Output shows `✓ parse > ...` and `✓ serialize > ...` for each case.

- [ ] **Step 5: Commit**

```bash
git add src/utils/url-parser.ts tests/utils/url-parser.test.ts
git commit -m "feat: add URL parse and serialize utility with tests"
```

---

## Task 3: i18n Setup (TDD)

**Files:**
- Create: `src/i18n/en.ts`
- Create: `src/i18n/zh.ts`
- Create: `src/i18n/index.ts`
- Create: `tests/i18n/index.test.ts`

- [ ] **Step 1: Write the failing test for the locale selector**

Create `tests/i18n/index.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { getStrings } from "../../src/i18n/index";

describe("getStrings", () => {
  it("returns English strings for en-US locale", () => {
    const s = getStrings("en-US");
    expect(s.urlLabel).toBe("URL");
    expect(s.copyAction).toBe("Copy URL");
    expect(s.invalidUrl).toBe("Invalid URL");
  });

  it("returns Chinese strings for zh-CN locale", () => {
    const s = getStrings("zh-CN");
    expect(s.copyAction).toBe("复制链接");
    expect(s.invalidUrl).toBe("无效的 URL");
  });

  it("returns Chinese strings for zh-TW locale", () => {
    const s = getStrings("zh-TW");
    expect(s.copyAction).toBe("复制链接");
  });

  it("falls back to English for an unrecognized locale", () => {
    const s = getStrings("fr-FR");
    expect(s.urlLabel).toBe("URL");
    expect(s.copyAction).toBe("Copy URL");
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
pnpm test tests/i18n
```

Expected: Fails with `Cannot find module '../../src/i18n/index'`.

- [ ] **Step 3: Create `src/i18n/en.ts`**

```typescript
export const en = {
  urlLabel: "URL",
  urlPlaceholder: "Paste or type a URL",
  invalidUrl: "Invalid URL",
  componentsSection: "URL Components",
  protocolLabel: "Protocol",
  hostLabel: "Host",
  pathnameLabel: "Path",
  hashLabel: "Hash",
  paramsSection: "Query Parameters",
  paramKeyLabel: "Key",
  paramValueLabel: "Value",
  emptyKeyError: "Key cannot be empty",
  generatedUrlLabel: "Generated URL",
  copyAction: "Copy URL",
  resetAction: "Reset",
  addParamAction: "Add Parameter",
  deleteParamAction: "Delete Parameter",
  copiedToast: "URL copied to clipboard",
  noParamsPlaceholder: "No query parameters",
};
```

- [ ] **Step 4: Create `src/i18n/zh.ts`**

```typescript
export const zh = {
  urlLabel: "URL",
  urlPlaceholder: "粘贴或输入 URL",
  invalidUrl: "无效的 URL",
  componentsSection: "URL 组成",
  protocolLabel: "协议",
  hostLabel: "域名",
  pathnameLabel: "路径",
  hashLabel: "锚点",
  paramsSection: "查询参数",
  paramKeyLabel: "键",
  paramValueLabel: "值",
  emptyKeyError: "键名不能为空",
  generatedUrlLabel: "生成的 URL",
  copyAction: "复制链接",
  resetAction: "重置",
  addParamAction: "添加参数",
  deleteParamAction: "删除参数",
  copiedToast: "链接已复制到剪贴板",
  noParamsPlaceholder: "无查询参数",
};
```

- [ ] **Step 5: Create `src/i18n/index.ts`**

```typescript
import { en } from "./en";
import { zh } from "./zh";

export type Strings = typeof en;

export function getStrings(locale?: string): Strings {
  const l = locale ?? Intl.DateTimeFormat().resolvedOptions().locale;
  return l.startsWith("zh") ? zh : en;
}
```

- [ ] **Step 6: Run tests — verify they pass**

```bash
pnpm test tests/i18n
```

Expected: All 4 locale tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/i18n/ tests/i18n/
git commit -m "feat: add i18n string catalogs and locale selector"
```

---

## Task 4: Main Form Component

**Files:**
- Create: `src/parse-url.tsx`

This is the only file that imports from `@raycast/api` and cannot be unit-tested. Implementation correctness is verified in Task 5 by running the extension inside Raycast.

- [ ] **Step 1: Create `src/parse-url.tsx`**

```tsx
import { Action, ActionPanel, Clipboard, Form, showHUD } from "@raycast/api";
import { randomUUID } from "crypto";
import { Fragment, useEffect, useState } from "react";
import { getStrings } from "./i18n";
import { type Param, type ParsedUrl, parse, serialize } from "./utils/url-parser";

const t = getStrings();

export default function ParseUrl() {
  const [rawUrl, setRawUrl] = useState("");
  const [urlError, setUrlError] = useState<string | undefined>();
  const [protocol, setProtocol] = useState("");
  const [host, setHost] = useState("");
  const [pathname, setPathname] = useState("");
  const [hash, setHash] = useState("");
  const [params, setParams] = useState<Param[]>([]);
  const [generatedUrl, setGeneratedUrl] = useState("");
  const [focusedParamId, setFocusedParamId] = useState<string | undefined>();

  useEffect(() => {
    Clipboard.readText().then((text) => {
      if (!text) return;
      const result = parse(text);
      if (result) applyParsed(text, result);
    });
  }, []);

  function applyParsed(raw: string, result: ParsedUrl) {
    setRawUrl(raw);
    setProtocol(result.protocol);
    setHost(result.host);
    setPathname(result.pathname);
    setHash(result.hash);
    setParams(result.params);
    setUrlError(undefined);
    setGeneratedUrl(serialize(result));
  }

  function clearAll() {
    setUrlError(undefined);
    setProtocol("");
    setHost("");
    setPathname("");
    setHash("");
    setParams([]);
    setGeneratedUrl("");
  }

  // Reads the latest values from closure and merges overrides before serializing.
  // Each change handler passes its new value as an override so stale closure state
  // for that specific field is never used.
  function rebuildUrl(overrides: Partial<ParsedUrl> = {}) {
    const current: ParsedUrl = { protocol, host, pathname, params, hash };
    const updated = { ...current, ...overrides };
    setGeneratedUrl(serialize(updated));
    return updated;
  }

  function handleRawUrlChange(value: string) {
    setRawUrl(value);
    if (!value) {
      clearAll();
      return;
    }
    const result = parse(value);
    if (!result) {
      setUrlError(t.invalidUrl);
      return;
    }
    applyParsed(value, result);
  }

  function handleProtocolChange(value: string) {
    setProtocol(value);
    rebuildUrl({ protocol: value });
  }

  function handleHostChange(value: string) {
    setHost(value);
    rebuildUrl({ host: value });
  }

  function handlePathnameChange(value: string) {
    setPathname(value);
    rebuildUrl({ pathname: value });
  }

  function handleHashChange(value: string) {
    setHash(value);
    rebuildUrl({ hash: value });
  }

  function handleParamChange(id: string, field: "key" | "value", value: string) {
    const updated = params.map((p) => (p.id === id ? { ...p, [field]: value } : p));
    setParams(updated);
    rebuildUrl({ params: updated });
  }

  function handleAddParam() {
    const newParam: Param = { id: randomUUID(), key: "", value: "" };
    const updated = [...params, newParam];
    setParams(updated);
    rebuildUrl({ params: updated });
  }

  function handleDeleteParam() {
    if (!focusedParamId) return;
    const updated = params.filter((p) => p.id !== focusedParamId);
    setParams(updated);
    setFocusedParamId(undefined);
    rebuildUrl({ params: updated });
  }

  function handleReset() {
    setRawUrl("");
    clearAll();
  }

  async function handleCopy() {
    if (!generatedUrl) return;
    await Clipboard.copy(generatedUrl);
    await showHUD(t.copiedToast);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action
            title={t.copyAction}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
            onAction={handleCopy}
          />
          <Action
            title={t.addParamAction}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            onAction={handleAddParam}
          />
          {focusedParamId && (
            <Action
              title={t.deleteParamAction}
              shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
              onAction={handleDeleteParam}
            />
          )}
          <Action title={t.resetAction} onAction={handleReset} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="rawUrl"
        title={t.urlLabel}
        placeholder={t.urlPlaceholder}
        value={rawUrl}
        error={urlError}
        onChange={handleRawUrlChange}
      />

      <Form.Separator />
      <Form.Description title={t.componentsSection} text="" />

      <Form.TextField
        id="protocol"
        title={t.protocolLabel}
        value={protocol}
        onChange={handleProtocolChange}
      />
      <Form.TextField
        id="host"
        title={t.hostLabel}
        value={host}
        onChange={handleHostChange}
      />
      <Form.TextField
        id="pathname"
        title={t.pathnameLabel}
        value={pathname}
        onChange={handlePathnameChange}
      />
      <Form.TextField
        id="hash"
        title={t.hashLabel}
        value={hash}
        onChange={handleHashChange}
      />

      <Form.Separator />
      <Form.Description title={t.paramsSection} text="" />

      {params.map((param) => (
        <Fragment key={param.id}>
          <Form.TextField
            id={`param-key-${param.id}`}
            title={t.paramKeyLabel}
            value={param.key}
            error={param.key !== "" && !param.key.trim() ? t.emptyKeyError : undefined}
            onChange={(v) => handleParamChange(param.id, "key", v)}
            onFocus={() => setFocusedParamId(param.id)}
          />
          <Form.TextField
            id={`param-value-${param.id}`}
            title={t.paramValueLabel}
            value={param.value}
            onChange={(v) => handleParamChange(param.id, "value", v)}
            onFocus={() => setFocusedParamId(param.id)}
          />
        </Fragment>
      ))}

      {params.length === 0 && (
        <Form.Description title="" text={t.noParamsPlaceholder} />
      )}

      <Form.Separator />
      <Form.Description title={t.generatedUrlLabel} text={generatedUrl || "—"} />
    </Form>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles without errors**

```bash
pnpm exec tsc --noEmit
```

Expected: No output (zero errors).

- [ ] **Step 3: Commit**

```bash
git add src/parse-url.tsx
git commit -m "feat: add URL parser Form UI with clipboard auto-fill and i18n"
```

---

## Task 5: Local Integration Testing

**Files:** None — manual verification only.

- [ ] **Step 1: Start the dev server**

```bash
pnpm dev
```

Raycast will prompt you to import the extension. Accept. The "Parse URL" command appears in Raycast search.

- [ ] **Step 2: Test the golden path**

Before opening Raycast, copy this URL to your clipboard:

```
https://api.example.com/search?q=hello%20world&page=2&sort=asc#results
```

Open Raycast → type "Parse URL" → open the command. Verify:

- URL field is pre-filled with the clipboard URL
- Protocol shows `https:`
- Host shows `api.example.com`
- Path shows `/search`
- Hash shows `#results`
- Three query param rows: `q` / `hello world` (decoded from `%20`), `page` / `2`, `sort` / `asc`
- Generated URL at the bottom matches the original (spaces re-encoded as `+`)

Press `⌘+Return`. Verify: a HUD notification says "URL copied to clipboard" and your clipboard holds the reconstructed URL.

- [ ] **Step 3: Test adding a parameter**

With the extension open, press `⌘K` → select "Add Parameter". Verify: a new empty key+value row appears at the bottom. Type `debug` in the key field and `true` in the value field. Verify the Generated URL updates to append `&debug=true`.

- [ ] **Step 4: Test deleting a parameter**

Click into any field of the `page` / `2` row. Press `⌘K` → "Delete Parameter". Verify: the `page=2` row disappears and the Generated URL no longer contains `page`.

- [ ] **Step 5: Test invalid URL**

Clear the URL field and type `not a url`. Verify: the field shows a red error "Invalid URL" and all component fields remain empty.

- [ ] **Step 6: Test localhost URL with port**

Paste `http://localhost:3000/api/users?role=admin` into the URL field. Verify:

- Host shows `localhost:3000` (port included)
- One param row: `role` / `admin`

- [ ] **Step 7: Test Reset**

Press `⌘K` → "Reset". Verify: all fields clear including the URL input and the Generated URL shows `—`.

- [ ] **Step 8: Commit any fixes**

```bash
git add -p
git commit -m "fix: <describe what you fixed>"
```

---

## Self-Review Notes

**Spec coverage verified:**
- ✅ Clipboard auto-read on launch → `useEffect` reads clipboard, calls `applyParsed`
- ✅ Input field remains editable → controlled `Form.TextField` with `onChange`
- ✅ All URL parts editable (protocol/host/path/params/hash) → individual handlers
- ✅ Query params as individual rows with key+value editing → `params.map()` in JSX
- ✅ Add / delete query parameters → `handleAddParam`, `handleDeleteParam` + Action Panel
- ✅ Real-time preview → `rebuildUrl()` called in every change handler
- ✅ Copy with `⌘+Enter` → `handleCopy` action with shortcut
- ✅ English default, Chinese secondary → `getStrings()` uses `Intl` locale detection
- ✅ All UI strings centralized → all user-visible text goes through `t.*`
- ✅ Empty/invalid clipboard → `if (!text) return` in useEffect
- ✅ Invalid URL format → `setUrlError(t.invalidUrl)`, returns early
- ✅ URL with no query params → `noParamsPlaceholder` shown when `params.length === 0`
- ✅ URL-encoded values decoded for display → `URLSearchParams` decodes automatically in `parse()`
- ✅ Empty key highlighted, excluded from output → `error` prop on key field; `param.key.trim()` check in `serialize()`
- ✅ Duplicate keys allowed → no deduplication in `parse()` or `serialize()`
- ✅ Non-HTTP schemes → `new URL()` accepts any scheme; no protocol restriction
- ✅ Port in host field → `url.host` includes port (e.g. `localhost:3000`)
- ✅ Array-style params treated as regular key-value → no special handling; `URLSearchParams` iterates them as-is
