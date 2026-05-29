# Pomodoro System Notifications Design

## Summary

Add recurring Pomodoro reminders that work outside the app tab when browser
notification permission is granted. While a timer is running, the app reminds
the user every five minutes how long they have studied. If today's completed
Pomodoro time is mostly non-study time, the reminder uses a sharper motivational
message.

## Current Context

`src/views/TimerView.vue` owns the active timer state, restores an unfinished
timer from local storage, and writes completed sessions through
`fish.addPomodoroLog`. The timer already supports `nonStudy` through
`timerSubjects`, and completed sessions are stored in
`fish.state.pomodoroLogs`.

The app has a page-level toast system through `useToast` and `ToastHost`, but it
does not currently request browser notification permission or send system
notifications.

## Goals

- While the Pomodoro timer is running, remind the user every five elapsed
  minutes.
- The reminder should be visible when the user is on another browser tab or in
  another app, using the browser Notification API when available and allowed.
- If system notifications are unavailable, denied, or not yet granted, fall back
  to the existing in-page toast channel.
- The reminder text should include the current active session duration and
  today's study minutes.
- If completed non-study Pomodoro minutes are more than half of today's total
  Pomodoro minutes, and today's total Pomodoro minutes are at least 10, use a
  more forceful motivational message such as warning that the current pattern
  risks failing the exam.

## Non-Goals

- Do not add a native desktop helper, Electron wrapper, or service worker.
- Do not notify when no timer is running.
- Do not count unfinished active non-study minutes toward the "mostly non-study"
  threshold until the session is completed.
- Do not change Pomodoro log storage shape.

## Recommended Approach

Use a small browser-notification helper and keep `TimerView.vue` responsible for
timer lifecycle decisions.

The helper should:

- Detect whether `window.Notification` exists.
- Request permission only from a user gesture, such as a visible "开启提醒"
  button near the timer controls.
- Send a system notification when permission is `granted`.
- Return whether a system notification was actually shown so the caller can
  fall back to toast.

`TimerView.vue` should:

- Track the last five-minute reminder bucket for the active timer.
- Reset the bucket when a timer starts, resets, completes, or when a restored
  timer snapshot changes.
- On each timer tick, compute elapsed active seconds from `timer._startTimestamp`.
- When elapsed minutes reach `5`, `10`, `15`, and so on, build and dispatch one
  reminder for that bucket.
- Use today's completed Pomodoro logs to calculate total minutes, study minutes,
  non-study minutes, and whether the non-study warning applies.

## Reminder Text

Normal reminder:

`已学习 {todayStudyMinutes} 分钟，当前这颗番茄已进行 {activeMinutes} 分钟。`

Mostly non-study reminder:

`今天非学习时间已经占大头了，再这样真要考不上了。回来学：当前已进行 {activeMinutes} 分钟，今日有效学习 {todayStudyMinutes} 分钟。`

If the active timer subject is `nonStudy`, today's effective study minutes still
exclude non-study sessions.

## Permission UX

Show a compact button or notice near the timer actions when:

- The browser supports notifications.
- Notification permission is `default`.

Clicking it requests permission. If permission is denied, no repeated permission
prompt should be shown; reminders continue through toast.

## Testing

Add focused Vitest coverage for the pure reminder logic:

- Computes today's study, non-study, and total Pomodoro minutes.
- Does not warn when total Pomodoro time is below 10 minutes.
- Warns when non-study minutes are more than half of today's total.
- Builds the normal five-minute reminder text.
- Builds the forceful reminder text when the warning threshold applies.

Add a lightweight `TimerView.vue` source-level test if needed to ensure the view
exposes a notification permission action and invokes the reminder helper from
the timer tick path.

Manual verification should include:

- Open the local app in the in-app browser.
- Start a timer and enable notifications from the visible permission control.
- Use a short dev interval or fake timer test path to confirm only one reminder
  fires per five-minute bucket.
- Confirm denied notification permission falls back to toast.

## Risks

Browser notifications require user permission and may be blocked by OS or
browser settings. The implementation must treat notification delivery as best
effort and keep toast fallback working.

Long-running timers restored after the tab was hidden may have crossed several
five-minute buckets. The app should show at most one catch-up reminder for the
current bucket rather than spamming old missed reminders.
