# Plan: 番茄钟计时器跨刷新持久化 (v2)

## Metadata
- Source: deep-interview spec `.omc/specs/deep-interview-timer-persistence.md`
- Ambiguity: 16.0%
- Type: brownfield
- Created: 2026-05-28
- Revised: 2026-05-28 (Architect + Critic review round 1)
- Status: pending approval

## Requirements Summary
在番茄钟 running/paused 状态下刷新页面时，自动恢复计时器状态并根据 startTime 追赶时间。刷新期间若计时器本应完成则弹窗确认。

## RALPLAN-DR Summary

### Principles
1. **最小侵入** — 在 `useSelfFishState` 内新增独立持久化槽位，不修改 `state` 对象结构，不改变 `normalizeState` schema
2. **隔离优先** — 活跃计时器使用独立的 `shallowRef` + 独立 localStorage key，与服务器同步管线完全隔离
3. **追赶而非快照** — 恢复时根据 `startTimestamp`(ISO) 实时计算 elapsed，而非简单恢复保存的 `remaining` 值
4. **KeepAlive 兼容** — 恢复逻辑仅在 `onMounted`（真正挂载）时触发，`onActivated`（KeepAlive 缓存恢复）不触发

### Decision Drivers
1. 代码改动范围最小化（3 个文件）
2. 绝对不能破坏现有的 localStorage + server 双写架构
3. 用户刷新后体验"无缝续期"
4. 不能有初始化管线覆盖问题

### Viable Options

**Option A: 独立 shallowRef + 独立 localStorage key（推荐，v2 采用）**
- Pros: 与 `state`/`normalizeState`/`loadServer`/`replaceState` 完全解耦，零初始化覆盖风险；不影响 exportState/importState；语义干净
- Cons: 多一个 localStorage key；多一个 watch；比直接放 state 里多约 15 行代码

**Option B: 在 state 中增加 activeTimer 字段（v1 方案，已废弃）**
- Pros: 复用现有 watch → saveLocal 通道
- Cons: `loadServer()` → `normalizeState()` → `replaceState()` 管线会抹掉 activeTimer；污染全局 state schema；exportState/importState 需额外处理
- **废弃理由**: Critic 确认初始化管线对已登录用户致命，且修复需要同时改动 `normalizeState`、`initialize`、`saveServer`、`exportState`、`importState` 五处，总改动量反超 Option A

**Option C: TimerView.vue 直接用独立 localStorage**
- Pros: 完全隔离
- Cons: 需要在组件内管理 key 命名、序列化、用户隔离，与现有 useSelfFishState 的持久化模式不一致
- **废弃理由**: 将持久化逻辑分散到视图层，违反当前架构集中管理 state 的模式

**选择 Option A**，理由：完全避开服务器状态管线的覆盖问题，改动量实际小于 Option B（不需要改 normalizeState/loadServer/exportState/importState），且语义清晰。

## Implementation Steps

### Step 1: `useSelfFishState.js` — 独立 activeTimer 持久化槽位

文件: `src/composables/useSelfFishState.js`

**1.1 新增独立的 reactive ref 和 watch**（在 `state` 声明之后，`watch(state, ...)` 之前）:

```js
// 活跃计时器快照（仅本地持久化，不入 state，不同步服务器）
const activeTimer = ref(null);

watch(
  activeTimer,
  (val) => {
    if (!user.value) return;
    const key = localStorageKeyForUser(user.value.id) + '.activeTimer';
    if (val) {
      localStorage.setItem(key, JSON.stringify(val));
    } else {
      localStorage.removeItem(key);
    }
  },
  { deep: true },
);
```

**1.2 新增方法**（在 `addPomodoroLog` 附近）:

```js
function saveActiveTimer(snapshot) {
  activeTimer.value = { ...snapshot };
}

function clearActiveTimer() {
  activeTimer.value = null;
}

function getActiveTimer() {
  if (!user.value) return null;
  const key = localStorageKeyForUser(user.value.id) + '.activeTimer';
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
```

**1.3 导出新方法**，在 return 对象中添加:
```js
saveActiveTimer,
clearActiveTimer,
getActiveTimer,
```

### Step 2: `TimerView.vue` — 恢复逻辑 + 保存调用 + 超时弹窗

文件: `src/views/TimerView.vue`

**2.1 修改 `onMounted`**（替换现有的 L20-22），增加恢复逻辑:

