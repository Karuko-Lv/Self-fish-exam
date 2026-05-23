# Vue Kitty Multiuser Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Self-fish with Vue 3, a full-page pink Hello Kitty interface, two configured login accounts, and per-user cloud sync through the same deployed URL.

**Architecture:** Keep `server.js` as the production entry point and add session-based authentication around per-user state files. Build the frontend as a Vue 3 + Vite single-page app with view-state navigation, reusable components, and composables for auth, storage, timer behavior, and notifications.

**Tech Stack:** Node.js HTTP server, Vue 3, Vite, `@vitejs/plugin-vue`, Vitest, browser `fetch`, localStorage, cookie-backed sessions, JSON file persistence.

---

## File Structure

- Modify `package.json`: add Vue/Vite/Vitest dependencies and scripts.
- Modify `server.js`: serve `dist`, add login/session APIs, add per-user state persistence.
- Create `src/main.js`: Vue entry point.
- Create `src/App.vue`: auth gate and shell composition.
- Create `src/styles.css`: full pink Hello Kitty theme and responsive layout.
- Create `src/constants/defaults.js`: subjects, statuses, default tasks, moods, seed topics, static labels.
- Create `src/utils/dates.js`: date and study-day helpers.
- Create `src/utils/state.js`: state normalization and import/export helpers.
- Create `src/composables/useAuth.js`: login, logout, current-user session checks.
- Create `src/composables/useSelfFishState.js`: normalized state, persistence, all state actions.
- Create `src/composables/useTimer.js`: timer state and completion helpers.
- Create `src/composables/useToast.js`: toast queue.
- Create `src/components/*.vue`: shell, nav, login, cards, toast host.
- Create `src/views/*.vue`: one view per existing feature.
- Create `src/__tests__/*.test.js`: unit tests for server auth helpers, dates, state normalization, and per-user local storage keys.
- Modify `README.md`: document login accounts, cloud deployment, and multi-device sync.
- Modify `railway.json` only if the build/start flow requires it.

## Task 1: Dependencies And Test Harness

**Files:**
- Modify: `package.json`
- Create: `src/__tests__/smoke.test.js`

- [ ] **Step 1: Add a failing smoke test**

Create `src/__tests__/smoke.test.js`:

```js
import { describe, expect, it } from "vitest";

describe("test harness", () => {
  it("runs Vitest", () => {
    expect("self-fish").toBe("self-fish");
  });
});
```

- [ ] **Step 2: Run the test before dependencies exist**

Run: `npm test -- --run src/__tests__/smoke.test.js`

Expected: command fails because `vitest` is not installed or no test script exists.

- [ ] **Step 3: Add scripts and dependencies**

Update `package.json` scripts:

```json
{
  "scripts": {
    "dev": "vite --host 0.0.0.0",
    "build": "vite build",
    "preview": "vite preview --host 0.0.0.0",
    "start": "node server.js",
    "test": "vitest"
  }
}
```

Add dependencies:

```json
{
  "dependencies": {
    "@vitejs/plugin-vue": "^5.2.4",
    "vite": "^6.3.5",
    "vue": "^3.5.16"
  },
  "devDependencies": {
    "vitest": "^3.1.4"
  }
}
```

- [ ] **Step 4: Install dependencies**

Run: `npm install`

Expected: dependencies install and `package-lock.json` is created.

- [ ] **Step 5: Verify smoke test passes**

Run: `npm test -- --run src/__tests__/smoke.test.js`

Expected: `1 passed`.

## Task 2: Server Auth And Per-User Storage

**Files:**
- Modify: `server.js`
- Create: `src/__tests__/server-auth.test.js`

- [ ] **Step 1: Write failing auth utility tests**

Create `src/__tests__/server-auth.test.js`:

```js
import { describe, expect, it } from "vitest";
import {
  createPasswordHash,
  getUserStateFile,
  safeUserId,
  verifyPassword,
} from "../../server.js";

describe("server auth helpers", () => {
  it("hashes and verifies a password without storing plaintext", () => {
    const hash = createPasswordHash("secret-study");
    expect(hash).not.toContain("secret-study");
    expect(verifyPassword("secret-study", hash)).toBe(true);
    expect(verifyPassword("wrong", hash)).toBe(false);
  });

  it("rejects unsafe user ids", () => {
    expect(() => safeUserId("../bad")).toThrow("Invalid user id");
    expect(safeUserId("fish_01")).toBe("fish_01");
  });

  it("stores each user in a separate state file", () => {
    expect(getUserStateFile("/app/data", "fish")).toBe("/app/data/users/fish/state.json");
    expect(getUserStateFile("/app/data", "kitty")).toBe("/app/data/users/kitty/state.json");
  });
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- --run src/__tests__/server-auth.test.js`

Expected: fails because `server.js` does not export these helpers.

- [ ] **Step 3: Implement server helpers and APIs**

Refactor `server.js` so it exports helper functions when imported and only starts
the HTTP server when run directly. Add:

- `POST /api/login`
- `GET /api/me`
- `POST /api/logout`
- session cookie parsing and issuance
- per-user state file reads/writes
- authenticated `/api/state`

Use environment variable `SELF_FISH_USERS` for account config as JSON:

