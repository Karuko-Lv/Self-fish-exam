import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const dashboardView = readFileSync(new URL("../views/DashboardView.vue", import.meta.url), "utf8");
const styles = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

describe("dashboard state panel layout", () => {
  it("shows the next countdown date as metadata with a right-side day count", () => {
    expect(dashboardView).toContain('import { daysUntil } from "../utils/dates.js";');
    expect(dashboardView).toContain('class="next-card-main"');
    expect(dashboardView).toContain('class="next-card-title"');
    expect(dashboardView).toContain('class="next-card-date"');
    expect(dashboardView).toContain('class="next-card-days"');
    expect(dashboardView).toContain("nextCountdownDays");
    expect(styles).toMatch(/\.next-card\s*{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto;/s);
    expect(styles).toMatch(/\.next-card-date\s*{[^}]*font-size:\s*0\.86rem;[^}]*font-variant-numeric:\s*tabular-nums;/s);
    expect(styles).toMatch(/\.next-card-days\s*{[^}]*justify-self:\s*end;[^}]*min-width:\s*70px;/s);
  });

  it("adds breathing room between the mood cards and the recommendation", () => {
    expect(dashboardView).toMatch(/class="mood-grid"[\s\S]*class="recommend-box"/);
    expect(styles).toMatch(/\.recommend-box\s*{[^}]*margin:\s*16px\s+0\s+0;/s);
  });
});