```js
onMounted(() => {
  clockInterval = setInterval(() => { now.value = new Date(); }, 1000);

  const saved = props.fish.getActiveTimer();
  if (!saved || !saved.startTimestamp) return;

  // 恢复 timer 基本字段
  timer.mode = saved.mode;
  timer.direction = saved.direction;
  timer.seconds = saved.seconds;
  timer.subject = saved.subject;
  timer.note = saved.note || '';
  timer.startTime = saved.startTime || '';
  timer._startTimestamp = saved.startTimestamp || null;

  if (saved.running) {
    // 运行中：根据 startTimestamp 追赶时间（使用 saved.seconds 而非 saved.remaining，确保多次刷新后公式仍正确）
    const elapsed = Math.max(0, Math.floor((Date.now() - new Date(saved.startTimestamp).getTime()) / 1000));
    if (saved.direction === 'down') {
      const remaining = Math.max(0, saved.seconds - elapsed);
      if (remaining <= 0) {
        timer.remaining = 0;
        timer.running = false;
        showTimeoutDialog.value = true;
        props.fish.clearActiveTimer();
        return;
      }
      timer.remaining = remaining;
    } else {
      // 正计时：remaining 为负值表示已过秒数，刷新后减去 elapsed
      timer.remaining = saved.remaining - elapsed;
    }
    timer.running = true;
    interval = window.setInterval(() => {
      if (timer.direction === 'down') {
        timer.remaining = Math.max(0, timer.remaining - 1);
        if (timer.remaining === 0) complete();
      } else {
        timer.remaining -= 1;
      }
    }, 1000);
  } else {
    // 暂停：原样恢复 remaining，不追赶时间
    timer.remaining = saved.remaining;
    timer.running = false;
  }

  // 重新持久化恢复后的状态，确保后续刷新也能恢复
  saveActiveTimerSnapshot();
});
```

**2.2 修改 `start()`**（在 L60 `timer.startTime = ...` 之后）增加保存调用和 ISO 时间戳:

```js
function start() {
  if (timer.running) return;
  timer.running = true;
  timer.startTime = new Date().toTimeString().slice(0, 8);
  timer._startTimestamp = new Date().toISOString(); // 用于跨日追赶计算
  interval = window.setInterval(() => {
    if (timer.direction === 'down') {
      timer.remaining = Math.max(0, timer.remaining - 1);
      if (timer.remaining === 0) complete();
    } else {
      timer.remaining -= 1;
    }
  }, 1000);
  saveActiveTimerSnapshot();
}
```

**2.3 新增 `saveActiveTimerSnapshot()` 辅助函数**（在 `start()` 之前）:

```js
function saveActiveTimerSnapshot() {
  if (!timer.running && timer.remaining === timer.seconds) return; // idle 不保存
  props.fish.saveActiveTimer({
    mode: timer.mode,
    direction: timer.direction,
    seconds: timer.seconds,
    remaining: timer.remaining,
    running: timer.running,
    note: timer.note,
    subject: timer.subject,
    startTime: timer.startTime,
    startTimestamp: timer._startTimestamp || null,
  });
}
```

**2.4 修改 `pause()`**（在 L72-74 `window.clearInterval(interval)` 之后）:

```js
function pause() {
  timer.running = false;
  window.clearInterval(interval);
  saveActiveTimerSnapshot();
}
```

**2.5 修改 `reset()`**（L76-79）。注意：`reset()` 先调用 `pause()` → 触发 `saveActiveTimerSnapshot()`，此时 `timer.remaining` 还是重置前的旧值。需要在 `timer.remaining = timer.seconds` 之后再保存一次正确的快照：

```js
function reset() {
  pause();
  timer.remaining = timer.seconds;
  saveActiveTimerSnapshot(); // 在 remaining 已更新为 seconds 后保存正确的快照
}
```

**2.6 修改 `complete()`**（L81-86），在 `reset()` 之后清除:

```js
function complete() {
  const minutes = Math.max(1, Math.round((timer.seconds - Math.max(timer.remaining, 0)) / 60));
  const endTime = new Date().toTimeString().slice(0, 8);
  props.fish.addPomodoroLog({ subject: timer.subject, minutes, mode: timer.mode, note: timer.note, startTime: timer.startTime, endTime });
  reset();
  props.fish.clearActiveTimer(); // 在 reset() 之后，确保清除
}
```

**2.7 修改 `setPreset()`**（L49-55），用户选择新预设时清除:

```js
function setPreset(minutes, mode) {
  timer.mode = mode;
  timer.seconds = minutes * 60;
  timer.remaining = timer.seconds;
  timer.running = false;
  timer._startTimestamp = null;
  window.clearInterval(interval);
  props.fish.clearActiveTimer();
}
```

**2.8 新增超时弹窗 state**（在 `addingNew` ref 附近）:

```js
const showTimeoutDialog = ref(false);
```

