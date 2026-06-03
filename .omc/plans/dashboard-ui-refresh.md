# Plan: Dashboard 试点 UI 美化（v2 — 修订版）

## Metadata
- Source: `.omc/specs/deep-interview-ui-refresh.md`
- Mode: consensus (RALPLAN-DR short)
- Status: ACCEPTED (Critic approved v2.1) → pending approval
- Revision: v2, incorporates Architect + Critic feedback
- Scope: 字体全局应用 + 间距/圆角限定 Dashboard

---

## RALPLAN-DR Summary

### Principles
1. **风格延续优先** — 保持 Kitty 粉色系配色、渐变侧边栏、猫脸元素不变
2. **字体先行** — 字体是用户最高优先级，Caslon + 文艺黑体替换 Quicksand + PingFang SC；字体天然全局，不需要试点
3. **真试点** — 间距和圆角改动限定 Dashboard 页面，通过 scoped 选择器实现，不动 `:root` 变量和全局共享选择器（`.panel`、`.page-view`）
4. **字体分层** — 引入 `--font-display`（标题/大数字/Caslon）和 `--font-ui`（小标签/按钮/导航/无衬线）两个变量，避免 Caslon 在小字号 UI 元素上可读性差
5. **功能不动** — 纯 CSS/视觉层改动，不碰 Vue 模板逻辑、状态管理、i18n

### Decision Drivers
1. **字体方案** — Caslon 英文的加载方式 + 中文黑体配对 + 子集化策略
2. **试点范围边界** — 精确区分哪些改动是全局的（字体），哪些限定 Dashboard（间距、圆角）
3. **Caslon 适用范围** — 哪些元素用 Caslon，哪些保持无衬线

### Viable Options

**Option A: Libre Caslon Text + Noto Sans SC subset（Google Fonts CDN，子集化）**
- 优点：免费、Caslon 正宗复刻、Noto Sans SC subset (chinese-simplified) 约 800KB 而非 5-8MB、CDN 分发
- 缺点：非子集字符使用系统 fallback、首屏仍有字体加载时间

**Option B: 保持 Quicksand + PingFang SC（不改字体）**
- 优点：零加载成本、零风险
- 缺点：用户明确表示字体是最不满意的点（Round 6），不做字体改动等同于不解决核心问题
- **Invalidation**: 与用户显式优先级冲突

**Recommendation: Option A** — Libre Caslon Text + Noto Sans SC (chinese-simplified subset)，Google Fonts CDN，`display=swap`。

---

## Architect Review Disposition

| # | Finding | Disposition | Rationale |
|---|---------|-------------|-----------|
| 1 | Noto Sans SC 5-8MB 过大 | **Accepted** | 改用 Google Fonts `subset=chinese-simplified` 参数，约 800KB；同时保留 PingFang SC 在 fallback 链中 |
| 2 | Caslon 小字号可读性差 | **Accepted** | 新增 `--font-ui` 变量，小号 UI 元素（< 0.9rem）使用无衬线字体 |
| 3 | `tabular-nums` 与 Libre Caslon 不兼容 | **Accepted** | 将 `font-variant-numeric: tabular-nums` 从通用选择器移出，限定到使用 `--font-numbers` 的元素（timer 等需要等宽数字的场景） |
| 4 | `--radius` 全局改动违反试点原则 | **Accepted** | 改为 Dashboard-scoped 变量覆盖，不动 `:root --radius` |
| 5 | 响应式断点间距层级坍缩 | **Accepted** | 移动端间距同步按比例调整，保持桌面/移动视觉层级差 |
| 6 | `exporters.js:65` 硬编码字体 | **Accepted** | 更新导出器字体栈，与新变量一致 |
| 7 | Caslon 视觉重量与 Quicksand 不同 | **Accepted** | Caslon 在同等字号下视觉更轻，大数字元素微调 font-size +0.2rem 补偿 |

---

## Requirements Summary
保持 Kitty 粉色风格，对字体（全局）和 Dashboard 间距/圆角（scoped）进行视觉优化：
1. **字体升级（全局）**：Caslon 英文/数字 + Noto Sans SC subset 中文
2. **减少多余留白（Dashboard only）**：收紧 Dashboard 面板内间距
3. **克制圆角使用（Dashboard only）**：Dashboard 内小元素圆角减小

