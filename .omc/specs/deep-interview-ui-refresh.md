# Deep Interview Spec: Self-fish UI 全面美化

## Metadata
- Interview ID: ui-refresh-20260528
- Rounds: 7
- Final Ambiguity Score: 19.5%
- Type: brownfield
- Generated: 2026-05-28
- Threshold: 0.2
- Threshold Source: default
- Initial Context Summarized: no
- Status: PASSED

## Clarity Breakdown
| Dimension | Score | Weight | Weighted |
|-----------|-------|--------|----------|
| Goal Clarity | 0.85 | 35% | 0.298 |
| Constraint Clarity | 0.80 | 25% | 0.200 |
| Success Criteria | 0.75 | 25% | 0.188 |
| Context Clarity | 0.80 | 15% | 0.120 |
| **Total Clarity** | | | **0.805** |
| **Ambiguity** | | | **19.5%** |

## Topology
| Component | Status | Description | Coverage / Deferral Note |
|-----------|--------|-------------|--------------------------|
| Dashboard | active | 今日泳池 — 试点页面，优先完成 | 已覆盖：字体、排版、留白、圆角 |
| Timer | deferred | 番茄钟 | 等仪表盘确认效果后再改 |
| Countdowns | deferred | 倒数日 | 等仪表盘确认效果后再改 |
| Subject Map | deferred | 全科进度 | 等仪表盘确认效果后再改 |
| Practice | deferred | 刷题记录 | 等仪表盘确认效果后再改 |
| Sentences | deferred | 长难句 | 等仪表盘确认效果后再改 |
| Distractions | deferred | 分心记录 | 等仪表盘确认效果后再改 |
| Knowledge Review | deferred | 知识点复盘 | 等仪表盘确认效果后再改 |
| Ideas | deferred | 灵感停车场 | 等仪表盘确认效果后再改 |
| Exam Analysis | deferred | 考情分析 | 等仪表盘确认效果后再改 |
| Expense | deferred | 记账 | 等仪表盘确认效果后再改 |
| Weekly Review | deferred | 周复盘 | 等仪表盘确认效果后再改 |
| Settings | deferred | 设置 | 等仪表盘确认效果后再改 |
| AppShell | deferred | 侧边栏导航框架 | 等仪表盘确认效果后再改 |
| LoginScreen | deferred | 登录页 | 等仪表盘确认效果后再改 |

## Goal
在保持现有 Hello Kitty 粉色可爱风格的基础上，系统性地提升全部 13 个页面的视觉品质。三个核心改进方向（按优先级排序）：
1. **字体升级**：中文使用文艺黑体，英文/数字使用 Caslon 衬线体，替换现有的 Quicksand + PingFang SC
2. **排版优化**：减少不必要的留白，让内容自适应填充界面
3. **圆角克制**：保留圆角基调但减少过度使用

实施策略：仪表盘(DashboardView.vue)先行作为试点，确认效果后再逐步覆盖其余页面。

## Constraints
- 必须保持现有 Kitty 粉色风格（渐变侧边栏、粉色系配色）
- 保持现有 CSS 变量体系但可扩展重构
- 可通过 CDN 引入字体（Google Fonts 等）
- 仅支持现代浏览器，无需兼容 IE
- 在现有单文件全局 CSS（styles.css）体系内工作
- 不改变 Vue 3 框架、无路由的架构、状态管理方式
- 功能逻辑不变，纯视觉优化

## Non-Goals
- 不重写为其他框架
- 不引入 vue-router、Pinia 等新依赖
- 不修改后端 server.js
- 不修改国际化系统
- 不修改功能逻辑和数据流

## Acceptance Criteria
- [ ] 中文字体替换为文艺黑体风格
- [ ] 英文/数字字体替换为 Caslon
- [ ] 仪表盘页面排版无明显多余留白
- [ ] 圆角使用更克制
- [ ] 整体保持粉色 Kitty 风格基调
- [ ] 仪表盘在桌面端和移动端响应式正常
- [ ] 用户审阅仪表盘效果满意后，再扩展到其余页面

