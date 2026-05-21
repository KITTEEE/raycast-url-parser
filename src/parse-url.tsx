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