## Acceptance Criteria
- [ ] `index.html` 引入 Google Fonts（Libre Caslon Text 400/700 + Noto Sans SC 400/500/700, subset=chinese-simplified, display=swap）
- [ ] CSS `:root` 新增三个字体变量：`--font-display`（Caslon + 中文标题）、`--font-body`（中文正文）、`--font-ui`（小号 UI 标签，纯无衬线）
- [ ] `--font-display` 不再用于小号 UI 元素（`.eyebrow`、`.metric-pill`、`.date-box`、nav items 等改用 `--font-ui`）
- [ ] `font-variant-numeric: tabular-nums` 从通用 `h2 span, .countdown strong` 选择器移除，改为仅作用于 timer 等需要数字对齐的场景
- [ ] Dashboard 根元素使用 scoped CSS 自定义属性覆盖间距和圆角值，`styles.css` 不修改 `:root --radius` 和共享选择器
- [ ] Dashboard `.hero-stats`、`.pool-clock`、`.countdown`、`.panel-header` 间距收紧 10-20%
- [ ] Dashboard 内按钮、input 等小元素圆角使用更小的值
- [ ] Desktop (>=960px) / Tablet (<960px) / Mobile (<560px) 三个断点正常
- [ ] `exporters.js` 字体栈与 CSS 变量保持一致
- [ ] 保持粉色系配色、渐变侧边栏、猫脸等 Kitty 元素不变
- [ ] 功能逻辑零改动

## Implementation Steps

### Step 1: 字体引入 (`index.html`)
**文件**: `index.html`

- 更新现有 `<link rel="preconnect">`（已有指向 fonts.googleapis.com / fonts.gstatic.com 的预连接，无需新增）
- 替换 Quicksand 的 `<link>` 为：
  ```
  <link href="https://fonts.googleapis.com/css2?family=Libre+Caslon+Text:ital,wght@0,400;0,700&family=Noto+Sans+SC:wght@400;500;700&subset=chinese-simplified&display=swap" rel="stylesheet">
  ```

### Step 2: 字体变量重构 (`src/styles.css` `:root` 块)
**文件**: `src/styles.css`，行 15-18

当前（行 16-17）：
```css
--font-display: "Quicksand", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
--font-body: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
```

改为三个变量的字体层级系统：
```css
--font-display: "Libre Caslon Text", "PingFang SC", "Noto Sans SC", "Hiragino Sans GB", "Microsoft YaHei", serif;
--font-body: "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
--font-ui: "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
```

注意：
- `--font-display` fallback 链中 PingFang SC 在 Noto Sans SC 之前，这样中文在 Noto 加载完成前先用系统 PingFang 渲染，视觉差异最小。
- `--font-ui` 与 `--font-body` 目前指向相同的字体栈。保留两个独立变量是为了语义分离（body 正文 vs UI 控件），后续可以独立调整（例如 UI 元素换用更紧凑的无衬线字体）。

### Step 3: 字体分类 —— display vs ui (`src/styles.css`)
**文件**: `src/styles.css`

将以下 `var(--font-display)` 引用分为两类。注意：部分元素当前**没有**显式 `font-family` 声明（继承自 `:root` 的 `--font-body`），需要**新增**声明才能使用 Caslon。

**使用 `--font-display`（标题、大数字、品牌 — 需要 Caslon 的文艺气质）**：
- `h1` (行 40) — 品牌标题 ✅ 已有显式声明
- `h2` (行 41) — 页面大标题 ✅ 已有
- `h3` (行 43) — 面板标题 ✅ 已有
- `.countdown strong` (行 294) — 倒计时数字 4rem ⚠️ **需新增 `font-family: var(--font-display);`**
- `.hero-stats strong` (行 354) — 统计数字 1.4rem ⚠️ **需新增 `font-family: var(--font-display);`**
- `.pool-clock strong` (行 508) — 日期大字 ⚠️ **需新增 `font-family: var(--font-display);`**
- `.pool-clock span` (行 513) — 时间大字 ⚠️ **需新增 `font-family: var(--font-display);`，同时移除 `font-variant-numeric: tabular-nums`（Caslon 不支持 tnum）**
- `.brand-block h1` (行 1759) — 侧边栏品牌 ✅ 已有
- `.timer-core strong` (行 698) — 番茄钟时间数字 ✅ 已有
- `.next-card-days strong` (行 339) — 倒计时卡片数字 1.8rem ⚠️ **需新增 `font-family: var(--font-display);`**

