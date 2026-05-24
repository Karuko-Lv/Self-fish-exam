# Bilingual Language Switch Design

## Goal

Add a Settings-level language switch for Chinese and English. The app should
translate fixed interface text through a local dictionary and keep user-entered
text as editable bilingual data. A user can write in Chinese, switch the app to
English, see an automatically generated English draft, and edit that English
translation without losing the original Chinese text.

## Current State

Self-fish is a Vue 3 app with one shared state object managed by
`useSelfFishState`. Settings are already stored under `state.settings`, and the
settings page currently exposes adaptive layout behavior.

There is no translation layer today. Most interface labels are hard-coded in
Vue templates, and default content lives in `src/constants/defaults.js`.
User-entered text is stored as plain strings across logs, countdown todos,
ideas, knowledge reviews, and generated tasks. State normalization already
handles older shapes, so bilingual migration should fit into
`src/utils/state.js`.

## Product Scope

The first bilingual version includes:

- A `zh` / `en` setting in Settings.
- App navigation, page titles, form labels, buttons, filter chips, empty
  states, toast text, and default content translated through local dictionaries.
- User-entered text stored with both Chinese and English variants.
- Automatic English draft generation from local dictionary rules when a user
  creates or edits Chinese text.
- An `Edit translation` action beside user-entered text in English mode.
- Manual editing for English translations without changing the Chinese source.
- Backward-compatible migration for existing string data.
- Exports that use the current display language for CSV and PDF, while JSON
  keeps bilingual data.

Out of scope for this version:

- Remote AI translation APIs.
- Automatic English-to-Chinese translation.
- Full manual editing of every fixed system label from inside the app.
- Per-field language switching; the language setting is global.

## UX Behavior

Settings adds a compact segmented control:

- `中文`
- `English`

The selected language is stored at `state.settings.language`, defaulting to
`zh`.

When the app is in Chinese:

- Fixed UI text renders in Chinese.
- User content renders from the Chinese value.
- Forms remain focused on Chinese input.

When the app is in English:

- Fixed UI text renders in English.
- User content renders from the English value if present.
- If the English value is missing, the app generates one from the Chinese
  source and stores it.
- User content rows show an `Edit translation` action.
- Editing the translation opens an inline editor or compact modal for the
  English value only.

The edit control appears only for content that came from user data, such as
countdown titles, countdown todos, focus notes, practice sources and notes,
sentence sources and notes, timer notes, distraction text, knowledge-review
topics and summaries, and idea text and reasons. System labels stay simple and
dictionary-driven.

## Data Model

Use a small bilingual text shape:

```js
{
  zh: "整理今日错题",
  en: "Review today's mistakes"
}
```

For an English-only source created later, the same shape can preserve the
English source and generate or leave an empty Chinese value:

```js
{
  zh: "",
  en: "Review today's mistakes"
}
```

Utilities should hide this structure from templates where possible:

- `textValue(value, language)` returns the correct display string.
- `ensureBilingualText(value)` converts a string or partial object into
  `{ zh, en }`.
- `setBilingualText(value, language, nextText)` updates one language while
  preserving the other.
- `draftEnglishFromChinese(text)` creates an English draft using local rules.

Existing fields should migrate in place during normalization. A legacy string
such as `note: "整理错题"` becomes:

```js
note: {
  zh: "整理错题",
  en: "Review mistakes"
}
```

If a value is already bilingual, normalization preserves both sides and fills
only missing fields.

## Translation Strategy

Use a local dictionary and simple deterministic rules. This keeps the app
offline-friendly and avoids API keys, network failures, and cost.

The dictionary covers:

- App navigation and fixed UI labels.
- Subjects and non-study subject names.
- Mood names, task levels, review causes, distraction types, timer modes, and
  sync statuses.
- Default tasks, prompt cards, break suggestions, countdown defaults, and
  dashboard motivational lines.
- Common study words and phrases, such as mistakes, review, practice,
  sentence analysis, pomodoro, distraction, knowledge point, weekly review,
  data structures, operating systems, computer networks, math, and English.

The user-text draft translator should be conservative:

1. Return a known phrase when the full Chinese text matches the dictionary.
2. Replace known phrase fragments from longest to shortest.
3. Keep numbers, dates, and punctuation readable.
4. If unknown Chinese remains, keep it in the English draft so no meaning is
   silently deleted.

This means drafts are useful starting points, not authoritative translations.
Manual correction is part of the product.

## Architecture

Add a small i18n layer:

```text
src/i18n/
  index.js
  messages.js
  userText.js
```

`messages.js` stores fixed UI translations. `userText.js` owns bilingual text
helpers and the local draft translator. `index.js` exposes `createI18n(state)`
or a composable-style helper that returns:

- `language`
- `setLanguage(language)`
- `t(key, params)`
- `tx(value)` for user text display
- `ensureText(value)`
- `updateTranslation(collection, id, field, language, nextText)`

`useSelfFishState` can expose language helpers through the existing `fish`
object so each view can use the same pattern without adding a global plugin.
The first implementation should prefer explicit helpers over introducing a
large external i18n dependency.

## Data Flow

Creation and editing flows follow the current Vue component pattern:

1. The user submits a form with Chinese text fields.
2. The relevant `fish.add...` or `fish.update...` action converts text fields
   to bilingual objects.
3. The English value is generated from the local dictionary unless the user
   already provided a custom English value.
4. The normalized state is saved locally and synced to the server through the
   current debounced mechanism.

Translation editing flow:

1. In English mode, the user clicks `Edit translation` on a row.
2. The row opens an English-only text input or textarea for the selected field.
3. Saving calls a helper that updates only the `.en` value.
4. The `.zh` value remains unchanged.

Migration flow:

1. `normalizeState` converts legacy string fields to bilingual text.
2. Missing `settings.language` defaults to `zh`.
3. Missing English values are generated once during normalization or first
   display, then saved on the next normal state write.

## Component Scope

The app shell and every view need fixed text replacement. To keep the first
pass manageable, convert each page in place rather than redesigning layout.

Priority order:

1. State utilities and i18n helpers.
2. Settings language switch.
3. App shell navigation and login/loading text.
4. High-use pages: Dashboard, Countdowns, Practice, Timer.
5. Remaining pages: Sentences, Distractions, Knowledge Review, Ideas,
   Subject Map, Weekly Review.
6. Export labels and default data.

Repeated translation editing UI should be shared once at least two pages need
it, for example as `BilingualTextEditor.vue`.

## Error Handling

- Unknown translation keys should fall back to the key name in development and
  a readable Chinese string where possible.
- Empty user text remains empty in both languages.
- If a bilingual value is malformed, normalization keeps the best available
  string instead of dropping data.
- Editing an English translation can be cancelled without saving.
- Importing JSON with legacy strings or bilingual objects both remain valid.
- The language switch must not reset view state or current forms.

## Testing And Verification

Automated tests should cover:

- `ensureBilingualText` migration from strings and partial objects.
- English draft generation for common study phrases.
- `normalizeState` migration for countdown todos, focus notes, practice notes,
  sentence notes, timer notes, distraction text, knowledge reviews, ideas, and
  tasks.
- `settings.language` defaulting to `zh`.
- Display helper fallback behavior.
- Manual English update preserving Chinese source text.

Manual browser verification should cover:

- Switching languages in Settings.
- Navigation labels and page titles updating immediately.
- Existing Chinese data displaying English drafts in English mode.
- Editing an English translation and switching back to Chinese without losing
  the original.
- Adding new Chinese content and seeing an English draft.
- Exporting CSV/PDF in the current language and JSON with bilingual data.
- Desktop and mobile layout checks for longer English labels.
