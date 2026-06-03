# Deep Interview Spec: 全页面密集排布优化

## Metadata
- Interview ID: d3f8a1b2-c4e5-4f6a-8b9c-0d1e2f3a4b5c
- Rounds: 3
- Final Ambiguity Score: 12.5%
- Type: brownfield
- Generated: 2026-05-28
- Threshold: 0.2
- Threshold Source: default
- Initial Context Summarized: no
- Status: PASSED

## Clarity Breakdown
| Dimension | Score | Weight | Weighted |
|-----------|-------|--------|----------|
| Goal Clarity | 0.90 | 0.35 | 0.315 |
| Constraint Clarity | 0.85 | 0.25 | 0.213 |
| Success Criteria | 0.85 | 0.25 | 0.213 |
| Context Clarity | 0.90 | 0.15 | 0.135 |
| **Total Clarity** | | | **0.875** |
| **Ambiguity** | | | **12.5%** |

## Topology
| Component | Status | Description | Coverage / Deferral Note |
|-----------|--------|-------------|--------------------------|
| Dashboard grid densification | active | 主页面两列网格消除空白单元格，改为列容器方案 | 验收：左右列各自无缝堆叠 |
| Split-layout views | active | 计时器等 split-layout 页面确认无同类问题 | 审计结论：已安全，无需改动 |
| Auto-fit grid views | active | map-grid/review-grid/settings-grid 等自适应网格页 | SubjectMapView 的 topic-chip-grid 加 dense；其余安全 |

## Goal
所有页面使用统一的 12px 模块间距，面板在各自列内密集堆叠，消除因 CSS Grid 稀疏自动放置产生的大块空白区域。保持现有列宽比例和响应式行为不变。

## Constraints
- 左右列宽度比例不变：1.2fr / 0.8fr（右列最小 320px）
- 模块间距统一 12px（与现有 `gap: 12px` 一致）
- 面板上下顺序可调整以实现密集排布
- 960px / 560px 响应式断点行为不变
- 不新增依赖，纯 CSS + 模板结构调整

## Non-Goals
- 不改变单个面板内部布局
- 不改变配色、字体、圆角等视觉样式
- 不引入 CSS Grid masonry（浏览器支持不足）
- 不改为瀑布流或 Pinterest 式布局

## Acceptance Criteria
- [ ] DashboardView：桌面端两列布局中，同列面板之间仅存在 12px 的 gap，无因跨行对齐产生的空单元格
- [ ] DashboardView：右列面板（日历、状态、专注记录）从日历底部到专注记录底部连续堆叠，中间无大块空白
- [ ] DashboardView：960px 以下变为单列，与现有行为一致
- [ ] SubjectMapView：`.topic-chip-grid` 添加 `grid-auto-flow: dense`，小块自适应填满
- [ ] 其他 split-layout / review-grid / settings-grid 页面审计确认无稀疏放置间隙
- [ ] 所有页面 panel 之间的间距视觉一致（12px）
- [ ] `npm run build` 编译无错误

## Assumptions Exposed & Resolved
| Assumption | Challenge | Resolution |
|------------|-----------|------------|
| 只需改主页面 | Topology 确认时问及范围 | 扩展为所有页面，但审计后发现大部分已安全 |
| 密集=零空白 | 用户澄清 | 非零空白，模块间保留 12px 统一间距 |
| 列比例不可动 | Round 2 约束确认 | 保留 1.2fr/0.8fr，面板顺序可调 |
| 面板顺序必须保持 | Round 2 约束确认 | 顺序可调整以优化排布 |

## Technical Context
- Vue 3 + Vite，纯 CSS 方案，全局样式在 `src/styles.css`
- 主页面 DashboardView.vue 模板需调整为列容器结构
- 当前 `.dashboard-grid` 使用 `grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr)` + `align-items: start`
- `.hero-panel, .tasks-panel { grid-column: 1 }` 显式锁定左列
- 右列面板（mini-calendar、mood/state、focus）通过自动放置落入空单元格
- 核心改动：将左右列分别包装为 flex 列容器，消除网格自动放置

## Ontology (Key Entities)
| Entity | Type | Fields | Relationships |
|--------|------|--------|---------------|
| dashboard-grid | core domain | 2 columns, 12px gap | contains 2 column-containers |
| column-container | supporting | flex-direction: column, 12px gap | contains panels |
| panel | core domain | border, padding, shadow | stacked within column-container |
| gap | supporting | 12px | separates adjacent panels |
| responsive-breakpoint | supporting | 960px, 560px | switches grid to single column |

## Ontology Convergence
| Round | Entity Count | New | Changed | Stable | Stability Ratio |
|-------|-------------|-----|---------|--------|----------------|
| 1 | 5 | 5 | - | - | N/A |
| 2 | 7 | 2 | 0 | 5 | 71% |
| 3 | 5 | 0 | 0 | 5 | 100% |

## Interview Transcript
<details>
<summary>Full Q&A (3 rounds)</summary>

### Round 0 (Topology)
**Q:** 范围确认 — 只需改主页面还是所有页面？
**A:** 所有页面都要

### Round 1
**Q:** 密集排布具体形式：瀑布流、等高列对齐、紧凑重排？
**A:** 等高列对齐 — 保持两列结构，同列面板无缝堆叠

### Round 2
**Q:** 列宽比例和面板顺序约束？
**A:** 比例保留（1.2fr/0.8fr），顺序可调

### Round 3
**Q:** 验收标准？
**A:** （用户主动澄清）所有界面都要密集排布，不是完全没有空白，模块间距 12px

**Ambiguity:** 12.5% (Goal: 0.90, Constraints: 0.85, Criteria: 0.85, Context: 0.90)
</details>
