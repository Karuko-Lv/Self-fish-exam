import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const countdownView = readFileSync(new URL("../views/CountdownsView.vue", import.meta.url), "utf8");
const styles = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

describe("countdown list layout", () => {
  it("separates event details from a large right-side day count", () => {
    expect(countdownView).toContain('class="countdown-display"');
    expect(countdownView).toContain('class="countdown-main"');
    expect(countdownView).toContain('class="countdown-date"');
    expect(countdownView).toContain('class="countdown-days"');
    expect(countdownView).toContain(':class="countdownTone(event.date)"');
    expect(countdownView).toContain('class="countdown-days-number"');
    expect(countdownView).toContain('class="countdown-days-unit"');
    expect(countdownView).not.toContain("{{ event.date }} · {{ daysUntil(event.date) }}");
  });

  it("keeps the day count aligned to the right edge of the item card", () => {
    expect(styles).toMatch(
      /\.countdown-display\s*{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto;[^}]*align-items:\s*start;/s,
    );
    expect(styles).toMatch(
      /\.countdown-days\s*{[^}]*justify-self:\s*end;[^}]*text-align:\s*right;[^}]*min-width:\s*84px;/s,
    );
    expect(styles).toMatch(/\.countdown-days\s*{[^}]*border:\s*1px solid var\(--countdown-days-border\);/s);
    expect(styles).toMatch(/\.countdown-days\s*{[^}]*background:\s*var\(--countdown-days-bg\);/s);
    expect(styles).toMatch(
      /\.countdown-days-number\s*{[^}]*font-size:\s*clamp\(2\.2rem,\s*8vw,\s*3\.4rem\);/s,
    );
  });

  it("defines progressively deeper colors as countdowns get closer", () => {
    expect(countdownView).toMatch(/function countdownTone\(date\)\s*{[^}]*daysUntil\(date\)/s);
    expect(styles).toMatch(/\.countdown-days\.is-far\s*{[^}]*--countdown-days-bg:/s);
    expect(styles).toMatch(/\.countdown-days\.is-mid\s*{[^}]*--countdown-days-bg:/s);
    expect(styles).toMatch(/\.countdown-days\.is-near\s*{[^}]*--countdown-days-bg:/s);
    expect(styles).toMatch(/\.countdown-days\.is-urgent\s*{[^}]*--countdown-days-bg:/s);
  });
});
