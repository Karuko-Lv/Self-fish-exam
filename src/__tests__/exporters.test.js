import { afterEach, describe, expect, it, vi } from "vitest";

const originalGlobals = {
  Blob: globalThis.Blob,
  URL: globalThis.URL,
  document: globalThis.document,
  window: globalThis.window,
};

afterEach(() => {
  vi.restoreAllMocks();
  globalThis.Blob = originalGlobals.Blob;
  globalThis.URL = originalGlobals.URL;
  globalThis.document = originalGlobals.document;
  globalThis.window = originalGlobals.window;
});

describe("PDF exporter", () => {
  it("downloads a real pdf blob instead of opening a print window", async () => {
    const { exportPdf } = await import("../utils/exporters.js");
    const click = vi.fn();
    const link = { click, href: "", download: "" };
    const createElement = vi.fn(() => link);
    const createObjectURL = vi.fn(() => "blob:self-fish-pdf");
    const revokeObjectURL = vi.fn();
    const blobCtor = vi.fn(function Blob(parts, options) {
      this.parts = parts;
      this.type = options.type;
    });

    globalThis.Blob = blobCtor;
    globalThis.URL = { createObjectURL, revokeObjectURL };
    globalThis.document = { createElement };
    globalThis.window = {
      open: vi.fn(() => ({
        document: { write: vi.fn(), close: vi.fn() },
        focus: vi.fn(),
        print: vi.fn(),
      })),
    };

    await exportPdf("刷题记录", [{ 日期: "2026-05-31", 刷题记录: "二叉树遍历错因整理" }], {
      now: new Date("2026-05-31T08:00:00+08:00"),
    });

    expect(globalThis.window.open).not.toHaveBeenCalled();
    expect(blobCtor).toHaveBeenCalledWith([expect.any(Uint8Array)], { type: "application/pdf" });
    expect(link.download).toBe("刷题记录.pdf");
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:self-fish-pdf");
  });

  it("serializes jpeg pages into a valid multipage pdf byte stream", async () => {
    const { createPdfBytesFromJpegPages } = await import("../utils/exporters.js");
    const jpg = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2w==";

    const bytes = createPdfBytesFromJpegPages([
      { dataUrl: jpg, width: 1200, height: 1600 },
      { dataUrl: jpg, width: 1200, height: 1600 },
    ]);
    const asText = new TextDecoder("latin1").decode(bytes);

    expect(asText.startsWith("%PDF-1.4")).toBe(true);
    expect(asText).toContain("/Count 2");
    expect(asText.match(/\/Subtype \/Image/g)).toHaveLength(2);
    expect(asText).toContain("/Filter /DCTDecode");
    expect(asText.trimEnd().endsWith("%%EOF")).toBe(true);
  });

  it("paginates long practice text instead of clipping it into one card", async () => {
    const { renderPdfReportPages } = await import("../utils/exporters.js");
    const jpg = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2w==";
    const context = {
      beginPath: vi.fn(),
      bezierCurveTo: vi.fn(),
      closePath: vi.fn(),
      createLinearGradient: () => ({ addColorStop: vi.fn() }),
      fill: vi.fn(),
      fillRect: vi.fn(),
      fillText: vi.fn(),
      lineTo: vi.fn(),
      measureText: (text) => ({ width: Array.from(String(text)).length * 20 }),
      moveTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
      restore: vi.fn(),
      save: vi.fn(),
      stroke: vi.fn(),
    };
    const document = {
      createElement: () => ({
        width: 0,
        height: 0,
        getContext: () => context,
        toDataURL: () => jpg,
      }),
    };
    const longText = "这是一条需要完整导出的刷题复盘。".repeat(260);

    const pages = await renderPdfReportPages(
      "最近刷题记录",
      [{ 日期: "2026-05-31", 题源: "长文本记录", 刷题记录: longText }],
      { document, now: new Date("2026-05-31T08:00:00+08:00") },
    );

    expect(pages.length).toBeGreaterThan(1);
  });

  it("wraps body text using the same font size that will be drawn", async () => {
    const { renderPdfReportPages } = await import("../utils/exporters.js");
    const jpg = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2w==";
    const drawnLines = [];
    const context = {
      font: "10px sans-serif",
      beginPath: vi.fn(),
      bezierCurveTo: vi.fn(),
      closePath: vi.fn(),
      createLinearGradient: () => ({ addColorStop: vi.fn() }),
      fill: vi.fn(),
      fillRect: vi.fn(),
      fillText: (text) => drawnLines.push(String(text)),
      lineTo: vi.fn(),
      measureText(text) {
        const fontSize = Number(String(this.font).match(/(\d+)px/)?.[1] || 10);
        return { width: Array.from(String(text)).length * fontSize };
      },
      moveTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
      restore: vi.fn(),
      save: vi.fn(),
      stroke: vi.fn(),
    };
    const document = {
      createElement: () => ({
        width: 0,
        height: 0,
        getContext: () => context,
        toDataURL: () => jpg,
      }),
    };
    const mixedText = "范围广的一般不选，比如may怎么怎么样、possible就比一个客观的肯定叙事更容易成为正确答案。".repeat(2);

    await renderPdfReportPages(
      "最近刷题记录",
      [{ 日期: "2026-05-31", 题源: "2010 text2", 刷题记录: mixedText }],
      { document, now: new Date("2026-05-31T08:00:00+08:00") },
    );

    const bodyLines = drawnLines.filter((line) => line.includes("possible") || line.includes("范围广"));
    expect(bodyLines.length).toBeGreaterThan(1);
    expect(bodyLines.every((line) => Array.from(line).length <= 36)).toBe(true);
  });
});
