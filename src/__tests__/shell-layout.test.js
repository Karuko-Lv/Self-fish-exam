import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const appShell = readFileSync(new URL("../components/AppShell.vue", import.meta.url), "utf8");
const timerView = readFileSync(new URL("../views/TimerView.vue", import.meta.url), "utf8");
const styles = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

function declarationsFor(selector) {
  const match = styles.match(new RegExp(`${selector.replace(".", "\\.")}\\s*{([^}]*)}`, "s"));
  return match?.[1] ?? "";
}

describe("desktop shell layout", () => {
  it("lets the pink sidebar background extend with long pages while the sidebar content stays sticky", () => {
    const shellStyles = declarationsFor(".app-shell");
    const sidebarStyles = declarationsFor(".sidebar");

    expect(appShell).toContain('class="sidebar-inner"');
    expect(shellStyles).toMatch(/(^|\s)overflow-x:\s*clip;/);
    expect(shellStyles).not.toMatch(/(^|\s)overflow-x:\s*hidden;/);
    expect(sidebarStyles).toMatch(/(^|\s)min-height:\s*100vh;/);
    expect(sidebarStyles).not.toMatch(/(^|\s)height:\s*100vh;/);
    expect(styles).toMatch(
      /\.sidebar-inner\s*{[^}]*position:\s*sticky;[^}]*top:\s*0;[^}]*min-height:\s*100vh;[^}]*height:\s*100vh;[^}]*overflow-y:\s*auto;/s,
    );
  });

  it("turns the sidebar avatar into a photo upload control", () => {
    expect(appShell).toContain('class="avatar-upload-button"');
    expect(appShell).toContain('type="file"');
    expect(appShell).toContain('accept="image/*"');
    expect(appShell).toContain('@change="handleAvatarUpload"');
    expect(appShell).toContain("avatarSrc");
    expect(styles).toMatch(/\.avatar-upload-button\s*{/);
    expect(styles).toMatch(/\.avatar-photo\s*{/);
  });

  it("keeps the Pomodoro timer mounted while navigating to other views", () => {
    expect(timerView).toContain('defineOptions({ name: "TimerView" })');
    expect(appShell).toMatch(/<KeepAlive\s+include="TimerView">\s*<component\s+:is="currentComponent"\s+:fish="props\.fish"\s*\/>\s*<\/KeepAlive>/s);
  });
});
