# Deep Interview Spec: 全科进度思维导图改造

## Metadata
- Interview ID: `mindmap-knowledge-nodes`
- Rounds: 8
- Final Ambiguity Score: 10.8%
- Type: brownfield
- Generated: 2026-05-31
- Threshold: 0.2
- Threshold Source: default
- Initial Context Summarized: no
- Status: PASSED

## Clarity Breakdown
| Dimension | Score | Weight | Weighted |
|-----------|-------|--------|----------|
| Goal Clarity | 0.95 | 35% | 0.333 |
| Constraint Clarity | 0.80 | 25% | 0.200 |
| Success Criteria | 0.90 | 25% | 0.225 |
| Context Clarity | 0.90 | 15% | 0.135 |
| **Total Clarity** | | | **0.893** |
| **Ambiguity** | | | **10.8%** |

## Topology
| Component | Status | Description | Coverage / Deferral Note |
|-----------|--------|-------------|--------------------------|
| 知识点碎片化展示 | active | 每个知识点从 chip 网格中的一格变成画布上的独立 fragment/节点，可被单独操作和查看 | 验收条件 #1, #2 覆盖 |
| 思维导图式知识结点 | active | 类似 XMind 的画布式节点连线交互，三张独立导图（408四合一、数学一、英语一），节点可拖拽、画布可缩放平移 | 验收条件 #1, #2 覆盖 |
| 复盘与题型记录 | active | 每个节点点击后展示复习时间线详情面板，支持添加文本笔记、错因标签、题型标记，一期暂不含截图上传 | 验收条件 #3 覆盖 |
| 现有状态系统升级 | active | 取消手动六状态循环切换，节点健康度由复习时间线记录自动推导计算 | 验收条件 #4, #5 覆盖 |

## Goal

将现有的"全科进度"页面（SubjectMapView）从单科 tab 切换 + 扁平 chip 网格改造为三张独立画布式思维导图，每个知识点作为画布上的独立节点，支持点击查看复习时间线并添加复习记录，节点健康度由复习记录自动推导而非手动点击切换。一期 MVP 聚焦：导图浏览 + 节点详情 + 复习记录。新视图替换现有页面，保留"经典模式"入口可切回旧 chip 网格。

## Constraints

- **设备**: 桌面端 + 移动端（手机和平板）
- **第三方库**: 允许引入图可视化库来实现画布交互
- **导图分组**: 三张独立导图——(数据结构+计组+OS+网络) 合一、数学一、英语一
- **一期 MVP 范围**: 导图浏览 + 节点详情面板 + 复习记录添加；节点编辑/连线编辑/截图上传延后至二期
- **数据存储**: 服务端存储（沿用现有 `/api/state` 端点或扩展）
- **页面关系**: 新导图替换现有 SubjectMapView 作为主视图，保留"经典模式"入口切回旧 chip 网格
- **状态推导**: 节点健康度由复习记录时间线自动计算，不再手动点击切换
- **兼容性**: 现有 `topicState` 数据需迁移至新的节点数据模型，经典模式仍需可用

## Non-Goals（一期不做）

- 节点的自由创建、删除、重命名（使用现有 seedTopics 预置节点）
- 节点之间的连线/边编辑
- 截图/图片上传到复习记录
- 跨导图的节点关联
- 导图的导出/分享功能
- 协作/多设备实时同步

## Acceptance Criteria

- [ ] **AC1**: 打开"全科进度"页面，看到三张导图的切换入口（408四合一 / 数学一 / 英语一），默认展示 408 导图
- [ ] **AC2**: 画布上的知识点节点根据健康度显示不同颜色/视觉状态，支持鼠标/手指拖拽画布平移和双指/滚轮缩放
- [ ] **AC3**: 点击任意节点弹出详情面板（侧边栏或模态框），展示该知识点的复习时间线（按时间倒序），面板中可添加新复习记录：自由文本笔记 + 选择预置错因标签 + 标记/选择题型分类
- [ ] **AC4**: 添加复习记录后，节点的视觉状态自动更新（健康度由复习记录的新鲜度和结果重新计算），无需手动点击切换状态
- [ ] **AC5**: 在页面工具栏或导航处可一键切换到"经典模式"，看到原有的 subject tabs + chip 网格视图，已有的复习记录以某种方式在经典模式中可见

## Assumptions Exposed & Resolved
| Assumption | Challenge | Resolution |
|------------|-----------|------------|
| "像思维导图一样"可能只是树形列表 | Round 1 追问交互形态 | 确认为画布式节点连线（类 XMind） |
| 所有知识点在一张图里 | Round 4 Contrarian 挑战 | 确认为三张独立导图：408四合一、数学一、英语一 |
| 状态继续用手动点击切换 | Round 5 追问状态系统演化 | 确认为自动推导，复习时间线成为一等数据 |
| 截图是必需的 | Round 6 Simplifier MVP 拆分 | 确认一期只需文本笔记+错因标签+题型标记 |
| 可能需要新增独立页面 | Round 7 追问页面关系 | 确认为替换主视图 + 保留经典模式入口 |
| 验收标准需用户逐条手写 | Round 8 归纳确认 | AI 归纳 5 条，用户全部确认 |

## Technical Context

### 现有系统
- **框架**: Vue 3 (Composition API, `<script setup>`)
- **状态管理**: 自研 composable `useSelfFishState.js`，基于 reactive 对象 + deep watcher 自动持久化
- **数据存储**: localStorage 本地 + `/api/state` 服务端同步（debounce 500ms）
- **路由**: 无 vue-router，基于 AppShell 的条件渲染切换视图
- **样式**: 原生 CSS（`styles.css`），有部分未使用的 `.progress-matrix`/`.subject-lane` CSS 类
- **现有数据模型**: `topicState[subjectId]` → `[{ id, name, status }]`，扁平数组，每个知识点只有名称和六状态之一

