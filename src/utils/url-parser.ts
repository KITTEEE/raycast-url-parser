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
