import { describe, expect, it } from "vitest";
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
      { id: "exam-todo-0", text: "整理错题", done: false },
      { id: "exam-todo-1", text: "背作文模板", done: false },
    ]);
  });
});
