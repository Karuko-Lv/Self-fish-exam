import { describe, expect, it } from "vitest";
import { buildReminderText, getTodayStats, shouldWarn } from "../composables/useStudyReminder.js";

function mockFish(logs) {
  return {
    state: { pomodoroLogs: logs },
  };
}

describe("getTodayStats", () => {
  it("returns zeros for empty logs", () => {
    const stats = getTodayStats(mockFish([]));
    expect(stats).toEqual({ studyMin: 0, nonStudyMin: 0, total: 0 });
  });

  it("sums study and non-study minutes from today only", () => {
    const today = new Date().toISOString().slice(0, 10);
    const fish = mockFish([
      { date: today, subject: "ds", minutes: 25 },
      { date: today, subject: "os", minutes: 50 },
      { date: today, subject: "nonStudy", minutes: 10 },
      { date: "2020-01-01", subject: "ds", minutes: 999 },
    ]);
    const stats = getTodayStats(fish);
    expect(stats.studyMin).toBe(75);
    expect(stats.nonStudyMin).toBe(10);
    expect(stats.total).toBe(85);
  });

  it("handles missing minutes field", () => {
    const today = new Date().toISOString().slice(0, 10);
    const fish = mockFish([
      { date: today, subject: "ds" },
      { date: today, subject: "nonStudy" },
    ]);
    const stats = getTodayStats(fish);
    expect(stats.studyMin).toBe(0);
    expect(stats.nonStudyMin).toBe(0);
    expect(stats.total).toBe(0);
  });
});

describe("shouldWarn", () => {
  it("does not warn when total is below 10 minutes", () => {
    expect(shouldWarn({ studyMin: 0, nonStudyMin: 9, total: 9 })).toBe(false);
  });

  it("does not warn when non-study is exactly half", () => {
    expect(shouldWarn({ studyMin: 10, nonStudyMin: 10, total: 20 })).toBe(false);
  });

  it("does not warn when study dominates", () => {
    expect(shouldWarn({ studyMin: 20, nonStudyMin: 5, total: 25 })).toBe(false);
  });

  it("warns when non-study is more than half and total >= 10", () => {
    expect(shouldWarn({ studyMin: 4, nonStudyMin: 6, total: 10 })).toBe(true);
  });

  it("warns when total is exactly 10 and non-study dominates", () => {
    expect(shouldWarn({ studyMin: 3, nonStudyMin: 7, total: 10 })).toBe(true);
  });
});

describe("buildReminderText", () => {
  it("builds normal reminder text", () => {
    const text = buildReminderText(5, 30, false);
    expect(text).toBe("已学习 30 分钟，当前这颗番茄已进行 5 分钟。");
  });

  it("builds forceful warning reminder text", () => {
    const text = buildReminderText(10, 4, true);
    expect(text).toBe("今天非学习时间已经占大头了，再这样真要考不上了。回来学：当前已进行 10 分钟，今日有效学习 4 分钟。");
  });

  it("normal reminder includes correct active and study minutes", () => {
    const text = buildReminderText(15, 45, false);
    expect(text).toContain("已学习 45 分钟");
    expect(text).toContain("已进行 15 分钟");
  });
});
