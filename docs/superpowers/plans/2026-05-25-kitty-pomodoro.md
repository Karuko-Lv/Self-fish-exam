# Kitty Pomodoro Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Pomodoro page's plain timer orb with a high-fidelity pink Kitty countdown visual while keeping existing controls unchanged and removing the heart effect.

**Architecture:** Keep all behavior in `src/views/TimerView.vue` and all visual styling in `src/styles.css`. The timer view exposes a CSS custom property for progress, while CSS draws the ring, Kitty head, bows, small Kitty, dotted accents, and paw details without external image assets.

**Tech Stack:** Vue 3 single-file components, Vite, Vitest, plain CSS.

---

### Task 1: Add Pomodoro Visual Contract Tests

**Files:**
- Create: `src/__tests__/timer-kitty-layout.test.js`
- Read: `src/views/TimerView.vue`
- Read: `src/styles.css`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/timer-kitty-layout.test.js`:

```js
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const timerView = readFileSync(new URL("../views/TimerView.vue", import.meta.url), "utf8");
const styles = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

describe("kitty pomodoro timer layout", () => {
  it("renders a Kitty-themed timer shell without the removed heart effect", () => {
    expect(timerView).toContain('class="timer-orb kitty-timer"');
    expect(timerView).toContain('class="kitty-timer-head"');
    expect(timerView).toContain('class="kitty-timer-bow kitty-timer-bow-head"');
    expect(timerView).toContain('class="kitty-timer-bow kitty-timer-bow-center"');
    expect(timerView).toContain('class="kitty-timer-mini"');
    expect(timerView).toContain('class="kitty-timer-paws"');
    expect(timerView).toContain("--timer-progress");
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
    expect(styles).toContain(".kitty-timer-mini");
    expect(styles).toContain(".kitty-timer-bow");
    expect(styles).toContain(".kitty-timer-paws");
    expect(styles).toMatch(/@media \(max-width: 560px\)[\s\S]*\.kitty-timer\s*{/);
    expect(styles).not.toMatch(/\.timer-actions\s+button\s*{[^}]*border-radius:\s*999px[^}]*aspect-ratio:\s*1/s);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- src/__tests__/timer-kitty-layout.test.js
```

Expected: FAIL because `src/__tests__/timer-kitty-layout.test.js` expects `.kitty-timer` markup and CSS classes that do not exist yet.

- [ ] **Step 3: Commit red test if desired**

Do not commit this failing test alone in this working session. Keep it as the red side of the TDD loop, then implement the feature.

### Task 2: Add Kitty Timer Markup and Progress State

**Files:**
- Modify: `src/views/TimerView.vue`
- Test: `src/__tests__/timer-kitty-layout.test.js`

- [ ] **Step 1: Add the progress computed value**

In `src/views/TimerView.vue`, keep the existing `display` computed and add:

```js
const timerProgress = computed(() => {
  if (!timer.seconds) return 0;
  if (timer.direction === "down") {
    return Math.min(1, Math.max(0, (timer.seconds - timer.remaining) / timer.seconds));
  }
  return Math.min(1, Math.max(0, (timer.seconds - timer.remaining) / timer.seconds));
});
```

- [ ] **Step 2: Replace only the timer orb markup**

Replace the current:

```vue
<div class="timer-orb"><div class="timer-core"><span>{{ fish.t(timer.mode) }}</span><strong>{{ display }}</strong><small>{{ fish.t("小小鱼，先游一段。") }}</small></div></div>
```

with:

```vue
<div class="timer-orb kitty-timer" :style="{ '--timer-progress': `${timerProgress * 360}deg` }" aria-label="Pomodoro timer">
  <div class="kitty-timer-head" aria-hidden="true">
    <span class="kitty-timer-ear kitty-timer-ear-left"></span>
    <span class="kitty-timer-ear kitty-timer-ear-right"></span>
    <span class="kitty-timer-bow kitty-timer-bow-head"></span>
    <span class="kitty-timer-eye kitty-timer-eye-left"></span>
    <span class="kitty-timer-eye kitty-timer-eye-right"></span>
    <span class="kitty-timer-nose"></span>
    <span class="kitty-timer-whisker kitty-timer-whisker-left"></span>
    <span class="kitty-timer-whisker kitty-timer-whisker-right"></span>
    <span class="kitty-timer-paw kitty-timer-paw-left"></span>
    <span class="kitty-timer-paw kitty-timer-paw-right"></span>
  </div>
  <span class="kitty-timer-bow kitty-timer-bow-center" aria-hidden="true"></span>
  <span class="kitty-timer-bow kitty-timer-bow-left" aria-hidden="true"></span>
  <span class="kitty-timer-bow kitty-timer-bow-right" aria-hidden="true"></span>
  <span class="kitty-timer-mini" aria-hidden="true"></span>
  <span class="kitty-timer-paws" aria-hidden="true"></span>
  <div class="timer-core">
    <span>{{ fish.t(timer.mode) }}</span>
    <strong>{{ display }}</strong>
    <small>{{ fish.t("小小鱼，先游一段。") }}</small>
  </div>
</div>
```

- [ ] **Step 3: Run the focused test**

Run:

```bash
npm test -- src/__tests__/timer-kitty-layout.test.js
```

Expected: still FAIL because CSS classes are not implemented yet.

### Task 3: Implement Kitty Timer CSS

**Files:**
- Modify: `src/styles.css`
- Test: `src/__tests__/timer-kitty-layout.test.js`

- [ ] **Step 1: Replace the plain timer orb CSS block**

In `src/styles.css`, replace the current `.timer-orb`, `.timer-core`, and `.timer-core strong` block with Kitty-specific styles:

```css
.timer-orb {
  width: min(360px, 100%);
  aspect-ratio: 1;
  margin: 34px auto 0;
  border-radius: 999px;
  display: grid;
  place-items: center;
  position: relative;
}
.kitty-timer {
  --timer-progress: 0deg;
  isolation: isolate;
  background:
    radial-gradient(circle, #fff 0 47%, transparent 48%),
    conic-gradient(var(--pink) 0 var(--timer-progress), #ffcade var(--timer-progress) 360deg);
  box-shadow:
    0 20px 42px rgba(201, 64, 117, 0.18),
    inset 0 0 0 10px rgba(255, 255, 255, 0.72),
    inset 0 0 0 18px rgba(255, 214, 228, 0.55);
}
.kitty-timer::before {
  content: "";
  position: absolute;
  inset: 16px;
  border-radius: inherit;
  border: 5px solid rgba(255, 149, 184, 0.42);
}
.kitty-timer::after {
  content: "";
  position: absolute;
  inset: 28px;
  border-radius: inherit;
  background-image:
    radial-gradient(circle, #f06a99 0 2px, transparent 3px),
    radial-gradient(circle, #ffbad0 0 2px, transparent 3px);
  background-size: 38px 38px, 58px 58px;
  mask: radial-gradient(circle, transparent 0 52%, #000 53% 100%);
  opacity: 0.82;
}
.timer-core {
  width: 58%;
  aspect-ratio: 1;
  border-radius: 999px;
  background: #fff;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 10px;
  position: relative;
  z-index: 2;
  box-shadow: inset 0 0 0 1px rgba(232, 93, 143, 0.12);
}
.timer-core span {
  color: var(--pink);
  font-weight: 900;
}
.timer-core strong {
  color: var(--pink);
  font-size: clamp(2.4rem, 8vw, 4rem);
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.timer-core small {
  max-width: 82%;
  border-radius: 999px;
  padding: 7px 12px;
  background: #ffe3ec;
  color: var(--pink);
  font-weight: 800;
  text-align: center;
  line-height: 1.35;
}
```

- [ ] **Step 2: Add Kitty decorative CSS**

Add these classes after `.timer-core small`:

```css
.kitty-timer-head {
  position: absolute;
  top: -58px;
  left: 50%;
  width: 148px;
  height: 102px;
  transform: translateX(-50%);
  border: 4px solid #9c5361;
  border-radius: 46% 46% 38% 38%;
  background: #fff;
  box-shadow: 0 11px 22px rgba(201, 64, 117, 0.17);
  z-index: 4;
}
.kitty-timer-ear {
  position: absolute;
  top: -12px;
  width: 32px;
  height: 32px;
  background: #fff;
  border-top: 4px solid #9c5361;
  z-index: -1;
}
.kitty-timer-ear-left {
  left: 8px;
  border-left: 4px solid #9c5361;
  border-radius: 10px 0 0 0;
  transform: rotate(24deg);
}
.kitty-timer-ear-right {
  right: 8px;
  border-right: 4px solid #9c5361;
  border-radius: 0 10px 0 0;
  transform: rotate(-24deg);
}
.kitty-timer-eye {
  position: absolute;
  top: 49px;
  width: 10px;
  height: 15px;
  border-radius: 999px;
  background: #583139;
}
.kitty-timer-eye-left { left: 42px; }
.kitty-timer-eye-right { right: 42px; }
.kitty-timer-nose {
  position: absolute;
  top: 57px;
  left: 50%;
  width: 17px;
  height: 12px;
  transform: translateX(-50%);
  border: 3px solid #e4a025;
  border-radius: 999px;
  background: #ffd669;
}
.kitty-timer-whisker {
  position: absolute;
  top: 55px;
  width: 34px;
  height: 20px;
}
.kitty-timer-whisker::before,
.kitty-timer-whisker::after {
  content: "";
  position: absolute;
  left: 0;
  width: 34px;
  height: 3px;
  border-radius: 999px;
  background: #583139;
}
.kitty-timer-whisker::before { top: 1px; transform: rotate(8deg); }
.kitty-timer-whisker::after { bottom: 1px; transform: rotate(-8deg); }
.kitty-timer-whisker-left { left: -24px; }
.kitty-timer-whisker-right { right: -24px; transform: scaleX(-1); }
.kitty-timer-paw {
  position: absolute;
  bottom: -7px;
  width: 39px;
  height: 29px;
  border: 3px solid #d993a6;
  border-radius: 18px;
  background: #fff;
}
.kitty-timer-paw-left { left: 28px; }
.kitty-timer-paw-right { right: 28px; }
.kitty-timer-bow {
  position: absolute;
  width: 82px;
  height: 48px;
  border-radius: 24px;
  background:
    radial-gradient(circle at 50% 50%, #ff70a4 0 13px, transparent 14px),
    radial-gradient(circle at 27% 50%, #ff9dbc 0 23px, transparent 24px),
    radial-gradient(circle at 73% 50%, #ff9dbc 0 23px, transparent 24px);
  filter: drop-shadow(0 5px 7px rgba(201, 64, 117, 0.22));
  z-index: 5;
}
.kitty-timer-bow-head {
  top: -22px;
  right: -10px;
  transform: rotate(10deg) scale(0.95);
}
.kitty-timer-bow-center {
  top: 58px;
  left: 50%;
  transform: translateX(-50%) scale(0.7);
}
.kitty-timer-bow-left {
  left: 19px;
  top: 54%;
  transform: scale(0.42);
}
.kitty-timer-bow-right {
  right: 19px;
  top: 54%;
  transform: scale(0.42);
}
.kitty-timer-mini {
  position: absolute;
  right: 31px;
  top: 40%;
  width: 58px;
  height: 43px;
  border: 3px solid #57323a;
  border-radius: 48%;
  background:
    radial-gradient(circle at 35% 48%, #57323a 0 2px, transparent 3px),
    radial-gradient(circle at 66% 48%, #57323a 0 2px, transparent 3px),
    radial-gradient(circle at 50% 63%, #ffd669 0 4px, transparent 5px),
    #fff;
  transform: rotate(15deg);
  z-index: 3;
}
.kitty-timer-mini::after {
  content: "";
  position: absolute;
  right: -8px;
  top: -8px;
  width: 25px;
  height: 18px;
  background:
    radial-gradient(circle at 30% 50%, #ff7aa4 0 7px, transparent 8px),
    radial-gradient(circle at 70% 50%, #ff7aa4 0 7px, transparent 8px);
}
.kitty-timer-paws {
  position: absolute;
  right: 23px;
  bottom: 76px;
  width: 70px;
  height: 52px;
  z-index: 2;
  background:
    radial-gradient(circle at 14px 12px, #f06a99 0 4px, transparent 5px),
    radial-gradient(circle at 24px 12px, #f06a99 0 4px, transparent 5px),
    radial-gradient(circle at 19px 23px, #f06a99 0 6px, transparent 7px),
    radial-gradient(circle at 48px 31px, #f06a99 0 4px, transparent 5px),
    radial-gradient(circle at 58px 31px, #f06a99 0 4px, transparent 5px),
    radial-gradient(circle at 53px 42px, #f06a99 0 6px, transparent 7px);
  opacity: 0.9;
}
```

- [ ] **Step 3: Update mobile timer sizing**

In the existing `@media (max-width: 560px)` block, replace the old timer rules:

```css
.timer-orb { width: min(260px, 100%); }
.timer-core strong { font-size: 2.25rem; }
```

with:

```css
.timer-orb { width: min(282px, 100%); margin-top: 30px; }
.kitty-timer-head { width: 118px; height: 82px; top: -43px; }
.kitty-timer-eye { top: 39px; }
.kitty-timer-eye-left { left: 33px; }
.kitty-timer-eye-right { right: 33px; }
.kitty-timer-nose { top: 47px; }
.kitty-timer-whisker { top: 45px; transform: scale(0.82); }
.kitty-timer-whisker-left { left: -20px; }
.kitty-timer-whisker-right { right: -20px; transform: scaleX(-1) scale(0.82); }
.kitty-timer-paw { width: 32px; height: 24px; }
.kitty-timer-paw-left { left: 23px; }
.kitty-timer-paw-right { right: 23px; }
.kitty-timer-bow-head { transform: rotate(10deg) scale(0.75); }
.kitty-timer-bow-center { top: 45px; transform: translateX(-50%) scale(0.54); }
.kitty-timer-bow-left,
.kitty-timer-bow-right { transform: scale(0.32); }
.kitty-timer-mini { width: 47px; height: 35px; right: 22px; }
.kitty-timer-paws { right: 14px; bottom: 58px; transform: scale(0.82); transform-origin: right bottom; }
.timer-core strong { font-size: 2.45rem; }
.timer-core small { font-size: 0.78rem; padding: 6px 9px; }
```

- [ ] **Step 4: Run the focused test**

Run:

```bash
npm test -- src/__tests__/timer-kitty-layout.test.js
```

Expected: PASS.

### Task 4: Verify App Behavior and Visual Rendering

**Files:**
- Verify: `src/views/TimerView.vue`
- Verify: `src/styles.css`
- Verify: `src/__tests__/timer-kitty-layout.test.js`

- [ ] **Step 1: Run the full test suite**

Run:

```bash
npm test
```

Expected: PASS for all Vitest files.

- [ ] **Step 2: Build the app**

Run:

```bash
npm run build
```

Expected: Vite production build completes successfully.

- [ ] **Step 3: Open the Pomodoro page in the browser**

Use the existing local Vite app at `http://localhost:5173/`. If the server is not running, start it with:

```bash
npm run dev
```

Navigate to the `番茄钟` page.

- [ ] **Step 4: Manually check behavior**

Confirm:

- The timer shows the Kitty ring and decorative elements.
- No beating-heart element is present.
- The existing action buttons remain rectangular and keep labels `开始`, `暂停`, `重置`, and `结束并同步`.
- Clicking `开始` changes the countdown.
- Clicking `暂停` stops the countdown.
- Clicking `重置` restores the selected preset.
- The `25 专注`, `5 休息`, and `50 深潜` presets still update the display.

- [ ] **Step 5: Commit implementation**

Run:

```bash
git add src/__tests__/timer-kitty-layout.test.js src/views/TimerView.vue src/styles.css docs/superpowers/plans/2026-05-25-kitty-pomodoro.md
git commit -m "Add kitty pomodoro timer visual"
```