**2.9 新增超时处理方法**（在 `submitAdd` 之后）:

```js
function confirmTimeoutComplete() {
  const minutes = Math.max(1, Math.round(timer.seconds / 60));
  const endTime = new Date().toTimeString().slice(0, 8);
  props.fish.addPomodoroLog({
    subject: timer.subject, minutes, mode: timer.mode,
    note: timer.note, startTime: timer.startTime, endTime,
  });
  showTimeoutDialog.value = false;
  timer.remaining = timer.seconds;
}

function discardTimeout() {
  showTimeoutDialog.value = false;
  timer.remaining = timer.seconds;
}
```

**2.10 模板** — 在 `timer-panel` closing `</section>` 前添加超时弹窗:

```html
<div v-if="showTimeoutDialog" class="timeout-overlay">
  <div class="timeout-dialog">
    <p>{{ fish.t("计时器已在您离开期间完成。") }}</p>
    <div class="timeout-dialog-actions">
      <button class="primary-button" type="button" @click="confirmTimeoutComplete">{{ fish.t("确认完成") }}</button>
      <button class="secondary-button" type="button" @click="discardTimeout">{{ fish.t("放弃本次") }}</button>
    </div>
  </div>
</div>
```

### Step 3: `src/styles.css` — 超时弹窗样式

在文件末尾添加:

```css
.timeout-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
.timeout-dialog {
  background: var(--surface-1, #fff);
  border-radius: 16px;
  padding: 24px;
  text-align: center;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  max-width: 320px;
}
.timeout-dialog p {
  margin: 0 0 16px;
  font-size: 1rem;
}
.timeout-dialog-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
}
```

### Step 4: 国际化文本

文件: `src/i18n/messages.js`

确认以下 key 已存在（若不存在则添加）:
- `"计时器已在您离开期间完成。"` → en: `"The timer completed while you were away."`
- `"确认完成"` → en: `"Confirm"`
- `"放弃本次"` → en: `"Discard"`

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| startTimestamp 格式兼容（旧版无此字段） | 低 | `getActiveTimer()` 返回 null 的条件包含 `!saved.startTimestamp`，自动降级为不恢复 |
| 跨日追赶（23:55 开始，00:05 刷新） | 已解决 | 使用 ISO 时间戳 `startTimestamp` + `Date.now()` 计算 elapsed，不受 HH:MM:SS 跨日影响 |
| localStorage 数据损坏 | 低 | `getActiveTimer()` try/catch 包裹 JSON.parse，损坏时返回 null |
| KeepAlive 缓存恢复时误触发恢复逻辑 | 无 | KeepAlive 缓存恢复触发 `onActivated` 而非 `onMounted`，恢复逻辑仅在 `onMounted` 中执行 |
| 两个标签页同时打开 | 低 | localStorage 共享但 activeTimer 仅存一份；后启动的标签页会读取并恢复，先启动的标签页的 activeTimer 已被清除。实际场景极少见 |
| reset() 调用 pause() 导致保存 | 已接受 | reset 后保存 paused+full remaining 的快照是合理行为：用户刷新后看到重置后的计时器 |

## Acceptance Criteria
- [ ] 计时器运行中 → 刷新页面 → 计时器自动恢复运行，剩余时间 = saved.remaining - elapsed（基于 startTimestamp ISO 计算）
- [ ] 计时器已暂停 → 刷新页面 → 计时器恢复为暂停状态，剩余时间不变（不追赶）
- [ ] 计时器空闲 → 刷新页面 → 回到默认初始状态（25分钟专注模式）
- [ ] 刷新期间计时器本应完成（remaining - elapsed <= 0）→ 弹出超时提示弹窗，用户可选择"确认完成"或"放弃本次"
- [ ] 确认完成后 → 自动调用 addPomodoroLog() 添加记录（含正确的 minutes/startTime/endTime），计时器回到空闲状态
- [ ] 用户切换科目/模式后刷新 → 恢复的计时器保留刷新前选择的科目和模式
- [ ] 用户填写的备注内容跨刷新保留
- [ ] activeTimer 使用独立 localStorage key（`selfFish408.v1.{userId}.activeTimer`），不与服务器 state 混合
- [ ] 23:55 开始计时，00:05 刷新 → elapsed 正确计算为 10 分钟（不归零）
- [ ] 正计时模式下刷新 → elapsed 正确追加到已过时间
- [ ] 计时器恢复后再次刷新 → 状态仍然正确恢复（非单次刷新，快照在恢复后被重新持久化）

