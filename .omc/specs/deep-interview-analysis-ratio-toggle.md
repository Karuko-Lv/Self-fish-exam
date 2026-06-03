# Deep Interview Spec: 番茄分析学习/非学习比例切换

## Metadata
- Interview ID: d7a3f8e2-4b1c-4a9d-b5e6-1f8c3d2a7b9e
- Rounds: 4
- Final Ambiguity Score: 9%
- Type: brownfield
- Generated: 2026-05-29
- Threshold: 0.2
- Threshold Source: default
- Initial Context Summarized: no
- Status: PASSED

## Clarity Breakdown
| Dimension | Score | Weight | Weighted |
|-----------|-------|--------|----------|
| Goal Clarity | 0.95 | 35% | 0.333 |
| Constraint Clarity | 0.9 | 25% | 0.225 |
| Success Criteria | 0.85 | 25% | 0.213 |
| Context Clarity | 0.95 | 15% | 0.143 |
| **Total Clarity** | | | **0.913** |
| **Ambiguity** | | | **9%** |

## Topology
| Component | Status | Description | Coverage / Deferral Note |
|-----------|--------|-------------|--------------------------|
| 分类筛选切换 | active | 在番茄分析面板标题行增加"学习/非学习"切换按钮，将环形图在逐科目多段和学习/非学习两段之间切换 | 默认逐科目视图，仅环形图受影响，科目分布条和每日趋势不变，内存级状态保持 |

## Goal
在番茄分析面板（`TimerView.vue` 第494-557行）的标题行增加一个"学习/非学习"切换按钮。点击后环形图从逐科目多段视图变为学习（6科合计）vs 非学习两段视图，再次点击恢复。科目分布条和每日趋势图不受影响。默认显示逐科目视图，切换状态仅在内存中保持（刷新丢失）。

## Constraints
- 按钮位置：面板标题行（`.panel-header`），与日期筛选按钮（日/周/月/自定义）同行分开
- 按钮文案："学习/非学习"
- 按钮样式：复用现有 `filter-chip` 样式
- 默认视图：逐科目明细（即现有行为）
- 状态保持：仅内存级（`ref`），刷新页面后恢复默认逐科目视图
- 切换范围：仅环形图（SVG donut ring），科目分布条和每日趋势图保持不变
- 非学习科目 ID 为 `"nonStudy"`（定义在 `src/constants/defaults.js` 第15行）

## Non-Goals
- 不改变科目分布条（`.analysis-subject-bars`）的行为
- 不改变每日趋势图（`.analysis-daily-bars`）的行为
- 不涉及 localStorage 持久化
- 不修改数据模型或 `pomodoroLogs` 结构
- 不新增国际化翻译（"学习"和"非学习"已有翻译）

## Acceptance Criteria
- [ ] 面板标题行出现"学习/非学习"按钮，使用 `filter-chip` 样式
- [ ] 默认状态：按钮未激活，环形图显示逐科目多段（现有行为）
- [ ] 点击按钮后：按钮激活高亮，环形图变为两段——学习（6科目合计分钟数）和非学习（nonStudy 分钟数），显示各自百分比
- [ ] 再次点击恢复逐科目多段环形图
- [ ] 切换时科目分布条内容不变
- [ ] 切换时每日趋势图内容不变
- [ ] 刷新页面后按钮恢复默认未激活状态
- [ ] 两段环形图中，学习段颜色使用粉色系主色，非学习段使用灰色（`#8e8e93`，与 `nonStudySubject.accent` 一致）

## Assumptions Exposed & Resolved
| Assumption | Challenge | Resolution |
|------------|-----------|------------|
| 切换会影响所有图表 | 问：切换后科目分布条和趋势图是否也变？ | 仅环形图切换，其他图表不变 |
| 可能需要持久化 | 问：状态用 localStorage 还是内存？ | 内存级 ref，刷新丢失 |
| 默认可能是比例视图 | 问：默认展示哪个视图？ | 默认逐科目视图 |
| 按钮可能是图标 | 问：按钮显示什么文字？ | "学习/非学习" |

## Technical Context
- **主文件**: `src/views/TimerView.vue`
- **关键行**:
  - 分析面板模板：494-557 行
  - `analysisRange` ref：245 行
  - `analysisFiltered` computed：332-338 行
  - `analysisStats` computed：341-356 行
  - 环形图 SVG：513-527 行
  - 面板标题行：494-505 行
- **数据**:
  - 学习科目 IDs: `["ds", "co", "os", "net", "math1", "english1"]`（`src/constants/defaults.js` 6-13行）
  - 非学习 ID: `"nonStudy"`（`src/constants/defaults.js` 15行）
  - `nonStudySubject.accent`: `"#8e8e93"`
- **实现方案**:
  1. 新增 `showRatioView` ref（默认 `false`）
  2. 新增 `ratioStats` computed：将 `analysisStats.bySubject` 合并为 `{ study: totalStudyMin, nonStudy: nonStudyMin }`
  3. 模板中在 `.panel-header` 内增加 `filter-chip` 按钮
  4. 环形图区域用 `v-if/v-else` 或动态数据切换逐科目/两段渲染

## Ontology (Key Entities)
| Entity | Type | Fields | Relationships |
|--------|------|--------|---------------|
| 番茄分析面板 | core domain | dateRange, stats | contains RingChart, SubjectBars, DailyTrend |
| 分类切换按钮 | supporting | active, label | toggles RingChart view |
| 学习时间 | core domain | totalMinutes (sum of 6 subjects) | subset of pomodoroLogs |
| 非学习时间 | core domain | totalMinutes (nonStudy) | subset of pomodoroLogs |
| 环形图 | supporting | segments, colors | displays bySubject or ratio |
| 科目分布条 | supporting | perSubjectMinutes | unchanged by toggle |
| 每日趋势图 | supporting | dailyMinutes | unchanged by toggle |

## Ontology Convergence
| Round | Entity Count | New | Changed | Stable | Stability Ratio |
|-------|-------------|-----|---------|--------|----------------|
| 1 | 7 | 7 | - | - | N/A |
| 2 | 7 | 0 | 0 | 6 | 86% |
| 3 | 7 | 0 | 0 | 7 | 100% |
| 4 | 7 | 0 | 0 | 7 | 100% |

## Interview Transcript
<details>
<summary>Full Q&A (4 rounds)</summary>

### Round 1
**Q:** 你想要的"学习 vs 非学习时间比"展示，具体以什么形式呈现？
**A:** 切换按钮 + 两段环形图
**Ambiguity:** 56% (Goal: 0.5, Constraints: 0.3, Criteria: 0.3, Context: 0.8)

### Round 2
**Q:** 这个切换按钮放在哪里？切换后刷新页面或切换日期范围时，是否保持当前选择？
**A:** 放在面板标题行，保持状态
**Ambiguity:** 48% (Goal: 0.55, Constraints: 0.5, Criteria: 0.3, Context: 0.85)

### Round 3
**Q:** 切换按钮默认展示哪个视图？切换后，科目分布条和每日趋势图是保持不动还是也跟着变成学习/非学习两类的汇总？
**A:** 默认逐科目视图，科目条和趋势图不变
**Ambiguity:** 22% (Goal: 0.85, Constraints: 0.75, Criteria: 0.65, Context: 0.9)

### Round 4
**Q:** 切换按钮显示什么文字？状态保持用内存（刷新丢失）还是 localStorage（持久化）？
**A:** 按钮文字"学习/非学习"，用内存保持
**Ambiguity:** 9% (Goal: 0.95, Constraints: 0.9, Criteria: 0.85, Context: 0.95)

</details>
