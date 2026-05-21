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

  it("auto-detects system locale when called with no argument", () => {
    const s = getStrings();
    expect(s).toHaveProperty("urlLabel");
    expect(s).toHaveProperty("copyAction");
    expect(s).toHaveProperty("invalidUrl");
  });

  it("has paramLabel and paramPlaceholder for en-US", () => {
    const s = getStrings("en-US");
    expect(s.paramLabel).toBe("Param");
    expect(s.paramPlaceholder).toBe("key=value");
  });

  it("has paramLabel and paramPlaceholder for zh-CN", () => {
    const s = getStrings("zh-CN");
    expect(s.paramLabel).toBe("Param");
    expect(s.paramPlaceholder).toBe("key=value");
  });
});
