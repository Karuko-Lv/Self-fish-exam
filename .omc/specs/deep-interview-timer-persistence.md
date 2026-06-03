# Deep Interview Spec: 番茄钟计时器跨刷新持久化

## Metadata
- Interview ID: timer-persistence-001
- Rounds: 2
- Final Ambiguity Score: 16.0%
- Type: brownfield
- Generated: 2026-05-28
- Threshold: 0.2
- Threshold Source: default
- Initial Context Summarized: no
- Status: PASSED

## Clarity Breakdown
| 维度 | 得分 | 权重 | 加权 |
|------|------|------|------|
| 目标清晰度 | 0.85 | 35% | 0.298 |
| 约束清晰度 | 0.85 | 25% | 0.213 |
| 成功标准 | 0.75 | 25% | 0.188 |
| 上下文清晰度 | 0.95 | 15% | 0.143 |
| **总清晰度** | | | **0.840** |
| **模糊度** | | | **16.0%** |

## Topology
| 组件 | 状态 | 描述 | 覆盖说明 |
|------|------|------|----------|
| 计时器状态持久化 | active | 保存运行中/暂停的计时器状态到 localStorage，刷新后自动恢复并追赶已过去的时间 | 已覆盖所有活跃组件的验收标准 |

## 目标
在番茄钟计时器运行中或暂停状态下刷新页面时，自动恢复计时器状态并根据 startTime 追赶已过去的时间，让计时器"无缝续期"。如果刷新期间计时器本应完成，则弹出超时提示让用户确认。

## 约束
- 持久化到 localStorage，沿用现有 `selfFish408.v1.{userId}` key 和 `useSelfFishState.js` 的持久化模式
- 仅在计时器状态为 running 或 paused 时持久化，idle 状态不保存
- 恢复时根据 `startTime` 和当前时间计算实际剩余秒数（追赶逻辑）
- 不在服务器端同步活跃计时器状态（仅本地持久化）
- 与现有 `<KeepAlive>` 机制兼容，不能破坏标签切换时的状态保持

## 非目标
- 不涉及跨设备同步计时器状态
- 不涉及 Service Worker / 后台通知
- 不改变 pomodoro 完成的日志记录逻辑

## 验收标准
- [ ] 计时器运行中 → 刷新页面 → 计时器自动恢复运行，剩余时间 = 原始剩余 - (当前时间 - startTime)
- [ ] 计时器已暂停 → 刷新页面 → 计时器恢复为暂停状态，剩余时间不变（不追赶）
- [ ] 计时器空闲 → 刷新页面 → 回到默认初始状态（25分钟专注模式）
- [ ] 刷新期间计时器本应完成（追赶后 remaining <= 0）→ 弹出超时提示弹窗，用户可选择"确认完成"或"放弃本次"
- [ ] 确认完成后 → 自动调用 `addPomodoroLog()` 添加记录，计时器回到空闲状态
- [ ] 用户切换科目/模式后刷新 → 恢复的计时器保留刷新前选择的科目和模式
- [ ] 用户填写的备注内容跨刷新保留

## 假设暴露与解决
| 假设 | 挑战 | 结论 |
|------|------|------|
| 刷新后只需恢复剩余秒数 | 追问追赶逻辑 | 根据 startTime 实时计算，而非简单保存剩余秒数 |
| 所有计时器状态都应持久化 | 追问持久化范围 | 仅 running 和 paused 状态持久化，idle 不保存 |
| 超时后自动完成 | 追问超时处理 | 弹窗提示用户确认，而非自动完成 |

## 技术上下文
- **TimerView.vue** (437行) — 计时器 UI 组件，`timer` reactive 对象当前为纯内存状态
- **useSelfFishState.js** — 中央状态 composable，已有 `saveLocal()` 到 localStorage 的 watch 机制
- **state.js** — 状态规范化工具，`localStorageKeyForUser()` 生成 key `selfFish408.v1.{userId}`
- **AppShell.vue** — 布局壳，通过 `<KeepAlive include="TimerView">` 保持组件在标签切换时不销毁
- 实现方案：在 `useSelfFishState.js` 的 state 中增加 `activeTimer` 字段，watch 会自动持久化到 localStorage；在 `TimerView.vue` 的 `onMounted` 中检查并恢复

## 本体（关键实体）
| 实体 | 类型 | 字段 | 关系 |
|------|------|------|------|
| Timer | 核心领域 | mode, direction, seconds, remaining, running, note, subject, startTime | Timer 完成后生成 PomodoroLog |
| PomodoroLog | 核心领域 | id, date, createdAt, subject, minutes, startTime, endTime, mode, note | 属于 User，用于统计 |
| ActiveTimerSnapshot | 持久化 | 同 Timer 字段 | 序列化到 localStorage |
| TimeoutNotification | UI | message, onConfirm, onDiscard | 在追赶后 remaining <= 0 时触发 |
| localStorage | 基础设施 | key: selfFish408.v1.{userId} | 存储 state.activeTimer |

## 本体收敛
| Round | 实体数 | 新增 | 变更 | 稳定 | 稳定性 |
|-------|--------|------|------|------|--------|
| 1 | 4 | 4 | — | — | — |
| 2 | 5 | 1 | 0 | 4 | 80% |

## Interview Transcript
<details>
<summary>Full Q&A (2 rounds)</summary>

### Round 0
**Q:** 拓扑确认：计时器状态持久化，单一组件
**A:** 确认，刷新后番茄钟计时器应追赶已过去的时间
**Ambiguity:** 未评分（拓扑确认轮）

### Round 1
**Q:** 如果刷新前计时器还剩 3 分钟，但刷新花了 5 分钟（计时器本应归零），怎么处理？
**A:** 显示超时提示 — 弹窗告知用户，让用户选择确认完成或放弃
**Ambiguity:** 23.5% (Goal: 0.8, Constraints: 0.7, Criteria: 0.7, Context: 0.9)

### Round 2
**Q:** 计时器有运行中、已暂停、空闲三种状态，哪些需要跨刷新持久化？
**A:** 运行中 + 已暂停
**Ambiguity:** 16.0% (Goal: 0.85, Constraints: 0.85, Criteria: 0.75, Context: 0.95)

</details>
