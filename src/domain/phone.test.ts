import { describe, expect, it } from "vitest";
import { formatArMobile, maskArMobile, normalizeArMobile } from "./phone";

describe("normalizeArMobile", () => {
  it.each([
    "11 5523-8841",
    "1155238841",
    "011 15 5523 8841",
    "11 15 5523-8841",
    "+54 9 11 5523 8841",
    "+54 11 5523-8841",
    "5491155238841",
  ])("acepta %s", (input) => {
    expect(normalizeArMobile(input)).toBe("+5491155238841");
  });

  it("acepta códigos de área del interior", () => {
    expect(normalizeArMobile("0351 15 412-3456")).toBe("+5493514123456");
  });

  it.each(["", "1234", "abc", "11 5523", "0800 333 4444 55"])("rechaza %s", (input) => {
    expect(normalizeArMobile(input)).toBeNull();
  });
});

describe("formato", () => {
  it("muestra el número legible", () => {
    expect(formatArMobile("+5491155238841")).toBe("+54 9 11 5523-8841");
  });

  it("enmascara el número", () => {
    expect(maskArMobile("+5491155238841")).toBe("•••• 8841");
  });
});