**改为 `--font-ui`（小标签、按钮、导航 — 纯无衬线保证可读性）**：
- `.eyebrow, .panel-kicker` (行 199) — 0.72rem 小标签
- `.nav-item` (行 215) — 导航按钮
- `.metric-pill, .date-box` (行 289) — 0.88rem 指标标签
- `.mood-card, .filter-chip, ...` 等按钮基类 (行 382) — 按钮文字
- `.sidebar-note strong` (行 1765) — 侧边栏文字
- `.sidebar-note span` (行 1770) — 侧边栏文字
- `label` (行 1775) — 表单标签
- `.list-item strong` (行 1785) — 列表项标题
- `.timer-core span` (行 692) — timer 标签
- `.timer-core small` (行 746) — timer 小字
- `.preset-button` (行 918) — 预设按钮
- `.timer-direction-button` (行 918) — 方向按钮
- `.analysis-ring-center strong` (行 1532) — 分析环数字
- `.analysis-ring-center span` (行 1538) — 分析环标签
- `.analysis-hero-card em` (行 1560) — 分析卡片数字
- `.analysis-hero-card span` (行 1566) — 分析卡片标签
- `.donelist-subject` (行 1696) — 时间线科目名
- `.break-strip-label` (行 979) — 休息条标签

### Step 4: 修复 tabular-nums (`src/styles.css`)
**文件**: `src/styles.css`，行 42

当前：
```css
h2 span, .countdown strong { color: var(--coral); font-variant-numeric: tabular-nums; }
```

改为：
```css
h2 span, .countdown strong { color: var(--coral); }
```

Libre Caslon Text 不支持 `tnum` OpenType 特性。`font-variant-numeric: tabular-nums` 仅对支持该特性的字体有效。对于倒计时天数显示，数字变化缓慢（天级别），移位效应可忽略。对于番茄钟秒数（`.timer-core strong`），保留现有 Quicksand 行为，或使用 `font-feature-settings: "tnum"` 仅在支持该特性的 fallback 字体上启用。

### Step 5: Dashboard scoped 间距和圆角 (`src/styles.css` 新增块)
**文件**: `src/styles.css`

在 Dashboard 相关选择器区域新增一个 scoped 块。不修改 `:root --radius` (行 15) 和 `.panel`/`.page-view` 等共享选择器。

新增 Dashboard-scoped 覆盖：
```css
/* Dashboard scoped overrides — pilot */
.dashboard-grid {
  --dashboard-radius: 6px;
  --dashboard-panel-padding: 14px;
  gap: 12px;
}
.dashboard-grid .panel {
  padding: var(--dashboard-panel-padding);
  border-radius: var(--dashboard-radius);
}
.dashboard-grid .hero-panel {
  border-radius: var(--dashboard-radius);
}
.dashboard-grid .pool-clock {
  margin-bottom: 10px;
  padding: 12px;
}
.dashboard-grid .countdown {
  margin: 8px 0;
}
.dashboard-grid .hero-stats {
  margin: 14px 0;
  gap: 8px;
}
.dashboard-grid .hero-stats div,
.dashboard-grid .next-card,
.dashboard-grid .recommend-box {
  padding: 10px;
}
.dashboard-grid .hero-stats strong {
  font-size: 1.45rem; /* Caslon 补偿：+0.05rem */
}
.dashboard-grid .countdown strong {
  font-size: 4.2rem; /* Caslon 补偿：+0.2rem */
}
.dashboard-grid .mood-grid {
  gap: 8px;
}
.dashboard-grid .task-lanes {
  gap: 8px;
}
.dashboard-grid .compact-form {
  gap: 10px;
}
.dashboard-grid .mini-list {
  gap: 8px;
}
.dashboard-grid input,
.dashboard-grid select,
.dashboard-grid textarea,
.dashboard-grid .primary-button,
.dashboard-grid .secondary-button,
.dashboard-grid .small-button,
.dashboard-grid .mood-card {
  border-radius: 4px; /* 比全局 --radius:10px 明显更克制 */
}
.dashboard-grid .metric-pill,
.dashboard-grid .date-box {
  border-radius: 6px;
}
/* end Dashboard scoped */
```

