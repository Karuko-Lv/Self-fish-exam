# Kitty Pomodoro Design

## Goal

Update only the Pomodoro page's main timer visual to match the provided pink
Kitty countdown reference. The timer should feel cute, soft, and focused while
preserving the existing Pomodoro controls and behavior.

## Current State

`src/views/TimerView.vue` renders the Pomodoro page. The current timer uses a
simple circular `.timer-orb` with the mode, time, and helper text inside. The
page already supports countdown/count-up modes, presets, subject selection,
notes, start, pause, reset, and completion logging.

Global styling lives in `src/styles.css`. The timer layout is responsive and
collapses to one column on smaller screens.

## Product Scope

This change affects only the Pomodoro page.

In scope:

- Replace the plain timer orb with a high-fidelity Kitty-inspired pink circular
  countdown visual.
- Keep the mode text, timer display, and helper text readable in the center.
- Add decorative Kitty elements based on the supplied assets: large Kitty head,
  bow decorations, small Kitty, dotted accents, and paw-print style details.
- Keep the existing Pomodoro buttons and their current layout, labels, and
  actions.
- Preserve all timer functionality, including start, pause, reset, presets,
  direction switching, subject selection, notes, and session logging.
- Ensure the new visual works on desktop and mobile widths.

Out of scope:

- Changing the Countdown Days page.
- Changing the underlying timer logic or saved data model.
- Adding or changing audio behavior.
- Adding the beating-heart effect. The user explicitly removed it from the
  final design.
- Replacing existing buttons with large circular reference-image buttons.

## UX Design

The Pomodoro page keeps its current structure:

1. Topbar with page title and export controls.
2. Main timer panel on the left.
3. Session log panel on the right.

Inside the timer panel, the existing circular timer becomes a Kitty countdown
composition:

- A large pink circular progress ring frames the timer.
- A large Kitty head sits at the top edge of the ring, as if leaning over it.
- A pink bow appears near the top Kitty head and another bow sits near the
  inner upper ring.
- A small Kitty sits on the right side of the progress ring.
- Small bow, dot, and paw-print accents decorate the outer ring.
- The center keeps the text hierarchy: mode label, large `MM:SS` time, and the
  helper line `小小鱼，先游一段。`

The removed heart effect should not appear in the implementation. Decorative
motion, if any, should be limited to subtle progress-ring transitions and hover
states already consistent with the app.

## Interaction Behavior

All controls keep their existing semantics:

- `开始` starts the timer.
- `暂停` pauses it.
- `重置` restores the selected duration.
- `结束并同步` logs the completed session.
- Direction and preset buttons still work as they do now.

The new visual is decorative and state-reflective. It should not introduce new
click targets or change keyboard/tab order. If the timer is running, the ring
can visually represent elapsed progress using existing reactive timer state,
but the text display remains the authoritative time indicator.

## Implementation Shape

Keep the implementation local to:

- `src/views/TimerView.vue`
- `src/styles.css`

Recommended markup changes:

- Replace the existing `.timer-orb` inner structure with semantic decorative
  elements inside the same timer area.
- Preserve the existing computed `display` value and timer state.
- Add an inline style or CSS custom property for ring progress, derived from
  `timer.remaining` and `timer.seconds`.
- Use CSS-drawn decorative shapes so the page does not depend on temporary
  WeChat image paths.

Recommended CSS changes:

- Add Kitty-specific classes for the ring, head, ears, bow, small Kitty, paws,
  and dotted accents.
- Use stable dimensions with `aspect-ratio`, `clamp`, and `min()` so the timer
  does not overflow narrow panels.
- Avoid changing the shared button classes beyond what is already used by the
  page.
- Add reduced-motion handling if any animation is introduced.

## Testing

Automated checks should verify that:

- Timer markup includes the Kitty timer shell and decorative elements.
- Timer action buttons still exist with their original labels.
- The removed heart effect is not present.
- CSS keeps the timer responsive and does not redefine the existing timer
  action button layout into the reference-image circular buttons.

Manual verification should include:

- Desktop browser screenshot of the Pomodoro page.
- Mobile/narrow viewport screenshot of the Pomodoro page.
- Start, pause, reset, and preset controls still operate.
- The center timer text remains readable and unobstructed.
