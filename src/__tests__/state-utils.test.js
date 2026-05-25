import { describe, expect, it } from "vitest";
import { shortPoolLines } from "../constants/defaults.js";
import { studyDayISO } from "../utils/dates.js";
import { localStorageKeyForUser, normalizeState } from "../utils/state.js";

describe("state utilities", () => {
  it("uses 06:00 as the study-day boundary", () => {
    expect(studyDayISO(new Date("2026-05-23T05:59:00+08:00"))).toBe("2026-05-22");
    expect(studyDayISO(new Date("2026-05-23T06:00:00+08:00"))).toBe("2026-05-23");
  });

  it("scopes localStorage keys by user id", () => {
    expect(localStorageKeyForUser("fish")).toBe("selfFish408.v1.fish");
  });

  it("normalizes empty state with required collections", () => {
    const state = normalizeState({});

    expect(state.tasks.length).toBeGreaterThan(0);
    expect(state.practiceLogs).toEqual([]);
    expect(state.sentenceLogs).toEqual([]);
    expect(state.countdownEvents.length).toBeGreaterThan(0);
    expect(state.promptCards.length).toBeGreaterThan(0);
  });

  it("normalizes sidebar avatar image settings", () => {
    const avatarImage = "data:image/png;base64,avatar";

    expect(normalizeState({}).settings.avatarImage).toBe("");
    expect(normalizeState({ settings: { avatarImage } }).settings.avatarImage).toBe(avatarImage);
    expect(normalizeState({ settings: { avatarImage: "https://example.com/avatar.png" } }).settings.avatarImage).toBe("");
  });

  it("defaults to Chinese language and migrates user text to bilingual fields", () => {
    const state = normalizeState({
      focusLogs: [{ id: "f1", note: "整理错题" }],
      countdownEvents: [
        {
          id: "c1",
          title: "本月复盘",
          date: "2026-06-01",
          todos: [{ text: "完成英语阅读复盘" }],
        },
      ],
      ideas: [{ id: "i1", text: "整理错题模板", reason: "下次更快" }],
    });

    expect(state.settings.language).toBe("zh");
    expect(state.focusLogs[0].note).toEqual({ zh: "整理错题", en: "Review mistakes" });
    expect(state.countdownEvents[0].title).toEqual({ zh: "本月复盘", en: "Monthly review" });
    expect(state.countdownEvents[0].todos[0].text).toEqual({
      zh: "完成英语阅读复盘",
      en: "Complete English reading review",
    });
    expect(state.ideas[0].text.zh).toBe("整理错题模板");
    expect(state.ideas[0].text.en).toContain("mistakes template");
  });

  it("migrates countdown notes into checkbox todos", () => {
    const state = normalizeState({
      countdownEvents: [
        {
          id: "exam",
          title: "阶段复盘",
          date: "2026-06-01",
          note: "整理错题\n背作文模板",
        },
      ],
    });

    expect(state.countdownEvents[0].todos).toEqual([
      { id: "exam-todo-0", text: { zh: "整理错题", en: "Review mistakes" }, done: false },
      { id: "exam-todo-1", text: { zh: "背作文模板", en: "背作文 template" }, done: false },
    ]);
  });

  it("migrates old mistakes into knowledge reviews", () => {
    const state = normalizeState({
      mistakes: [
        {
          id: "old-1",
          subject: "ds",
          topic: "二叉树遍历",
          cause: "概念不清",
          reviewDate: "2026-06-01",
          summary: "递归边界没想清楚。",
        },
      ],
    });

    expect(state.mistakes).toBeUndefined();
    expect(state.knowledgeReviews).toEqual([
      expect.objectContaining({
        id: "old-1",
        subject: "ds",
        topic: { zh: "二叉树遍历", en: "二叉树遍历" },
        cause: "概念不清",
        reviewDate: "2026-06-01",
        summary: { zh: "递归边界没想清楚。", en: "递归边界没想清楚." },
        reviewed: false,
      }),
    ]);
  });

  it("keeps dashboard random lines around ten motivational characters", () => {
    expect(shortPoolLines.length).toBeGreaterThan(0);
    expect(shortPoolLines.every((line) => {
      const length = Array.from(line).length;
      return length >= 9 && length <= 11;
    })).toBe(true);
  });
});
