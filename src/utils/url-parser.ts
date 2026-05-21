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
  if (!parsed.host) return "";
  const searchParams = new URLSearchParams();
  for (const param of parsed.params) {
    if (param.key.trim()) {
      searchParams.append(param.key, param.value);
    }
  }
  const normalizedPath = parsed.pathname || "/";
  const queryString = searchParams.toString();
  const search = queryString ? `?${queryString}` : "";
  const normalizedProtocol = parsed.protocol.endsWith(":")
    ? parsed.protocol
    : `${parsed.protocol}:`;
  const normalizedHash =
    parsed.hash && !parsed.hash.startsWith("#")
      ? `#${parsed.hash}`
      : parsed.hash;
  return `${normalizedProtocol}//${parsed.host}${normalizedPath}${search}${normalizedHash}`;
}
