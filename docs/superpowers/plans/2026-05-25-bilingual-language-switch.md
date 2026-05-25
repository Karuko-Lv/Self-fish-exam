# Bilingual Language Switch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Chinese/English settings switch with local-dictionary UI translation and editable English translations for user-entered content.

**Architecture:** Add a small internal i18n layer instead of an external dependency. Normalize user-entered strings into `{ zh, en }` bilingual text objects, expose `fish.t()` for fixed UI text and `fish.tx()` for user content, and reuse a compact `BilingualTextEditor` component for English translation edits.

**Tech Stack:** Vue 3, Vite, Vitest, existing `useSelfFishState` composable and normalization utilities.

---

### Task 1: I18n Text Utilities

**Files:**
- Create: `src/i18n/messages.js`
- Create: `src/i18n/userText.js`
- Test: `src/__tests__/i18n-user-text.test.js`

- [ ] **Step 1: Write failing tests for bilingual text helpers**

```js
import { describe, expect, it } from "vitest";
import { draftEnglishFromChinese, ensureBilingualText, setBilingualText, textValue } from "../i18n/userText.js";
import { translateMessage } from "../i18n/messages.js";

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
```

- [ ] **Step 2: Run the focused i18n test and verify it fails**

Run: `npm test -- src/__tests__/i18n-user-text.test.js`

Expected: FAIL because `src/i18n/userText.js` and `src/i18n/messages.js` do not exist.

- [ ] **Step 3: Implement the message dictionary and user text helpers**

Create `src/i18n/messages.js` with `translateMessage(message, language, params)`.

Create `src/i18n/userText.js` with:

```js
export function draftEnglishFromChinese(text) {}
export function ensureBilingualText(value) {}
export function textValue(value, language) {}
export function setBilingualText(value, language, nextText) {}
```

Use deterministic local phrase replacement and keep unknown text intact.

- [ ] **Step 4: Run the i18n tests and verify they pass**

Run: `npm test -- src/__tests__/i18n-user-text.test.js`

Expected: PASS.

### Task 2: State Migration And Language Settings

**Files:**
- Modify: `src/utils/state.js`
- Modify: `src/composables/useSelfFishState.js`
- Test: `src/__tests__/state-utils.test.js`

- [ ] **Step 1: Write failing tests for state language and bilingual migration**

Add tests that assert:

```js
const state = normalizeState({
  focusLogs: [{ id: "f1", note: "整理错题" }],
  countdownEvents: [{ id: "c1", title: "本月复盘", date: "2026-06-01", todos: [{ text: "完成英语阅读复盘" }] }],
  ideas: [{ id: "i1", text: "整理错题模板", reason: "下次更快" }],
});

expect(state.settings.language).toBe("zh");
expect(state.focusLogs[0].note.en).toContain("Review");
expect(state.countdownEvents[0].title.en).toBe("Monthly review");
expect(state.countdownEvents[0].todos[0].text.en).toBe("Complete English reading review");
expect(state.ideas[0].text.zh).toBe("整理错题模板");
```

Add a test for `fish` helpers through direct utility coverage if a composable harness is not available.

- [ ] **Step 2: Run state utility tests and verify the new tests fail**

Run: `npm test -- src/__tests__/state-utils.test.js`

Expected: FAIL because state fields still remain strings and language defaults are missing.

- [ ] **Step 3: Normalize bilingual fields**

Use `ensureBilingualText` in `normalizeState` for:

- `tasks[].title`
- `tasks[].detail`
- `countdownEvents[].title`
- `countdownEvents[].note`
- `countdownEvents[].todos[].text`
- `promptCards[].text`
- `practiceLogs[].source`
- `practiceLogs[].note`
- `sentenceLogs[].text`
- `sentenceLogs[].source`
- `sentenceLogs[].note`
- `focusLogs[].note`
- `pomodoroLogs[].mode`
- `pomodoroLogs[].note`
- `distractionLogs[].text`
- `knowledgeReviews[].topic`
- `knowledgeReviews[].summary`
- `ideas[].text`
- `ideas[].reason`

- [ ] **Step 4: Expose language helpers in `useSelfFishState`**

Add computed helpers and actions:

```js
const language = computed(() => state.settings.language || "zh");
const isEnglish = computed(() => language.value === "en");
function setLanguage(nextLanguage) {}
function t(message, params) {}
function tx(value) {}
function textSource(value) {}
function updateTranslation(collection, id, field, nextText) {}
function updateCountdownTodoTranslation(eventId, todoId, nextText) {}
```

Update add/edit actions so submitted text fields become bilingual text.

- [ ] **Step 5: Run state utility tests and verify they pass**

Run: `npm test -- src/__tests__/state-utils.test.js`

Expected: PASS.

### Task 3: Translation Editing Component

**Files:**
- Create: `src/components/BilingualTextEditor.vue`

- [ ] **Step 1: Implement a shared translation editor**

The component renders the localized display string and, in English mode, an
`Edit translation` button. Editing shows an input or textarea, plus Save and
Cancel buttons. It emits `save` with the English text.

- [ ] **Step 2: Use the component where user content is listed**

Adopt it in each page as rows are converted in Task 4.

### Task 4: Convert Views To Use Language Helpers

**Files:**
- Modify: `src/components/AppShell.vue`
- Modify: `src/components/LoginScreen.vue`
- Modify: `src/components/ExportActions.vue`
- Modify: `src/views/SettingsView.vue`
- Modify: `src/views/DashboardView.vue`
- Modify: `src/views/CountdownsView.vue`
- Modify: `src/views/PracticeView.vue`
- Modify: `src/views/TimerView.vue`
- Modify: `src/views/SentencesView.vue`
- Modify: `src/views/DistractionsView.vue`
- Modify: `src/views/KnowledgeReviewView.vue`
- Modify: `src/views/IdeasView.vue`
- Modify: `src/views/SubjectMapView.vue`
- Modify: `src/views/WeeklyReviewView.vue`

- [ ] **Step 1: Replace fixed UI text with `fish.t(...)`**

Use Chinese strings as keys so Chinese remains the default source:

```vue
<h2>{{ fish.t("设置") }}</h2>
<button>{{ fish.t("保存") }}</button>
```

- [ ] **Step 2: Replace user content display with `fish.tx(...)` or `BilingualTextEditor`**

For editable row content:

```vue
<BilingualTextEditor
  :fish="fish"
  :value="item.summary"
  textarea
  @save="(text) => fish.updateTranslation('knowledgeReviews', item.id, 'summary', text)"
/>
```

- [ ] **Step 3: Keep form editing focused on Chinese source text**

When opening edit forms, read from `fish.textSource(value)` so the existing form edits Chinese text.

- [ ] **Step 4: Make Settings expose the language switch**

Add a segmented language control that calls `fish.setLanguage('zh')` or
`fish.setLanguage('en')`.

### Task 5: Verification

**Files:**
- No new files.

- [ ] **Step 1: Run focused tests**

Run:

```bash
npm test -- src/__tests__/i18n-user-text.test.js
npm test -- src/__tests__/state-utils.test.js
```

Expected: PASS.

- [ ] **Step 2: Run the full test suite**

Run: `npm test`

Expected: PASS.

- [ ] **Step 3: Run the production build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 4: Verify in the browser**

At `http://localhost:5174/`, switch to Settings, select English, confirm
navigation labels and page text update, confirm user content appears in English
draft form, edit at least one translation, and switch back to Chinese to confirm
the Chinese source remains.