### 目标数据模型（建议）

```js
// 新的节点数据模型
topicState[subjectId] → [
  {
    id: "ds-0",
    name: "绪论与复杂度",
    position: { x: 100, y: 200 },  // 画布上的位置（二期编辑时使用）
    reviewLog: [                      // 复习时间线（核心新增）
      {
        id: "log-xxx",
        date: "2026-05-31",
        note: "今天重新做了王道课后题...", // 自由文本
        errorCauses: ["概念不清", "计算错误"], // 错因标签（多选）
        questionTypes: ["选择题", "简答题"],   // 题型标记（多选）
        result: "improving" | "mastered" | "struggling", // 本次复习自我评估
      }
    ],
    // status 变为派生计算值，不再存储在数据中
  }
]
```

### 库选型建议
| 库 | 适用场景 | 包大小 |
|----|---------|--------|
| **Cytoscape.js** | 图可视化，节点+边渲染成熟，移动端支持好 | ~300KB |
| **G6 (AntV)** | 阿里出品，定制性强，中文文档好 | ~500KB |
| **D3.js + 自建** | 灵活度最高但开发量大 | ~250KB |

建议一期使用 **Cytoscape.js**：图渲染开箱即用，移动端手势支持成熟，插件生态丰富。

### 经典模式兼容
- 现有 `SubjectMapView.vue` 的核心逻辑（subject tabs + chip grid + 状态点击切换）保留，通过 `viewMode` ref 切换 `'map' | 'classic'`
- 经典模式下，chip 的颜色映射从 `topic.status`（旧）或 `derivedHealth(topic.reviewLog)`（新）读取

## Ontology (Key Entities)
| Entity | Type | Fields | Relationships |
|--------|------|--------|---------------|
| MindMap（导图） | core domain | id, name, subjectIds[] | MindMap has many KnowledgeNodes |
| KnowledgeNode（知识节点） | core domain | id, name, position, subjectId | KnowledgeNode belongs to MindMap; has many ReviewRecords |
| ReviewRecord（复习记录） | core domain | id, date, note, errorCauses[], questionTypes[], result | ReviewRecord belongs to KnowledgeNode |
| Subject（科目） | supporting | id, name, accent | Subject contains many KnowledgeNodes |
| ErrorCause（错因） | supporting | id, label | referenced by ReviewRecord.errorCauses[] |
| QuestionType（题型） | supporting | id, label, subjectId | referenced by ReviewRecord.questionTypes[] |
| DerivedHealth（健康度） | derived | level (danger/warning/stable/good), lastReviewDate | computed from ReviewRecord recency + result pattern |
| ClassicView（经典模式） | supporting | — | read-only mirror of KnowledgeNode data in chip grid format |
| Connection（连线） | deferred (二期) | sourceId, targetId, label | connects KnowledgeNode to KnowledgeNode |

## Ontology Convergence
| Round | Entity Count | New | Changed | Stable | Stability Ratio |
|-------|-------------|-----|---------|--------|-----------------|
| 1 | 6 | 6 | - | - | N/A |
| 2 | 6 | 0 | 0 | 6 | 100% |
| 3 | 7 | 1 (TimelineReviewLog) | 0 | 6 | 86% |
| 4 | 8 | 1 (MindMap) | 0 | 7 | 88% |
| 5 | 9 | 1 (ReviewTimelineEvent) | 0 | 8 | 89% |
| 6 | 9 | 0 | 0 | 9 | 100% |
| 7 | 9 | 0 | 0 | 9 | 100% |
| 8 | 9 | 0 | 0 | 9 | 100% |

本体从 Round 6 起已完全收敛，连续 3 轮无变化。

## Interview Transcript
<details>
<summary>Full Q&A (8 rounds)</summary>

### Round 0 — Topology
**Q:** 确认 4 个顶层组件（知识点碎片化、导图结点、复盘题型、状态升级）是否正确？
**A:** 需要调整 → 确认状态系统可修改升级，其余正确

### Round 1 — 思维导图式知识结点 / Goal Clarity
**Q:** "像思维导图一样"最接近哪种交互形态？
**A:** 画布式节点连线（类 XMind/ProcessOn）

### Round 2 — 思维导图式知识结点 / Constraints
**Q:** 设备范围和第三方库态度？
**A:** 桌面+移动端，可引入第三方库

### Round 3 — 复盘与题型记录 / Success Criteria
**Q:** 打开一个知识点节点后希望看到和记录哪些信息？
**A:** 全部需要——题型分类、错因标签、自由笔记、截图、时间线复习记录

### Round 4 — Contrarian / 知识点碎片化展示 / Goal Clarity
**Q:** 所有知识点放在一张画布还是分科独立导图？
**A:** 408 四科合一 + 数学一 + 英语一，共三张独立导图

### Round 5 — 现有状态系统升级 / Goal Clarity
**Q:** 现有六状态循环切换在新导图中如何处理？
**A:** 状态融入复习时间线，健康度由复习记录自动推导

### Round 6 — Simplifier / Success Criteria（全局）
**Q:** 一期 MVP 只做最核心的三件事是什么？
**A:** 导图浏览 + 节点详情 + 复习记录

### Round 7 — 全局 Constraints
**Q:** 新导图与现有页面的关系？截图如何存储？
**A:** 替换为主视图 + 保留经典模式入口；数据存储服务端

### Round 8 — Ontologist / 全局 Success Criteria
**Q:** 验收条件归纳确认？
**A:** 全部确认 5 条验收条件

</details>
