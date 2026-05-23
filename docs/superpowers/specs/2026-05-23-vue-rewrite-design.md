# Vue Rewrite Design

## Goal

Rewrite Self-fish as a Vue 3 application while preserving all existing features,
data compatibility, and deployment behavior. The new interface should keep the
current full-page pink Hello Kitty style, make daily study actions easier to
reach, and improve maintainability by replacing direct DOM manipulation with
Vue components and composables.

## Current State

The project is a single-page app built with static `index.html`, `styles.css`,
and `app.js`. It is served by `server.js`, which also provides:

- `GET /api/health`
- `GET /api/state`
- `PUT|POST /api/state`
- Optional Basic Auth through `SELF_FISH_USER` and `SELF_FISH_PASSWORD`
- File-backed state through `SELF_FISH_DATA_FILE`

The app stores browser data under `selfFish408.v1` and syncs the same state
object to the server. The Vue rewrite must keep this shape compatible so
existing local and Railway data continue to load.

## Product Scope

The rewrite keeps every current module:

- Today dashboard: countdown, mood selection, three task lanes, study log
- Countdown days
- Subject progress map
- Practice logs
- Sentence archive with image upload and preview
- Pomodoro timer, count-up timer, non-study sessions, and Done List
- Distraction log and quick parking from the timer
- Mistake review queue with due filter
- Idea parking lot and restart task generation
- Weekly review, import, export, and reset
- Settings, including adaptive layout behavior

No feature is intentionally removed in the Vue version.

## Visual Direction

The chosen layout is an efficient dashboard structure with a strong pink Hello
Kitty theme:

- Desktop layout: left navigation, central content area, optional right-side
  "today quick actions" rail on the dashboard and timer-heavy workflows.
- Mobile layout: compact header with drawer or bottom navigation, with quick
  actions moved near the top of each page.
- Theme: full-page pink background, soft grid or dot patterns, cream-white
  panels, deep berry text, coral and light gold highlights, and a Kitty-style
  brand mark.
- Controls: clear touch targets, readable forms, restrained 8-12px card
  radii, and consistent button states.
- Decoration is allowed in page background and brand areas, but list content,
  form labels, and timer controls stay high-contrast and easy to scan.

The interface should feel cute and encouraging, but still behave like a daily
productivity tool.

## Architecture

Use `Vue 3 + Vite` for the frontend. Keep the existing Node server as the
deployment entry point, updated to serve the built Vue app from `dist`.

Suggested structure:

```text
src/
  App.vue
  main.js
  components/
    AppShell.vue
    SidebarNav.vue
    TopBar.vue
    StatCard.vue
    EmptyState.vue
    ToastHost.vue
  composables/
    useSelfFishState.js
    useServerSync.js
    useTimer.js
    useToast.js
  constants/
    subjects.js
    defaults.js
  utils/
    dates.js
    state.js
    exportImport.js
    images.js
  views/
    DashboardView.vue
    CountdownsView.vue
    SubjectMapView.vue
    PracticeView.vue
    SentencesView.vue
    TimerView.vue
    DistractionsView.vue
    MistakesView.vue
    IdeasView.vue
    WeeklyReviewView.vue
    SettingsView.vue
```

The app can use a small internal view state instead of adding Vue Router, since
the current product is a local single-page dashboard and deep links are not a
requirement. If routing becomes useful later, the view boundaries above are
already suitable for adding it.

## Data Flow

`useSelfFishState` owns the normalized app state and exposes actions for all
mutations. Components should call actions instead of mutating nested state in
many places.

State loading order:

1. Load localStorage synchronously so the app renders immediately.
2. Try `GET /api/state`.
3. If server state is available, normalize it and replace local state.
4. Save mutations to localStorage immediately.
5. Debounce server writes to `/api/state` using the current 500 ms behavior.

Normalization must preserve current migration behavior for old sentence/word
records and missing fields.

## Component Boundaries

Page components own layout and page-specific forms. Shared components handle
repeated patterns:

- Cards and metric pills
- Page headers and actions
- Empty states
- Filter chips
- Log list rows
- Confirmation and toast feedback

Business rules should live in composables or utilities, not inside templates.
Examples include study-day boundaries, weekly aggregation, countdown math, due
date checks, and Done List grouping.

## Error Handling

- If server sync fails, continue in localStorage mode and show a non-blocking
  toast.
- Import validates JSON object shape before replacing state.
- Image upload keeps current data URL behavior and rejects unreadable files
  with a friendly message.
- Reset data requires confirmation.
- Timer state should be resilient to pause, reset, and completion without
  double-writing a session.

## Testing And Verification

Implementation should include focused verification for:

- State normalization and migration utilities
- Date helpers, especially the 06:00 study-day boundary
- Weekly aggregation and Done List grouping
- Import/export round trip
- Server state API compatibility

Manual browser verification should cover desktop and mobile widths:

- Navigation between all views
- Add/delete flows for each log type
- Timer start, pause, reset, and complete
- Server sync through `/api/state`
- Import/export
- Pink Kitty theme readability and responsive behavior

## Deployment

Update package scripts for Vue development and production:

- `npm run dev` starts Vite for frontend development.
- `npm run build` builds the Vue app.
- `npm start` runs the Node server and serves the built app.

Railway deployment should continue to use `npm start`. If Railway needs a build
step, document that in `README.md` and keep `railway.json` aligned.