```json
[
  {"id":"fish","name":"小小鱼","username":"fish","password":"change-me"},
  {"id":"kitty","name":"Kitty","username":"kitty","password":"change-me-too"}
]
```

For production, support hashed passwords in the same field. Plain passwords are
hashed on load for compatibility with easy first setup, but generated persisted
files must not write plaintext passwords.

- [ ] **Step 4: Verify server auth tests pass**

Run: `npm test -- --run src/__tests__/server-auth.test.js`

Expected: all tests pass.

## Task 3: State And Date Utilities

**Files:**
- Create: `src/constants/defaults.js`
- Create: `src/utils/dates.js`
- Create: `src/utils/state.js`
- Create: `src/__tests__/state-utils.test.js`

- [ ] **Step 1: Write failing state/date tests**

Create `src/__tests__/state-utils.test.js`:

```js
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
  });
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- --run src/__tests__/state-utils.test.js`

Expected: fails because utilities do not exist.

- [ ] **Step 3: Implement utilities**

Move current constants and normalization logic from `app.js` into focused
modules. Preserve current default exam date, subjects, seed topics, default
tasks, moods, mistake causes, distraction types, and countdown defaults.

- [ ] **Step 4: Verify tests pass**

Run: `npm test -- --run src/__tests__/state-utils.test.js`

Expected: all tests pass.

## Task 4: Vue App Shell And Auth Gate

**Files:**
- Create: `index.html`
- Create: `src/main.js`
- Create: `src/App.vue`
- Create: `src/components/LoginScreen.vue`
- Create: `src/components/AppShell.vue`
- Create: `src/components/SidebarNav.vue`
- Create: `src/components/ToastHost.vue`
- Create: `src/composables/useAuth.js`
- Create: `src/composables/useToast.js`
- Create: `src/styles.css`

- [ ] **Step 1: Implement Vue shell**

Build a login-first Vue app:

- On load, call `/api/me`.
- If unauthenticated, show `LoginScreen`.
- On successful login, show `AppShell`.
- `AppShell` shows Kitty brand, current user, logout, and all existing nav items.

- [ ] **Step 2: Verify build**

Run: `npm run build`

Expected: Vite build succeeds and creates `dist`.

## Task 5: State Composable And Existing Feature Views

**Files:**
- Create: `src/composables/useSelfFishState.js`
- Create: `src/composables/useTimer.js`
- Create: `src/views/DashboardView.vue`
- Create: `src/views/CountdownsView.vue`
- Create: `src/views/SubjectMapView.vue`
- Create: `src/views/PracticeView.vue`
- Create: `src/views/SentencesView.vue`
- Create: `src/views/TimerView.vue`
- Create: `src/views/DistractionsView.vue`
- Create: `src/views/MistakesView.vue`
- Create: `src/views/IdeasView.vue`
- Create: `src/views/WeeklyReviewView.vue`
- Create: `src/views/SettingsView.vue`

- [ ] **Step 1: Implement state actions**

Expose actions for every existing mutation: add/delete focus logs, practice
logs, sentence logs, countdowns, distractions, mistakes, ideas, task toggles,
topic status changes, import/export, reset, and timer session completion.

- [ ] **Step 2: Implement views**

Recreate each existing feature as a Vue view. Keep form fields, labels, current
default values, filters, and generated advice behavior.

- [ ] **Step 3: Verify build**

Run: `npm run build`

Expected: Vite build succeeds.

## Task 6: Server Static Hosting And Deployment Docs

**Files:**
- Modify: `server.js`
- Modify: `README.md`
- Modify: `railway.json` if required

- [ ] **Step 1: Serve built Vue app**

Update static hosting so production serves files from `dist`, falls back to
`dist/index.html` for frontend navigation, and still serves API routes first.

- [ ] **Step 2: Update README**

Document:

- local dev with `npm run dev`
- production build with `npm run build`
- production start with `npm start`
- `SELF_FISH_USERS`
- `SELF_FISH_DATA_DIR`
- Railway persistent volume setup
- multi-device sync through the deployed HTTPS URL

- [ ] **Step 3: Verify production start**

Run: `npm run build`

Expected: build succeeds.

Run: `npm start`

Expected: server starts and reports the local URL and data directory.

## Task 7: Browser Verification

**Files:**
- No new source files expected.

- [ ] **Step 1: Verify unauthenticated route**

Open `http://localhost:5173`.

Expected: login screen appears, no private data is rendered.

- [ ] **Step 2: Verify account isolation**

Log in as account A, create a practice log, log out, log in as account B.

Expected: account B does not see account A's practice log.

- [ ] **Step 3: Verify same-account sync**

Use two browser profiles or clear localStorage, log in as account A, and reload.

Expected: server state reloads account A's saved data.

- [ ] **Step 4: Verify responsive theme**

Check desktop and mobile widths.

Expected: full-page pink Kitty theme remains readable, navigation remains
usable, forms do not overflow, and high-frequency actions remain easy to reach.

## Self-Review

- Spec coverage: all confirmed requirements are represented: Vue rewrite,
  full feature preservation, pink Hello Kitty theme, two accounts, future
  multi-user path, deployed link access, and multi-device sync.
- Placeholder scan: no deferred implementation placeholders remain.
- Type consistency: user ids, scoped localStorage keys, and `/api/state`
  per-user behavior are named consistently across tasks.
