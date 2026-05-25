import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const timerView = readFileSync(new URL("../views/TimerView.vue", import.meta.url), "utf8");
const styles = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

function ruleBody(selector, source = styles) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return source.match(new RegExp(`${escaped}\\s*{([^}]*)}`, "s"))?.[1] ?? "";
}

function cssPxValue(body, property) {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return Number(body.match(new RegExp(`${escaped}:\\s*(-?\\d+(?:\\.\\d+)?)px`))?.[1]);
}

describe("kitty pomodoro timer layout", () => {
  it("renders a Kitty-themed timer shell without removed decorative elements", () => {
    expect(timerView).toContain('class="timer-orb kitty-timer"');
    expect(timerView).toContain('class="kitty-timer-head"');
    expect(timerView).toContain('class="kitty-timer-bow kitty-timer-bow-head"');
    expect(timerView).toContain('class="kitty-timer-bow kitty-timer-bow-center"');
    expect(timerView).toContain('class="kitty-timer-paws"');
    expect(timerView).toContain("--timer-progress");
    expect(timerView).not.toContain("kitty-timer-mini");
    expect(timerView).not.toMatch(/heart/i);
  });

  it("keeps the existing Pomodoro action buttons unchanged", () => {
    expect(timerView).toContain('<button class="primary-button" type="button" @click="start">{{ fish.t("开始") }}</button>');
    expect(timerView).toContain('<button class="secondary-button" type="button" @click="pause">{{ fish.t("暂停") }}</button>');
    expect(timerView).toContain('<button class="secondary-button" type="button" @click="reset">{{ fish.t("重置") }}</button>');
    expect(timerView).toContain('<button class="small-button" type="button" @click="complete">{{ fish.t("结束并同步") }}</button>');
  });

  it("defines responsive Kitty timer CSS without circularizing action buttons", () => {
    expect(styles).toMatch(/\.kitty-timer\s*{[^}]*--timer-progress:[^}]*conic-gradient/s);
    expect(styles).toContain(".kitty-timer-head");
    expect(styles).toContain(".kitty-timer-bow");
    expect(styles).toContain(".kitty-timer-paws");
    expect(styles).not.toContain(".kitty-timer-mini");
    expect(styles).toMatch(/@media \(max-width: 560px\)[\s\S]*\.kitty-timer\s*{/);
    expect(styles).not.toMatch(/\.timer-actions\s+button\s*{[^}]*border-radius:\s*999px[^}]*aspect-ratio:\s*1/s);
  });

  it("keeps the center bow clear of the timer mode label", () => {
    const desktopBow = ruleBody(".kitty-timer-bow-center");
    const mobileStyles = styles.match(/@media \(max-width: 560px\)\s*{([\s\S]*)}\s*$/)?.[1] ?? "";
    const mobileBow = ruleBody(".kitty-timer-bow-center", mobileStyles);

    expect(cssPxValue(desktopBow, "top")).toBeLessThanOrEqual(46);
    expect(cssPxValue(mobileBow, "top")).toBeLessThanOrEqual(36);
  });
});
