import { describe, expect, it } from "vitest";
import { translateMessage } from "../i18n/messages.js";
import { draftEnglishFromChinese, ensureBilingualText, setBilingualText, textValue } from "../i18n/userText.js";

describe("bilingual user text", () => {
  it("creates English drafts for common Chinese study text", () => {
    expect(ensureBilingualText("整理今日错题")).toEqual({
      zh: "整理今日错题",
      en: "Review today's mistakes",
    });
    expect(draftEnglishFromChinese("完成英语阅读复盘")).toBe("Complete English reading review");
  });

  it("preserves manual English translations when displaying text", () => {
    const value = { zh: "整理本周错题", en: "Clean up this week's error log" };

    expect(textValue(value, "zh")).toBe("整理本周错题");
    expect(textValue(value, "en")).toBe("Clean up this week's error log");
  });

  it("updates one language without replacing the other", () => {
    const value = setBilingualText({ zh: "整理错题", en: "Review mistakes" }, "en", "Review error patterns");

    expect(value).toEqual({ zh: "整理错题", en: "Review error patterns" });
  });

  it("translates fixed messages with Chinese fallback", () => {
    expect(translateMessage("设置", "en")).toBe("Settings");
    expect(translateMessage("设置", "zh")).toBe("设置");
    expect(translateMessage("未知文案", "en")).toBe("未知文案");
  });
});