注意：`.dashboard-grid` 是 Dashboard 特有的 grid 类（`styles.css:265`），其他 12 个页面不使用此类，天然隔离。

### Step 6: 响应式间距同步 (`src/styles.css`)
**文件**: `src/styles.css`，960px 断点 (行 1127-1179) 和 560px 断点 (行 1182-1265)

在 960px 断点内追加：
```css
.dashboard-grid { gap: 10px; }
.dashboard-grid .panel { padding: 12px; }
```

在 560px 断点内，更新现有 Dashboard 覆盖（行 1241-1261）：
- `.dashboard-grid { gap: 10px; }`（当前行 1241 已有基础 grid gap）
- `.panel` padding 保持 12px（行 1260），与 scoped 14px desktop 值形成 2px 差距（保持层级感）
- `.hero-stats` margin 从 12px 0 改为 10px 0
- `.pool-clock` padding 从 12px 改为 10px，margin-bottom 8px

Dashboard-scoped 覆盖（Step 5 中的 `.dashboard-grid .panel`）在 desktop 已设为 14px，移动端保持 12px → 2px 层级差。比例上 desktop 14px / mobile 12px = 1.17x，与原来 18px / 12px = 1.5x 相比收窄但仍可辨识。

### Step 7: exporters.js 字体更新 (`src/utils/exporters.js`)
**文件**: `src/utils/exporters.js`，约行 65

将硬编码的 `font-family: "PingFang SC", "Microsoft YaHei", sans-serif` 更新为与 `--font-body` 一致的 `font-family: "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif`。

### Step 8: 验证
**文件**: 无需修改，手动验证步骤

1. `npm run dev` 启动开发服务器
2. **字体验证**：打开 DevTools > Elements > Computed，选中 `.countdown strong`，确认 `font-family` 渲染字体为 "Libre Caslon Text"
3. **字体分类验证**：选中 `.metric-pill`，确认 `font-family` 为 "Noto Sans SC"（不是 Libre Caslon Text）
4. **间距验证**：1440px 视口，DevTools 测量 `.hero-stats` 区块上下间距（含 margin），从原来的约 110px 降至约 95-100px
5. **圆角验证**：选中 Dashboard 内任意 `button.primary-button`，确认 `border-radius` 为 4px（非全局 10px）
6. **响应式**：依次切换 375px / 768px / 1024px / 1440px 视口，检查 Dashboard 四个区域无溢出、无重叠
7. **Network 面板**：检查字体加载，确认 Noto Sans SC 请求包含 `subset=chinese-simplified`
8. **非 Dashboard 页面**：快速浏览 Timer / Settings 等页面，确认字体已更新但间距/圆角未变（试点隔离验证）
9. 截图对比改动前后（Dashboard + 一个非 Dashboard 页面对照）
10. 与用户确认效果，收录反馈

## ADR

### Decision
采用 **Libre Caslon Text + Noto Sans SC (chinese-simplified subset)** 作为新字体方案，通过 Google Fonts CDN 加载。字体变量拆分为三层（display / body / ui），Caslon 仅用于标题和大数字。间距和圆角改动限定 Dashboard 页面作为试点。

### Drivers
1. 用户显式要求 Caslon 英文 + 文艺黑体中文（Interview Round 5）
2. 字体是用户最高优先级改动（Round 6：三选一排序）
3. 用户确认仪表盘先行试点（Round 7）
4. 保持 Kitty 粉色风格不变（Round 1、Round 4）