## Assumptions Exposed & Resolved
| Assumption | Challenge | Resolution |
|------------|-----------|------------|
| "更美观"意味着要换成全新风格 | Contrarian 反向提问：是否要保持现有风格 | 保持 Kitty 粉色风格，在此基础上打磨 |
| 需要多种字体 | 追问具体不满意的点 | 只需一套好看的字体搭配（Caslon + 文艺黑体） |
| 圆角设计有问题 | 确认具体程度 | 大体没问题，减少过度使用即可 |
| 空白多是设计意图 | 反向挑战 | 用户坚持空白多不好看，需要减少 |
| 需要一次性改完所有页面 | 确认范围 | 仪表盘先行试点 |

## Technical Context
- Vue 3 SPA, Vite 6 构建
- 单文件全局 CSS: `src/styles.css` (1787 行)
- CSS 变量在 `:root` 中定义（--pink, --bg, --radius 等）
- 仪表盘: `src/views/DashboardView.vue`，布局为 `dashboard-grid` (1.2fr / 0.8fr 两列)
- 当前字体: `--font-display: "Quicksand", "PingFang SC"...` `--font-body: "PingFang SC"...`
- 当前圆角变量: `--radius: 10px`
- 侧边栏: 280px 固定宽度，粉色渐变
- 响应式断点: 960px（侧边栏折叠为顶部导航），560px（导航水平滚动）

## Ontology (Key Entities)
| Entity | Type | Fields | Relationships |
|--------|------|--------|---------------|
| 视图页面 (View) | core domain | 名称、导航 ID、布局模式 | AppShell 通过 activeView 切换 |
| 视觉主题 (Theme) | supporting | 粉色系配色、渐变、阴影 | 应用于全局 CSS 变量 |
| 排版系统 (Typography) | supporting | 字体族、字号层级、字重 | 通过 CSS 变量定义 |
| 间距/留白 (Spacing) | supporting | padding、margin、gap | 影响每个视图的布局 |
| 圆角半径 (Border Radius) | supporting | --radius 变量、组件级覆盖 | 全局和组件级 |
| 字体搭配 (Font Pairing) | supporting | Caslon(英文/数字) + 文艺黑体(中文) | 通过 @import 或 CDN 加载 |
| CSS 变量 (Design Tokens) | infrastructure | --pink, --bg, --radius 等 | 全局定义，组件引用 |

## Ontology Convergence
| Round | Entity Count | New | Changed | Stable | Stability Ratio |
|-------|-------------|-----|---------|--------|----------------|
| 1 | 4 | 4 | - | - | N/A |
| 2 | 6 | 2 | 0 | 4 | 67% |
| 3 | 8 | 2 | 0 | 6 | 75% |
| 4 | 9 | 1 | 0 | 8 | 89% |
| 5 | 10 | 1 | 0 | 9 | 90% |
| 6 | 10 | 0 | 0 | 10 | 100% |
| 7 | 7 | 0 | 0 | 7 | 100% |

## Interview Transcript
<details>
<summary>Full Q&A (7 rounds)</summary>

### Round 1
**Q:** 保持现有 Kitty 粉色风格在此基础上打磨精致，还是想要全新方向？
**A:** 保持现有风格在此基础上打磨精致
**Ambiguity:** 62.5%

### Round 2
**Q:** 当前界面最不满意、最想改进的三个具体问题？
**A:** 排版不够整齐、留白太多、文字字体太单调、圆角设计太多
**Ambiguity:** 47.5%

### Round 3
**Q:** 技术约束确认：引入 Google Fonts/CDN 字体？重构 CSS 变量？兼容老浏览器？
**A:** 接受，不需要兼容老浏览器
**Ambiguity:** 39.5%

### Round 4 (Contrarian)
**Q:** 如果空白多/圆角/字体单调反而是优势，你还坚持改吗？真正想要的是变精致还是彻底不同？
**A:** 字体不好看要改，空白多要改，圆角大体没问题但太多了
**Ambiguity:** 34.8%

### Round 5
**Q:** 喜欢的字体风格？圆润可爱/清秀文艺/干练现代？
**A:** 中文字体黑体文艺，英文和数字 Caslon 字体
**Ambiguity:** 29.2%

### Round 6 (Simplifier)
**Q:** 字体、留白、圆角，只改一个你选哪个？
**A:** 字体最在意
**Ambiguity:** 25.0%

### Round 7
**Q:** 一次性改完所有13个页面还是先改核心页面试点？
**A:** 先改仪表盘
**Ambiguity:** 19.5%

</details>
