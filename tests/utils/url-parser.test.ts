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

  it("defaults empty pathname to '/'", () => {
    const url = serialize({
      protocol: "https:",
      host: "example.com",
      pathname: "",
      params: [{ id: "1", key: "q", value: "test" }],
      hash: "",
    });
    expect(url).toBe("https://example.com/?q=test");
  });
});

describe("round-trip", () => {
  it("parse then serialize preserves the URL structure", () => {
    const original = "https://api.example.com/search?q=hello+world&page=2#results";
    const parsed = parse(original);
    expect(parsed).not.toBeNull();
    const result = serialize(parsed!);
    // Note: URLSearchParams encodes space as + by default
    expect(result).toBe("https://api.example.com/search?q=hello+world&page=2#results");
  });
});