### Alternatives Considered
- **Adobe Caslon Pro + 自托管思源黑体**：品质最高，但 Adobe Caslon 需要付费订阅，自托管增加构建复杂度。已排除。
- **保持 Quicksand + PingFang SC 不改**：最安全但直接违背用户核心诉求。已排除。
- **Noto Sans SC 全量加载**：5-8MB 过大，首屏体验差。通过 subset 参数优化后采纳。

### Why Chosen
Libre Caslon Text 是 Caslon 的正宗开源复刻，Google Fonts 免费分发。Noto Sans SC chinese-simplified subset 约 800KB，远小于全量，且 Google Fonts CDN 全球分发、用户已有预连接。字体三层变量（display/ui/body）解决了 Caslon 在小字号 UI 元素上的可读性问题。

### Consequences
- 字体加载会产生短暂 FOUT（display=swap），但首次加载后浏览器缓存
- Caslon 的古典衬线气质与 Kitty 粉色可爱风形成张力（用户可接受，见 Round 4）
- 后续铺开其余 12 个页面时，字体无需再动，只需按模式复制 Dashboard scoped 间距/圆角覆盖

### Follow-ups
- 用户确认 Dashboard 效果后，逐页应用间距和圆角优化
- 考虑在铺开阶段提取公共 scoped 变量为全局 `--radius-sm` / `--radius-lg` 体系

## Risks and Mitigations
| Risk | Mitigation |
|------|-----------|
| Noto Sans SC subset 缺少部分中文字符 | 保留 PingFang SC / Hiragino Sans GB 在 fallback 链中，未覆盖字符自动回退 |
| Caslon 衬线体在低分屏可读性差 | `--font-ui` 确保小号 UI 元素使用无衬线；标题大字号下 Caslon 衬线反而是优势 |
| Dashboard scoped 覆盖与全局样式优先级冲突 | 使用 `.dashboard-grid .panel` 双类选择器确保优先级高于全局 `.panel` |
| 响应式断点下 Dashboard scoped 覆盖遗漏 | Step 6 显式在 960px/560px 断点内追加 Dashboard-scoped 规则 |
| 试点效果不好需要回滚 | git revert 单次 commit 即可完全恢复 |

## Verification Steps
1. `npm run dev`
2. DevTools Computed tab: `.countdown strong` → "Libre Caslon Text"；`.metric-pill` → "Noto Sans SC"
3. Measure `.hero-stats` vertical space: was ~110px, target ≤100px
4. Check Dashboard button `border-radius` = 4px
5. Viewport: 375px / 768px / 1024px / 1440px — no overflow, no overlap
6. Network: confirm `subset=chinese-simplified` in Noto Sans SC request URL
7. Quick check 2 non-Dashboard pages: font updated, spacing/radius unchanged
8. Screenshot: Dashboard before/after + 1 control page
9. User review

## Changelog

### v2.1 (Critic re-review fixes)
- Step 3: 标注 5 个需要**新增** `font-family` 声明的元素（原计划误标为"保持"）
- Step 3: 新增 `.next-card-days strong` 分类（1.8rem 数字，使用 `--font-display`）
- Step 3: `.pool-clock span` 新增时同步移除 `font-variant-numeric: tabular-nums`
- Step 2: 注明 `--font-ui` 与 `--font-body` 语义分离的意图

### v1 → v2 (Architect + Critic round 1)
- Added `--font-ui` variable; classified all 22 `--font-display` usages
- Font strategy: Noto Sans SC now uses `subset=chinese-simplified` (~800KB vs 5-8MB)
- Removed `font-variant-numeric: tabular-nums` from generic selector
- Radius/spacing changes now Dashboard-scoped via `.dashboard-grid` selector; `:root --radius` and shared selectors untouched
- Added responsive spacing adjustments for 960px/560px breakpoints
- Added Step 7 for `exporters.js` font update
- Replaced subjective verification with concrete DevTools inspection steps
- Added Architect Review Disposition table
- Added ADR section
- Added control page check in verification (non-Dashboard pages should not show spacing/radius changes)