## Verification Steps
1. 启动计时器，等待 10 秒 → 刷新页面 → 确认剩余时间减少了约 10 秒且计时器继续运行
2. 暂停计时器 → 刷新页面 → 确认剩余时间不变且保持暂停状态
3. 空闲状态 → 刷新页面 → 确认显示默认 25 分钟专注模式
4. 设置 1 分钟计时器，运行 10 秒 → 刷新 → 等 60 秒后再刷新 → 确认弹窗提示超时
5. 点击"确认完成" → 确认 pomodoroLogs 中新增一条记录且 minutes 值正确
6. 打开 DevTools → Application → localStorage → 确认 activeTimer 使用独立 key
7. 切换科目和模式，填写备注 → 刷新 → 确认全部保留
8. 正计时模式，运行 30 秒 → 刷新 → 确认恢复后显示约 30 秒已过
9. 计时器恢复后再次刷新 → 确认状态仍然正确恢复（非单次刷新）

## Testing
- [ ] 单元测试: `getActiveTimer()` 对损坏数据的容错（JSON.parse 异常 → 返回 null）
- [ ] 单元测试: `getActiveTimer()` 对缺少 startTimestamp 的旧数据返回 null
- [ ] 单元测试: elapsed 计算：固定 startTimestamp，验证 elapsed = floor((now - start) / 1000)
- [ ] 集成测试: 模拟 localStorage 中有 activeTimer → 挂载 TimerView → 验证 timer 状态正确恢复
- [ ] 集成测试: activeTimer 不存在 → 挂载 TimerView → 验证显示默认状态

## ADR
- **Decision**: 使用独立 `shallowRef` + 独立 localStorage key（`{baseKey}.activeTimer`）管理活跃计时器快照，在 `useSelfFishState` composable 内实现
- **Drivers**: 必须避开 `loadServer()` → `normalizeState()` → `replaceState()` 管线对 state 的覆盖；不能污染全局 state schema；不可影响 exportState/importState
- **Alternatives considered**: 在 state 中增加 activeTimer 字段（v1，已废弃 — 初始化管线致命缺陷）；在 TimerView 中独立管理 localStorage（架构不一致）
- **Why chosen**: Option A 完全隔离于服务器状态管线，零覆盖风险，改动文件更少（不需要改 normalizeState/loadServer/exportState/importState），语义清晰
- **Consequences**: 多一个 localStorage key；多一个 watch；API 通过 `fish.saveActiveTimer()` / `fish.clearActiveTimer()` / `fish.getActiveTimer()` 暴露
- **Follow-ups**: 无

## Changelog
### v2 → v3 (Architect + Critic review round 2 — implementation fixes)
- **[CRITICAL]** 恢复逻辑重构：先按 `saved.running` 分支，再计算 remaining。运行中状态使用 `saved.seconds - elapsed`（而非 `saved.remaining - elapsed`），确保多次刷新后公式仍正确
- **[CRITICAL]** 暂停状态恢复直接使用 `saved.remaining`，不减去 elapsed
- **[CRITICAL]** 恢复后调用 `saveActiveTimerSnapshot()` 替代 `clearActiveTimer()`，确保第二次刷新也能恢复状态
- **[MAJOR]** 恢复时补充 `timer._startTimestamp = saved.startTimestamp`，确保 saveActiveTimerSnapshot 重新持久化时包含时间戳
- **[MAJOR]** `reset()` 在 `timer.remaining = timer.seconds` 后调用 `saveActiveTimerSnapshot()`，确保快照包含正确的满时长值
- **[MINOR]** i18n key 统一为 `"计时器已在您离开期间完成。"`（含 `完成`）
- **[MINOR]** 新增"连续刷新两次"验收标准和验证步骤

### v1 → v2 (Architect + Critic review round 1)
- **[CRITICAL]** 方案从"state 内 activeTimer"改为"独立 shallowRef + 独立 localStorage key"，彻底避开初始化管线覆盖问题
- **[CRITICAL]** 时间计算从 HH:MM:SS 改为 ISO `startTimestamp` + `Date.now()`，解决跨日 bug
- **[MAJOR]** `complete()` 中 `clearActiveTimer()` 移到 `reset()` 之后，避免被 `pause()` 重新保存
- **[MAJOR]** 正计时（up）恢复逻辑补充 elapsed 追加
- **[MAJOR]** 新增 Testing 章节，覆盖单元测试和集成测试
- **[MINOR]** 文件改动从 4 个降至 3 个（不再需要改 state.js 的 normalizeState）
- **[MINOR]** 补充 `getActiveTimer()` 的 try/catch 容错和 `startTimestamp` 缺失降级
- **[MINOR]** `start()` 增加 `timer._startTimestamp` 字段用于 ISO 时间戳存储
