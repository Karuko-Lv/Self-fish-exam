# Vue Rewrite Design

## Goal

Rewrite Self-fish as a Vue 3 application while preserving all existing features
and current single-user data compatibility. Add real account login and
per-user cloud sync so two people can use the same deployed app with isolated
data, while leaving a clean path to support more users later. The new interface
should keep the current full-page pink Hello Kitty style, make daily study
actions easier to reach, and improve maintainability by replacing direct DOM
manipulation with Vue components and composables.

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
existing local and Railway data continue to load. Basic Auth will be replaced
by an in-app login screen and cookie-backed session.

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
- Login, logout, current-user display, and per-user cloud sync

No feature is intentionally removed in the Vue version.

## Accounts And Cloud Sync

The first version supports two configured accounts and is designed so more
accounts can be added later without changing the frontend data model. Public
registration is intentionally out of scope. Accounts are created by server
configuration or a server-side account file, not by an open signup page.

Authentication behavior:

- Show a pink Hello Kitty themed login screen before loading private study
  data.
- Provide username and password login.
- Store password hashes on the server, never plaintext passwords.
- Create an HTTP-only session cookie after login.
- Add `POST /api/login`, `GET /api/me`, and `POST /api/logout`.
- Require a valid session for `GET /api/state` and `PUT|POST /api/state`.
- Show the current account name in the app shell and provide a logout action.

Data isolation:

- Each account has its own state object and storage file.
- Existing `/api/state` remains the frontend sync contract, but it reads and
  writes the state for the current logged-in user.
- A suggested storage shape is `data/users/<userId>/state.json` plus a
  `data/users.json` account file, or equivalent environment-driven config for
  deployment.
- Existing single-user `data/state.json` can be imported into one account by
  the current import flow or a documented one-time migration.

Future multi-user support:

- The account model should use stable user ids instead of display names as
  storage keys.
- The server should keep account lookup and session handling separate from
  state read/write logic.
- Open registration, invitations, password reset, and admin UI are deferred.

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
    LoginScreen.vue
    SidebarNav.vue
    TopBar.vue
    StatCard.vue
    EmptyState.vue
    ToastHost.vue
  composables/
    useAuth.js
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

`useAuth` owns current-user and session checks. `useSelfFishState` owns the
normalized app state and exposes actions for all mutations. Components should
call actions instead of mutating nested state in many places.

State loading order:

1. Call `GET /api/me`.
2. If no session exists, render the login screen and do not load private state.
3. After login, load per-user localStorage synchronously so the app renders
   immediately. Use a key scoped by user id, such as
   `selfFish408.v1.<userId>`.
4. Try authenticated `GET /api/state`.
5. If server state is available, normalize it and replace local state.
6. Save mutations to per-user localStorage immediately.
7. Debounce authenticated server writes to `/api/state` using the current
   500 ms behavior.

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
- If the session expires, stop server writes, keep unsaved local changes under
  the current user's scoped localStorage key, and ask the user to log in again.
- Login errors should not reveal whether the username or password was wrong.
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
- Login, logout, session checks, and rejected unauthenticated state requests
- Per-user state isolation through `/api/state`
- Backward-compatible import of existing single-user state

Manual browser verification should cover desktop and mobile widths:

- Login and logout
- Switching between the two configured accounts without data leakage
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

Deployment documentation should explain how to configure the first two accounts
and where user data is stored on the persistent volume. Public signup remains
disabled by default.
