<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import cytoscape from "cytoscape";
import ExportActions from "../components/ExportActions.vue";
import { exportImagePdf } from "../utils/exporters.js";
import {
  knowledgeReviewCauses,
  mindMapGroups,
  questionTypes,
  reviewResults,
  statusList,
  subjectMindMapBranches,
  subjects,
} from "../constants/defaults.js";

const props = defineProps({ fish: { type: Object, required: true } });

const activeGroupIdx = ref(0);
const viewMode = ref("map"); // 'map' | 'classic'
const selectedNode = ref(null);
const detailTab = ref("timeline"); // 'timeline' | 'add'
const cyInstance = ref(null);
const cyContainer = ref(null);
const showDetail = ref(false);
const isMobile = ref(typeof window !== "undefined" ? window.innerWidth < 768 : false);
let resizeTimer = null;

const newReview = ref({
  note: "",
  errorCauses: [],
  questionTypes: [],
  result: "improving",
});
const newOutput = ref({
  type: "concept",
  topicId: "",
  note: "",
});
const collapsedBranchIds = ref([]);
const collapsedTopicIds = ref([]);
const addingMode = ref(""); // "" | "rootBranch" | "childTopic" | "childOfTopic" | "siblingBranch" | "siblingTopic"
const newItemName = ref("");
const outputCardPage = ref(0);

const statusById = Object.fromEntries(statusList.map((s) => [s.id, s]));
const subjectById = Object.fromEntries(subjects.map((s) => [s.id, s]));
const healthClassNames = statusList.map((s) => `health-${s.id}`).join(" ");

const outputSteps = [
  { id: "concept", title: "概念卡", text: "定义、条件、边界各写一句。" },
  { id: "trigger", title: "触发器", text: "看到什么题干信号就想到它。" },
  { id: "example", title: "例题讲解", text: "选一道题，写出每一步为什么。" },
  { id: "mistake", title: "错因句", text: "把易错点压成一句提醒。" },
];

const currentOutputStep = computed(() => outputSteps[outputCardPage.value] || outputSteps[0]);

const topicPlans = {
  empty: {
    title: "先开框架",
    steps: ["写 5 个关键词", "做 2 道入门题", "用自己的话讲一遍"],
  },
  fragile: {
    title: "补稳概念",
    steps: ["重画小框架", "列出易混边界", "做 3 道同型题"],
  },
  basic: {
    title: "推到输出",
    steps: ["写一张概念卡", "讲解 1 道代表题", "补一个反例或变式"],
  },
  wrong: {
    title: "错因收口",
    steps: ["复盘最近错题", "标出触发条件", "二刷 3 道同类题"],
  },
  mastered: {
    title: "保持手感",
    steps: ["隔 7 天回看一次", "混入综合题", "更新输出卡片"],
  },
  review: {
    title: "间隔复盘",
    steps: ["快速默写框架", "做 1 道综合题", "补充新的题型信号"],
  },
};

const activeGroup = computed(() => mindMapGroups[activeGroupIdx.value] || mindMapGroups[0]);
const activeSubjectId = computed(() => activeGroup.value?.subjects?.[0] || subjects[0].id);
const activeSubject = computed(() => subjectById[activeSubjectId.value] || subjects[0]);

function outputRecordsFor(subjectId, branchId) {
  return props.fish.state.subjectOutputs?.[subjectId]?.[branchId] || [];
}

function displayLabel(value) {
  return typeof value === "string" ? props.fish.t(value) : props.fish.tx(value);
}

function branchKey(branchId, subjectId = activeSubjectId.value) {
  return `${subjectId}:${branchId}`;
}

function topicKey(topicId, subjectId = activeSubjectId.value) {
  return `${subjectId}:${topicId}`;
}

function isBranchCollapsed(branchId, subjectId = activeSubjectId.value) {
  return collapsedBranchIds.value.includes(branchKey(branchId, subjectId));
}

function isTopicCollapsed(topicId, subjectId = activeSubjectId.value) {
  return collapsedTopicIds.value.includes(topicKey(topicId, subjectId));
}

function setBranchCollapsed(branchId, collapsed, subjectId = activeSubjectId.value) {
  const key = branchKey(branchId, subjectId);
  const next = collapsedBranchIds.value.filter((item) => item !== key);
  if (collapsed) next.push(key);
  collapsedBranchIds.value = next;
}

function setTopicCollapsed(topicId, collapsed, subjectId = activeSubjectId.value) {
  const key = topicKey(topicId, subjectId);
  const next = collapsedTopicIds.value.filter((item) => item !== key);
  if (collapsed) next.push(key);
  collapsedTopicIds.value = next;
}

function deriveHealth(topic) {
  return props.fish.deriveHealth(topic);
}

function decorateTopic(topic, subjectId = activeSubjectId.value) {
  const health = deriveHealth(topic);
  return {
    ...topic,
    subjectId,
    health,
    statusLabel: statusById[health]?.label || health,
  };
}

const subjectTopics = computed(() =>
  (props.fish.state.topicState[activeSubjectId.value] || []).map((topic) => decorateTopic(topic)),
);

const groupTopics = subjectTopics;

function buildBranchDisplay(branch, topicList, idx) {
  const done = topicList.filter((t) => t.health === "mastered" || t.health === "review").length;
  const weak = topicList.filter((t) => t.health === "wrong" || t.health === "fragile").length;
  return {
    ...branch,
    index: idx,
    nodeId: `branch-${activeSubjectId.value}-${branch.id}`,
    topics: topicList,
    collapsed: isBranchCollapsed(branch.id),
    outputCount: outputRecordsFor(activeSubjectId.value, branch.id).length,
    done,
    weak,
    total: topicList.length,
    pct: topicList.length ? Math.round((done / topicList.length) * 100) : 0,
  };
}

const subjectBranches = computed(() => {
  const topics = subjectTopics.value;
  const topicByName = new Map(topics.map((topic) => [topic.name, topic]));
  const topicById = new Map(topics.map((topic) => [topic.id, topic]));
  const usedTopicIds = new Set();
  const customBranches = props.fish.state.customBranches?.[activeSubjectId.value] || [];
  const staticBranchIds = new Set();

  const blueprint = subjectMindMapBranches[activeSubjectId.value] || [
    { id: "main", label: "知识主线", topics: topics.map((topic) => topic.name) },
  ];

  // Static blueprint branches
  const branches = blueprint
    .map((branch, index) => {
      staticBranchIds.add(branch.id);
      const branchTopics = (branch.topics || [])
        .map((name) => topicByName.get(name))
        .filter(Boolean)
        .map((topic) => {
          usedTopicIds.add(topic.id);
          return topic;
        });
      // Also include custom topics tagged with this static branch's id
      const extraCustom = topics.filter(
        (t) => t.branchId === branch.id && !usedTopicIds.has(t.id),
      );
      extraCustom.forEach((t) => usedTopicIds.add(t.id));
      return buildBranchDisplay(branch, [...branchTopics, ...extraCustom], index);
    })
    .filter((branch) => branch.total);

  // Custom branches
  customBranches.forEach((cb, ci) => {
    const topicIds = new Set(cb.topics || []);
    topics.forEach((topic) => {
      if (topic.branchId === cb.id) topicIds.add(topic.id);
    });
    const branchTopics = [...topicIds]
      .map((tid) => topicById.get(tid))
      .filter(Boolean)
      .map((topic) => {
        usedTopicIds.add(topic.id);
        return topic;
      });
    branches.push(buildBranchDisplay(cb, branchTopics, branches.length));
  });

  // Leftovers (custom topics not assigned to any branch)
  const leftovers = topics.filter((topic) => !usedTopicIds.has(topic.id));
  if (leftovers.length) {
    branches.push(buildBranchDisplay(
      { id: "open", label: "待细拆" },
      leftovers,
      branches.length,
    ));
  }

  return branches;
});

const selectedTopic = computed(() => {
  if (!selectedNode.value) return null;
  const found = (props.fish.state.topicState[activeSubjectId.value] || []).find((t) => t.id === selectedNode.value);
  return found ? decorateTopic(found, activeSubjectId.value) : null;
});

const selectedBranch = computed(() => {
  if (!selectedNode.value) return null;
  return subjectBranches.value.find((branch) => branch.nodeId === selectedNode.value) || null;
});

const sortedReviewLog = computed(() => {
  if (!selectedTopic.value?.reviewLog) return [];
  return [...selectedTopic.value.reviewLog].sort(
    (a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date),
  );
});

const selectedBranchOutputs = computed(() => {
  if (!selectedBranch.value) return [];
  return [...outputRecordsFor(activeSubjectId.value, selectedBranch.value.id)].sort(
    (a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date),
  );
});

const questionTypeOptions = computed(() => {
  return questionTypes[selectedTopic.value?.subjectId || activeSubjectId.value] || [];
});

const activeSubjectStats = computed(() => {
  const topics = subjectTopics.value;
  const done = topics.filter((topic) => topic.health === "mastered" || topic.health === "review").length;
  const weak = topics.filter((topic) => topic.health === "wrong" || topic.health === "fragile").length;
  const reviewed = Object.values(props.fish.state.subjectOutputs?.[activeSubjectId.value] || {}).reduce(
    (sum, records) => sum + (Array.isArray(records) ? records.length : 0),
    0,
  );
  return {
    done,
    reviewed,
    total: topics.length,
    weak,
    pct: topics.length ? Math.round((done / topics.length) * 100) : 0,
  };
});

const priorityTopics = computed(() => {
  const rank = { wrong: 0, fragile: 1, empty: 2, basic: 3, review: 4, mastered: 5 };
  return [...subjectTopics.value]
    .sort((a, b) => (rank[a.health] ?? 9) - (rank[b.health] ?? 9))
    .slice(0, 3);
});

const selectedTopicPlan = computed(() => topicPlans[selectedTopic.value?.health || "empty"] || topicPlans.empty);

// ---- Classic mode ----
const classicSubject = ref(subjects[0].id);

const allSubjectStats = computed(() =>
  subjects.map((s) => {
    const topics = props.fish.state.topicState[s.id] || [];
    const done = topics.filter((t) => {
      const h = deriveHealth(t);
      return h === "mastered" || h === "review";
    }).length;
    return {
      id: s.id, name: s.name, accent: s.accent,
      done, total: topics.length,
      pct: topics.length ? Math.round((done / topics.length) * 100) : 0,
    };
  }),
);

const mapTabs = computed(() =>
  mindMapGroups.map((group, idx) => {
    const subjId = group.subjects[0];
    const subj = subjectById[subjId] || subjects[0];
    const topics = props.fish.state.topicState[subjId] || [];
    const done = topics.filter((topic) => {
      const health = deriveHealth(topic);
      return health === "mastered" || health === "review";
    }).length;
    return {
      ...group,
      idx,
      accent: subj.accent,
      done,
      total: topics.length,
      pct: topics.length ? Math.round((done / topics.length) * 100) : 0,
    };
  }),
);

const classicTopics = computed(() => {
  return (props.fish.state.topicState[classicSubject.value] || []).map((t) => ({
    ...t,
    health: deriveHealth(t),
  }));
});

const classicProgress = computed(() => {
  const topics = classicTopics.value;
  if (!topics.length) return 0;
  const done = topics.filter((t) => t.health === "mastered" || t.health === "review").length;
  return Math.round((done / topics.length) * 100);
});

const exportRows = computed(() =>
  subjects.flatMap((subj) =>
    (props.fish.state.topicState[subj.id] || []).map((topic) => ({
      模块: subjectMindMapBranches[subj.id]?.find((branch) => branch.topics.includes(topic.name))?.label || "",
      科目: props.fish.t(subj.name),
      知识点: props.fish.t(topic.name),
      状态: props.fish.t(statusById[deriveHealth(topic)]?.label || deriveHealth(topic)),
      复盘次数: topic.reviewLog?.length || 0,
    })),
  ),
);

// ---- Cytoscape ----
function topicRowsForBranch(branch) {
  const topicIds = new Set(branch.topics.map((topic) => topic.id));
  const childrenByParent = new Map();
  branch.topics.forEach((topic) => {
    const parentId = topic.parentId && topicIds.has(topic.parentId) ? topic.parentId : "";
    if (!childrenByParent.has(parentId)) childrenByParent.set(parentId, []);
    childrenByParent.get(parentId).push(topic);
  });

  const rows = [];
  function visit(topic, depth) {
    const children = childrenByParent.get(topic.id) || [];
    const hasChildren = children.length > 0;
    const collapsed = hasChildren && isTopicCollapsed(topic.id);
    rows.push({ topic, depth, hasChildren, collapsed });
    if (!collapsed) {
      children.forEach((child) => visit(child, depth + 1));
    }
  }

  (childrenByParent.get("") || []).forEach((topic) => visit(topic, 0));
  return rows;
}

function branchIdForTopic(topic) {
  if (!topic) return undefined;
  if (topic.branchId) return topic.branchId;
  const staticBranch = (subjectMindMapBranches[activeSubjectId.value] || []).find(
    (branch) => (branch.topics || []).includes(topic.name),
  );
  return staticBranch?.id;
}

function buildMapElements() {
  const width = Math.max(cyContainer.value?.clientWidth || 880, isMobile.value ? 760 : 900);
  const rowGap = isMobile.value ? 78 : 90;
  const topicGap = isMobile.value ? 46 : 52;
  const depthGap = isMobile.value ? 136 : 160;
  const branches = subjectBranches.value;
  const branchBlocks = branches.map((branch) => {
    const visibleRows = branch.collapsed ? [] : topicRowsForBranch(branch);
    const height = Math.max(rowGap, (Math.max(visibleRows.length, 1) - 1) * topicGap + rowGap);
    return { branch, visibleRows, height };
  });
  const contentHeight = Math.max(
    cyContainer.value?.clientHeight || 620,
    branchBlocks.reduce((sum, block) => sum + block.height, 0) + 80,
  );
  const rootPosition = { x: 110, y: contentHeight / 2 };
  const branchX = Math.min(Math.max(width * 0.32, 280), 330);
  const topicX = Math.min(Math.max(width * 0.62, 520), 600);
  const rootCollapsed = branches.length > 0 && branches.every((branch) => branch.collapsed);
  const rootLabel = branches.length
    ? `${rootCollapsed ? "+ " : "- "}${props.fish.t(activeSubject.value.name)}`
    : props.fish.t(activeSubject.value.name);
  const elements = [
    {
      data: {
        id: `root-${activeSubjectId.value}`,
        label: rootLabel,
        kind: "root",
        accent: activeSubject.value.accent,
      },
      position: rootPosition,
      classes: "kind-root",
    },
  ];

  let cursorY = 40;
  branchBlocks.forEach(({ branch, visibleRows, height }) => {
    const branchY = cursorY + height / 2;
    const branchLabel = `${branch.collapsed ? "+ " : "- "}${displayLabel(branch.label)}`;
    const outputLabel = branch.outputCount ? `\n${props.fish.t("输出")} ${branch.outputCount}` : "";

    elements.push({
      data: {
        id: branch.nodeId,
        label: `${branchLabel}${outputLabel}`,
        kind: "branch",
        branchId: branch.id,
        collapsed: branch.collapsed,
        accent: activeSubject.value.accent,
        progressLabel: `${branch.done}/${branch.total}`,
      },
      position: { x: branchX, y: branchY },
      classes: `kind-branch${branch.collapsed ? " is-collapsed" : ""}`,
    });
    elements.push({
      data: {
        id: `edge-root-${branch.id}`,
        source: `root-${activeSubjectId.value}`,
        target: branch.nodeId,
        kind: "root-edge",
      },
      classes: "edge-root",
    });

    visibleRows.forEach(({ topic, depth, hasChildren, collapsed }, topicIndex) => {
      const topicY = branchY - ((visibleRows.length - 1) * topicGap) / 2 + topicIndex * topicGap;
      const source = topic.parentId && branch.topics.some((candidate) => candidate.id === topic.parentId)
        ? topic.parentId
        : branch.nodeId;
      const topicPrefix = hasChildren ? `${collapsed ? "+ " : "- "}` : "";
      elements.push({
        data: {
          id: topic.id,
          label: `${topicPrefix}${props.fish.t(topic.name)}`,
          kind: "topic",
          health: topic.health,
          hasChildren,
          collapsed,
          subjectId: topic.subjectId,
          reviewCount: (topic.reviewLog || []).length,
          statusLabel: props.fish.t(topic.statusLabel),
        },
        position: { x: topicX + depth * depthGap, y: topicY },
        classes: `kind-topic health-${topic.health}${hasChildren ? " has-children" : ""}${collapsed ? " is-collapsed" : ""}`,
      });
      elements.push({
        data: {
          id: `edge-${branch.id}-${topic.id}`,
          source,
          target: topic.id,
          kind: "topic-edge",
        },
        classes: "edge-topic",
      });
    });

    cursorY += height;
  });

  return elements;
}

function buildCytoscape() {
  if (!cyContainer.value) return;
  if (cyInstance.value) {
    cyInstance.value.destroy();
    cyInstance.value = null;
  }

  const cy = cytoscape({
    container: cyContainer.value,
    elements: buildMapElements(),
    style: [
      {
        selector: "edge",
        style: {
          width: 2,
          "line-color": "#2f3136",
          "target-arrow-shape": "none",
          "curve-style": "taxi",
          "taxi-direction": "rightward",
          "taxi-turn": "54%",
          opacity: 0.88,
        },
      },
      { selector: "edge.edge-root", style: { width: 4, "line-color": "#2f3136" } },
      {
        selector: "node",
        style: {
          label: "data(label)",
          "text-valign": "center",
          "text-halign": "center",
          "font-size": isMobile.value ? "10px" : "12px",
          "font-weight": 800,
          "font-family": "system-ui, -apple-system, sans-serif",
          color: "#2f3136",
          "text-max-width": isMobile.value ? "96px" : "128px",
          "text-wrap": "wrap",
          shape: "round-rectangle",
          width: isMobile.value ? 92 : 124,
          height: isMobile.value ? 34 : 38,
          "border-width": 1,
          "border-color": "#e7e7e7",
          "background-color": "#f2f3f5",
          "overlay-opacity": 0,
          "shadow-blur": 10,
          "shadow-color": "#d8d8d8",
          "shadow-opacity": 0.28,
          "shadow-offset-x": 3,
          "shadow-offset-y": 3,
          "transition-property": "background-color, border-color, width, height",
          "transition-duration": 200,
        },
      },
      {
        selector: "node.kind-root",
        style: {
          "background-color": "#ef233c",
          color: "#fff",
          width: isMobile.value ? 124 : 156,
          height: isMobile.value ? 44 : 50,
          "font-size": isMobile.value ? "14px" : "17px",
          "text-max-width": isMobile.value ? "112px" : "142px",
          "border-color": "#ef233c",
          "border-width": 2,
          "shadow-blur": 12,
          "shadow-color": "#c7c7c7",
          "shadow-opacity": 0.42,
        },
      },
      {
        selector: "node.kind-branch",
        style: {
          "background-color": "#f1f2f4",
          "border-color": "#f1f2f4",
          color: "#2f3136",
          width: isMobile.value ? 110 : 138,
          height: isMobile.value ? 34 : 38,
          "font-size": isMobile.value ? "10px" : "12px",
          "text-max-width": isMobile.value ? "100px" : "128px",
        },
      },
      { selector: "node.kind-branch.is-collapsed", style: { "background-color": "#fff7ec", "border-color": "#f2c98a" } },
      { selector: "node.kind-topic.has-children", style: { "border-width": 2, "font-weight": 900 } },
      { selector: "node.kind-topic.health-mastered", style: { "background-color": "#ffffff", "border-color": "#65a77b", color: "#2f3136" } },
      { selector: "node.kind-topic.health-basic", style: { "background-color": "#ffffff", "border-color": "#2f80ed", color: "#2f3136" } },
      { selector: "node.kind-topic.health-review", style: { "background-color": "#ffffff", "border-color": "#d8a229", color: "#2f3136" } },
      { selector: "node.kind-topic.health-wrong", style: { "background-color": "#fff7f5", "border-color": "#e95d48", color: "#2f3136" } },
      { selector: "node.kind-topic.health-fragile", style: { "background-color": "#fff7fb", "border-color": "#e85d8f", color: "#2f3136" } },
      { selector: "node.kind-topic.health-empty", style: { "background-color": "#ffffff", "border-color": "#d1d5db", color: "#4b5563" } },
      { selector: "node.kind-topic.has-children.is-collapsed", style: { "background-color": "#fff7ec", "border-color": "#f2c98a" } },
      { selector: "node:selected", style: { "border-color": "#ef233c", "border-width": 3 } },
    ],
    layout: {
      name: "preset",
      fit: true,
      padding: isMobile.value ? 24 : 48,
    },
    minZoom: 0.3,
    maxZoom: 2.5,
    zoomingEnabled: true,
    userZoomingEnabled: true,
    panningEnabled: true,
    userPanningEnabled: true,
    boxSelectionEnabled: false,
    autoungrabify: false,
    autolock: false,
  });

  cy.on("tap", "node", (evt) => {
    const node = evt.target;
    const kind = node.data("kind");
    selectedNode.value = node.id();
    showDetail.value = true;
    if (kind === "topic") {
      detailTab.value = "timeline";
      if (node.data("hasChildren")) {
        toggleTopicCollapse(node.id());
      }
    }
    cy.nodes().unselect();
    node.select();
    if (kind === "branch") {
      toggleBranchCollapse(node.data("branchId"));
    }
    if (kind === "root") {
      toggleSubjectCollapse();
    }
  });

  cy.on("tap", (evt) => {
    if (evt.target === cy) {
      selectedNode.value = null;
      showDetail.value = false;
    }
  });

  cy.on("tapstart", "node", () => {
    if (isMobile.value) {
      cy.nodes().unselect();
    }
  });

  if (selectedNode.value && cy.getElementById(selectedNode.value).length) {
    cy.getElementById(selectedNode.value).select();
  }

  cyInstance.value = cy;
}

function refreshCy() {
  nextTick(() => {
    setTimeout(buildCytoscape, 100);
  });
}

async function exportCurrentMindMapPdf() {
  if (viewMode.value !== "map") {
    viewMode.value = "map";
    await nextTick();
  }

  if (!cyInstance.value) {
    buildCytoscape();
    await nextTick();
  }

  const cy = cyInstance.value;
  if (!cy) return;
  const imageDataUrl = typeof cy.jpg === "function"
    ? cy.jpg({ full: true, bg: "#ffffff", scale: 2, quality: 0.96 })
    : cy.png({ full: true, bg: "#ffffff", scale: 2 });
  await exportImagePdf(
    `${props.fish.t("全科进度")}-${props.fish.t(activeSubject.value.name)}`,
    imageDataUrl,
    { orientation: "landscape", margin: 36 },
  );
}

function switchGroup(idx) {
  activeGroupIdx.value = idx;
  closeDetail();
  refreshCy();
}

function toggleBranchCollapse(branchId) {
  if (!branchId) return;
  setBranchCollapsed(branchId, !isBranchCollapsed(branchId));
  refreshCy();
}

function toggleTopicCollapse(topicId) {
  if (!topicId) return;
  setTopicCollapsed(topicId, !isTopicCollapsed(topicId));
  refreshCy();
}

function toggleSubjectCollapse() {
  const prefix = `${activeSubjectId.value}:`;
  const branchIds = subjectBranches.value.map((branch) => branch.id);
  const allCollapsed = branchIds.length > 0 && branchIds.every((branchId) => isBranchCollapsed(branchId));
  const preserved = collapsedBranchIds.value.filter((key) => !key.startsWith(prefix));
  collapsedBranchIds.value = allCollapsed
    ? preserved
    : [...preserved, ...branchIds.map((branchId) => branchKey(branchId))];
  refreshCy();
}

function selectTopic(topic) {
  selectedNode.value = topic.id;
  showDetail.value = true;
  detailTab.value = "timeline";
  if (!cyInstance.value) return;
  const node = cyInstance.value.getElementById(topic.id);
  if (node.length) {
    cyInstance.value.nodes().unselect();
    node.select();
    cyInstance.value.animate({ center: { eles: node }, zoom: Math.max(cyInstance.value.zoom(), 1) }, { duration: 220 });
  }
}

function toggleViewMode() {
  viewMode.value = viewMode.value === "map" ? "classic" : "map";
  if (viewMode.value === "map") {
    refreshCy();
  } else {
    if (cyInstance.value) {
      cyInstance.value.destroy();
      cyInstance.value = null;
    }
    closeDetail();
  }
}

function closeDetail() {
  showDetail.value = false;
  selectedNode.value = null;
  addingMode.value = "";
  newItemName.value = "";
  resetNewReview();
  resetNewOutput();
}

function resetNewReview() {
  newReview.value = { note: "", errorCauses: [], questionTypes: [], result: "improving" };
  detailTab.value = "timeline";
}

function resetNewOutput(branch = selectedBranch.value) {
  newOutput.value = {
    type: "concept",
    topicId: branch?.topics?.[0]?.id || "",
    note: "",
  };
}

function toggleArrayItem(arr, item) {
  const idx = arr.indexOf(item);
  if (idx >= 0) arr.splice(idx, 1);
  else arr.push(item);
}

function submitReview() {
  if (!selectedTopic.value) return;
  const topic = selectedTopic.value;
  props.fish.addReviewRecord(selectedTopic.value.subjectId, selectedTopic.value.id, {
    note: newReview.value.note,
    errorCauses: [...newReview.value.errorCauses],
    questionTypes: [...newReview.value.questionTypes],
    result: newReview.value.result,
  });
  resetNewReview();
  updateTopicNode(topic);
}

function submitOutput() {
  if (!selectedBranch.value || !newOutput.value.note.trim()) return;
  props.fish.addSubjectOutputRecord(activeSubjectId.value, selectedBranch.value.id, {
    type: newOutput.value.type,
    topicId: newOutput.value.topicId,
    note: newOutput.value.note,
  });
  resetNewOutput(selectedBranch.value);
  refreshCy();
}

function deleteOutput(outputId) {
  if (!selectedBranch.value) return;
  props.fish.deleteSubjectOutputRecord(activeSubjectId.value, selectedBranch.value.id, outputId);
  refreshCy();
}

// ---- Dynamic add handlers ----
function startAdd(mode) {
  addingMode.value = mode;
  newItemName.value = "";
}

function cancelAdd() {
  addingMode.value = "";
  newItemName.value = "";
}

function submitAddRootBranch() {
  const label = newItemName.value.trim();
  if (!label) return;
  props.fish.addBranch(activeSubjectId.value, label);
  cancelAdd();
  refreshCy();
}

function submitAddChildTopic() {
  const name = newItemName.value.trim();
  if (!name || !selectedBranch.value) return;
  props.fish.addTopic(activeSubjectId.value, name, selectedBranch.value.id);
  setBranchCollapsed(selectedBranch.value.id, false);
  cancelAdd();
  refreshCy();
}

function submitAddSiblingBranch() {
  submitAddRootBranch();
}

function submitAddSiblingTopic() {
  const name = newItemName.value.trim();
  if (!name || !selectedTopic.value) return;
  props.fish.addTopic(activeSubjectId.value, name, branchIdForTopic(selectedTopic.value), selectedTopic.value.parentId);
  cancelAdd();
  refreshCy();
}

function submitAddChildOfTopic() {
  const name = newItemName.value.trim();
  if (!name || !selectedTopic.value) return;
  props.fish.addTopic(activeSubjectId.value, name, branchIdForTopic(selectedTopic.value), selectedTopic.value.id);
  setTopicCollapsed(selectedTopic.value.id, false);
  cancelAdd();
  refreshCy();
}

function outputTypeLabel(type) {
  return outputSteps.find((step) => step.id === type)?.title || "模块输出";
}

function outputTopicName(topicId) {
  return subjectTopics.value.find((topic) => topic.id === topicId)?.name || "未关联";
}

function turnOutputCard(direction) {
  const total = outputSteps.length;
  outputCardPage.value = (outputCardPage.value + direction + total) % total;
}

function deleteReview(reviewId) {
  if (!selectedTopic.value) return;
  props.fish.deleteReviewRecord(selectedTopic.value.subjectId, selectedTopic.value.id, reviewId);
  if (cyInstance.value) {
    const topic = selectedTopic.value;
    const updated = props.fish.state.topicState[topic.subjectId]?.find((t) => t.id === topic.id);
    if (updated) {
      const health = deriveHealth(updated);
      const node = cyInstance.value.getElementById(topic.id);
      if (node.length) {
        node.removeClass(healthClassNames);
        node.addClass(`health-${health}`);
        node.data({
          health,
          reviewCount: updated.reviewLog?.length || 0,
          statusLabel: props.fish.t(statusById[health]?.label || health),
        });
      }
    }
  }
}

function updateTopicNode(topic) {
  if (!cyInstance.value || !topic) return;
  const updated = props.fish.state.topicState[topic.subjectId]?.find((item) => item.id === topic.id);
  if (!updated) return;
  const health = deriveHealth(updated);
  const node = cyInstance.value.getElementById(topic.id);
  if (!node.length) return;
  node.removeClass(healthClassNames);
  node.addClass(`health-${health}`);
  node.data({
    health,
    reviewCount: updated.reviewLog?.length || 0,
    statusLabel: props.fish.t(statusById[health]?.label || health),
  });
}

function updateAllTopicNodes() {
  subjectTopics.value.forEach(updateTopicNode);
}

function handleResize() {
  const nextMobile = window.innerWidth < 768;
  isMobile.value = nextMobile;
  window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(() => {
    if (viewMode.value === "map") refreshCy();
  }, 160);
}

onMounted(() => {
  window.addEventListener("resize", handleResize);
  if (viewMode.value === "map") {
    refreshCy();
  }
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", handleResize);
  window.clearTimeout(resizeTimer);
  if (cyInstance.value) cyInstance.value.destroy();
});

watch(
  () => props.fish.state.topicState,
  () => {
    if (viewMode.value === "map" && cyInstance.value) {
      const cyNodeIds = cyInstance.value
        .nodes()
        .filter((node) => node.data("kind") === "topic")
        .map((n) => n.id())
        .sort()
        .join(",");
      const topicIds = groupTopics.value.map((t) => t.id).sort().join(",");
      if (cyNodeIds !== topicIds) refreshCy();
      else updateAllTopicNodes();
    }
  },
  { deep: true },
);

watch(
  () => props.fish.state.subjectOutputs,
  () => {
    if (viewMode.value === "map" && cyInstance.value) refreshCy();
  },
  { deep: true },
);

watch(
  () => props.fish.state.customBranches,
  () => {
    if (viewMode.value === "map" && cyInstance.value) refreshCy();
  },
  { deep: true },
);

watch(
  () => selectedBranch.value?.id,
  () => resetNewOutput(),
);
</script>

<template>
  <section class="page-view">
    <div class="topbar">
      <div>
        <p class="eyebrow">Map</p>
        <h2>{{ fish.t("全科进度") }}</h2>
      </div>
      <div class="topbar-actions">
        <button
          class="mode-toggle-btn"
          @click="toggleViewMode"
          :title="fish.t(viewMode === 'map' ? '切换到经典模式' : '切换到导图模式')"
        >
          <span class="mode-toggle-icon" aria-hidden="true">{{ viewMode === "map" ? "▦" : "⌁" }}</span>
          {{ viewMode === "map" ? fish.t("经典模式") : fish.t("导图模式") }}
        </button>
        <div v-if="viewMode === 'classic'" class="status-legend">
          <span v-for="s in statusList" :key="s.id" :class="`status-dot is-${s.id}`">{{ fish.t(s.label) }}</span>
        </div>
        <ExportActions
          :title="fish.t('全科进度')"
          :payload="fish.state.topicState"
          :rows="exportRows"
          :pdf-exporter="exportCurrentMindMapPdf"
        />
      </div>
    </div>

    <!-- Map group tabs -->
    <nav class="subject-tabs map-subject-tabs">
      <button
        v-for="tab in mapTabs"
        :key="tab.id"
        class="subject-tab"
        :class="{ 'is-active': activeGroupIdx === tab.idx }"
        :style="activeGroupIdx === tab.idx ? { '--subject-accent': tab.accent, borderColor: tab.accent, background: tab.accent + '14' } : {}"
        @click="switchGroup(tab.idx)"
      >
        <span class="subject-tab-name">{{ fish.t(tab.label) }}</span>
        <span class="subject-tab-stat">{{ tab.done }}/{{ tab.total }}</span>
      </button>
    </nav>

    <!-- Map view -->
    <template v-if="viewMode === 'map'">
      <section class="map-brief" :style="{ '--subject-accent': activeSubject.accent }">
        <div class="map-brief-main">
          <strong>{{ fish.t(activeSubject.name) }}</strong>
          <span>{{ fish.t("完成") }} {{ activeSubjectStats.done }}/{{ activeSubjectStats.total }} · {{ activeSubjectStats.pct }}%</span>
        </div>
        <div class="map-brief-chips">
          <span>{{ fish.t("薄弱") }} {{ activeSubjectStats.weak }}</span>
          <span>{{ fish.t("已输出") }} {{ activeSubjectStats.reviewed }}</span>
          <span v-if="priorityTopics[0]">{{ fish.t("下一点") }}：{{ fish.t(priorityTopics[0].name) }}</span>
        </div>
      </section>

      <section class="map-viewport">
        <div class="map-canvas" ref="cyContainer"></div>

        <!-- Mobile backdrop -->
        <div v-if="isMobile && showDetail" class="detail-backdrop" @click="closeDetail"></div>

        <!-- Detail panel -->
        <aside class="detail-panel" :class="{ 'is-open': showDetail, 'is-mobile': isMobile }">
          <template v-if="selectedTopic">
            <div class="detail-header">
              <div>
                <p class="detail-subject">{{ fish.t(subjectById[selectedTopic.subjectId]?.name) }}</p>
                <h3>{{ fish.t(selectedTopic.name) }}</h3>
              </div>
              <button class="detail-close" @click="closeDetail">&times;</button>
            </div>

            <!-- Topic add sibling action -->
            <div class="topic-actions">
              <button
                v-if="addingMode !== 'siblingTopic' && addingMode !== 'childOfTopic'"
                class="action-btn"
                @click="startAdd('childOfTopic')"
              >+ {{ fish.t("添加子知识点") }}</button>
              <button
                v-if="addingMode !== 'siblingTopic' && addingMode !== 'childOfTopic'"
                class="action-btn"
                @click="startAdd('siblingTopic')"
              >+ {{ fish.t("添加同级知识点") }}</button>
            </div>
            <div v-if="addingMode === 'childOfTopic'" class="inline-add-form">
              <input
                v-model="newItemName"
                :placeholder="fish.t('输入知识点名称')"
                class="inline-input"
                @keyup.enter="submitAddChildOfTopic"
              />
              <button class="submit-btn" @click="submitAddChildOfTopic" :disabled="!newItemName.trim()">{{ fish.t("确认添加") }}</button>
              <button class="cancel-btn" @click="cancelAdd">{{ fish.t("取消") }}</button>
            </div>
            <div v-if="addingMode === 'siblingTopic'" class="inline-add-form">
              <input
                v-model="newItemName"
                :placeholder="fish.t('输入知识点名称')"
                class="inline-input"
                @keyup.enter="submitAddSiblingTopic"
              />
              <button class="submit-btn" @click="submitAddSiblingTopic" :disabled="!newItemName.trim()">{{ fish.t("确认添加") }}</button>
              <button class="cancel-btn" @click="cancelAdd">{{ fish.t("取消") }}</button>
            </div>

            <div class="detail-plan">
              <div class="topic-health-pill" :class="`is-${selectedTopic.health}`">
                {{ fish.t(statusById[selectedTopic.health]?.label || selectedTopic.health) }}
              </div>
              <div class="topic-plan-card">
                <p class="detail-kicker">{{ fish.t("下一步规划") }}</p>
                <strong>{{ fish.t(selectedTopicPlan.title) }}</strong>
                <ul>
                  <li v-for="step in selectedTopicPlan.steps" :key="step">{{ fish.t(step) }}</li>
                </ul>
              </div>
            </div>

            <div class="output-card">
              <div class="output-card-top">
                <p class="detail-kicker">{{ fish.t("输出卡片") }}</p>
                <span>{{ outputCardPage + 1 }}/{{ outputSteps.length }}</span>
              </div>
              <div class="flip-card-body">
                <strong>{{ fish.t(currentOutputStep.title) }}</strong>
                <p>{{ fish.t(currentOutputStep.text) }}</p>
              </div>
              <div class="output-card-controls">
                <button type="button" @click="turnOutputCard(-1)" :aria-label="fish.t('上一张')">‹</button>
                <div class="output-card-dots">
                  <button
                    v-for="(_, idx) in outputSteps"
                    :key="idx"
                    type="button"
                    :class="{ active: outputCardPage === idx }"
                    @click="outputCardPage = idx"
                    :aria-label="fish.t('第 {page} 张', { page: idx + 1 })"
                  ></button>
                </div>
                <button type="button" @click="turnOutputCard(1)" :aria-label="fish.t('下一张')">›</button>
              </div>
            </div>

            <div class="detail-tabs">
              <button :class="{ active: detailTab === 'timeline' }" @click="detailTab = 'timeline'">
                {{ fish.t("复习记录") }} ({{ sortedReviewLog.length }})
              </button>
              <button :class="{ active: detailTab === 'add' }" @click="detailTab = 'add'">
                + {{ fish.t("添加记录") }}
              </button>
            </div>

            <!-- Timeline -->
            <div v-if="detailTab === 'timeline'" class="review-timeline">
              <div v-if="!sortedReviewLog.length" class="empty-timeline">
                {{ fish.t("还没有复习记录，点击「添加记录」开始。") }}
              </div>
              <div
                v-for="entry in sortedReviewLog"
                :key="entry.id"
                class="timeline-entry"
              >
                <div class="timeline-meta">
                  <span class="timeline-date">{{ entry.date }}</span>
                  <span class="timeline-result" :class="`result-${entry.result}`">
                    {{ fish.t(reviewResults.find((r) => r.id === entry.result)?.label || entry.result) }}
                  </span>
                  <button class="timeline-delete" @click="deleteReview(entry.id)" title="删除">&times;</button>
                </div>
                <p v-if="fish.tx(entry.note)" class="timeline-note">{{ fish.tx(entry.note) }}</p>
                <div v-if="entry.errorCauses?.length" class="timeline-tags">
                  <span v-for="c in entry.errorCauses" :key="c" class="tag cause-tag">{{ fish.t(c) }}</span>
                </div>
                <div v-if="entry.questionTypes?.length" class="timeline-tags">
                  <span v-for="qt in entry.questionTypes" :key="qt" class="tag type-tag">{{ fish.t(qt) }}</span>
                </div>
              </div>
            </div>

            <!-- Add form -->
            <div v-if="detailTab === 'add'" class="add-review-form">
              <div class="form-group">
                <label>{{ fish.t("本次复习结果") }}</label>
                <div class="result-options">
                  <button
                    v-for="r in reviewResults"
                    :key="r.id"
                    class="result-btn"
                    :class="{ selected: newReview.result === r.id }"
                    @click="newReview.result = r.id"
                  >
                    <span v-html="r.emoji"></span> {{ fish.t(r.label) }}
                  </button>
                </div>
              </div>

              <div class="form-group">
                <label>{{ fish.t("错因标签") }}</label>
                <div class="tag-options">
                  <button
                    v-for="c in knowledgeReviewCauses"
                    :key="c"
                    class="tag-btn"
                    :class="{ selected: newReview.errorCauses.includes(c) }"
                    @click="toggleArrayItem(newReview.errorCauses, c)"
                  >
                    {{ fish.t(c) }}
                  </button>
                </div>
              </div>

              <div class="form-group">
                <label>{{ fish.t("题型") }}</label>
                <div class="tag-options">
                  <button
                    v-for="qt in questionTypeOptions"
                    :key="qt"
                    class="tag-btn type-btn"
                    :class="{ selected: newReview.questionTypes.includes(qt) }"
                    @click="toggleArrayItem(newReview.questionTypes, qt)"
                  >
                    {{ fish.t(qt) }}
                  </button>
                </div>
              </div>

              <div class="form-group">
                <label>{{ fish.t("复习笔记") }}</label>
                <textarea
                  v-model="newReview.note"
                  :placeholder="fish.t('用“我能讲清 / 我还卡在 / 下次先做”记录这次输出。')"
                  rows="4"
                ></textarea>
              </div>

              <button class="submit-btn" @click="submitReview" :disabled="!newReview.note.trim() && !newReview.errorCauses.length">
                {{ fish.t("保存复习记录") }}
              </button>
            </div>
          </template>

          <template v-else-if="selectedBranch">
            <div class="detail-header">
              <div>
                <p class="detail-subject">{{ fish.t(activeSubject.name) }}</p>
                <h3>{{ displayLabel(selectedBranch.label) }}</h3>
              </div>
              <button class="detail-close" @click="closeDetail">&times;</button>
            </div>
            <div class="branch-panel-body">
              <div class="branch-progress-card">
                <strong>{{ selectedBranch.done }}/{{ selectedBranch.total }}</strong>
                <span>{{ fish.t("复盘完成") }} · {{ selectedBranch.pct }}%</span>
                <em v-if="selectedBranch.weak">{{ fish.t("薄弱") }} {{ selectedBranch.weak }}</em>
                <em>{{ selectedBranch.collapsed ? fish.t("已收起") : fish.t("已展开") }} · {{ fish.t("点击模块节点可展开或收起") }}</em>
              </div>

              <!-- Branch add actions -->
              <div class="branch-actions">
                <button
                  v-if="addingMode !== 'childTopic' && addingMode !== 'siblingBranch'"
                  class="action-btn"
                  @click="startAdd('childTopic')"
                >+ {{ fish.t("添加子知识点") }}</button>
                <button
                  v-if="addingMode !== 'childTopic' && addingMode !== 'siblingBranch'"
                  class="action-btn"
                  @click="startAdd('siblingBranch')"
                >+ {{ fish.t("添加同级模块") }}</button>
              </div>
              <div v-if="addingMode === 'childTopic'" class="inline-add-form">
                <input
                  v-model="newItemName"
                  :placeholder="fish.t('输入知识点名称')"
                  class="inline-input"
                  @keyup.enter="submitAddChildTopic"
                />
                <button class="submit-btn" @click="submitAddChildTopic" :disabled="!newItemName.trim()">{{ fish.t("确认添加") }}</button>
                <button class="cancel-btn" @click="cancelAdd">{{ fish.t("取消") }}</button>
              </div>
              <div v-if="addingMode === 'siblingBranch'" class="inline-add-form">
                <input
                  v-model="newItemName"
                  :placeholder="fish.t('输入模块名称')"
                  class="inline-input"
                  @keyup.enter="submitAddSiblingBranch"
                />
                <button class="submit-btn" @click="submitAddSiblingBranch" :disabled="!newItemName.trim()">{{ fish.t("确认添加") }}</button>
                <button class="cancel-btn" @click="cancelAdd">{{ fish.t("取消") }}</button>
              </div>

              <div class="branch-topic-list">
                <button
                  v-for="topic in selectedBranch.topics"
                  :key="topic.id"
                  class="topic-row-button"
                  :class="`is-${topic.health}`"
                  type="button"
                  @click="selectTopic(topic)"
                >
                  <span>{{ fish.t(topic.name) }}</span>
                  <em>{{ fish.t(statusById[topic.health]?.label || topic.health) }}</em>
                </button>
              </div>
              <div class="output-card">
                <div class="output-card-top">
                  <p class="detail-kicker">{{ fish.t("模块输出") }}</p>
                  <span>{{ outputCardPage + 1 }}/{{ outputSteps.length }}</span>
                </div>
                <div class="flip-card-body">
                  <strong>{{ fish.t(currentOutputStep.title) }}</strong>
                  <p>{{ fish.t(currentOutputStep.text) }}</p>
                </div>
                <div class="output-card-controls">
                  <button type="button" @click="turnOutputCard(-1)" :aria-label="fish.t('上一张')">‹</button>
                  <div class="output-card-dots">
                    <button
                      v-for="(_, idx) in outputSteps"
                      :key="idx"
                      type="button"
                      :class="{ active: outputCardPage === idx }"
                      @click="outputCardPage = idx"
                      :aria-label="fish.t('第 {page} 张', { page: idx + 1 })"
                    ></button>
                  </div>
                  <button type="button" @click="turnOutputCard(1)" :aria-label="fish.t('下一张')">›</button>
                </div>
                <div class="output-record-form">
                  <label>
                    {{ fish.t("输出类型") }}
                    <select v-model="newOutput.type">
                      <option v-for="step in outputSteps" :key="step.id" :value="step.id">{{ fish.t(step.title) }}</option>
                    </select>
                  </label>
                  <label>
                    {{ fish.t("关联知识点") }}
                    <select v-model="newOutput.topicId">
                      <option value="">{{ fish.t("不关联具体知识点") }}</option>
                      <option v-for="topic in selectedBranch.topics" :key="topic.id" :value="topic.id">{{ fish.t(topic.name) }}</option>
                    </select>
                  </label>
                  <label class="wide-output-field">
                    {{ fish.t("输出内容") }}
                    <textarea
                      v-model="newOutput.note"
                      rows="3"
                      :placeholder="fish.t('把你能讲出来的内容写下来，哪怕只有三句话。')"
                    ></textarea>
                  </label>
                  <button class="submit-btn" type="button" @click="submitOutput" :disabled="!newOutput.note.trim()">
                    {{ fish.t("保存输出") }}
                  </button>
                </div>
                <div class="output-log-list">
                  <p class="detail-kicker">{{ fish.t("模块输出记录") }} ({{ selectedBranchOutputs.length }})</p>
                  <div v-if="!selectedBranchOutputs.length" class="empty-timeline">
                    {{ fish.t("还没有模块输出记录。") }}
                  </div>
                  <article v-for="record in selectedBranchOutputs" :key="record.id" class="output-log-entry">
                    <div class="timeline-meta">
                      <span class="timeline-date">{{ record.date }}</span>
                      <span class="tag type-tag">{{ fish.t(outputTypeLabel(record.type)) }}</span>
                      <span class="tag cause-tag">{{ fish.t(outputTopicName(record.topicId)) }}</span>
                      <button class="timeline-delete" type="button" :title="fish.t('删除输出')" @click="deleteOutput(record.id)">&times;</button>
                    </div>
                    <p class="timeline-note">{{ fish.tx(record.note) }}</p>
                  </article>
                </div>
              </div>
            </div>
          </template>

          <div v-else class="detail-overview">
            <div class="detail-header">
              <div>
                <p class="detail-subject">{{ fish.t("当前科目") }}</p>
                <h3>{{ fish.t(activeSubject.name) }}</h3>
              </div>
            </div>
            <div class="branch-actions">
              <button
                v-if="addingMode !== 'rootBranch'"
                class="action-btn"
                type="button"
                @click="startAdd('rootBranch')"
              >+ {{ fish.t("添加根模块") }}</button>
            </div>
            <div v-if="addingMode === 'rootBranch'" class="inline-add-form">
              <input
                v-model="newItemName"
                :placeholder="fish.t('输入模块名称')"
                class="inline-input"
                @keyup.enter="submitAddRootBranch"
              />
              <button class="submit-btn" type="button" @click="submitAddRootBranch" :disabled="!newItemName.trim()">{{ fish.t("确认添加") }}</button>
              <button class="cancel-btn" type="button" @click="cancelAdd">{{ fish.t("取消") }}</button>
            </div>
            <div class="overview-stat-grid">
              <div><strong>{{ activeSubjectStats.pct }}%</strong><span>{{ fish.t("完成") }}</span></div>
              <div><strong>{{ activeSubjectStats.weak }}</strong><span>{{ fish.t("薄弱") }}</span></div>
              <div><strong>{{ activeSubjectStats.reviewed }}</strong><span>{{ fish.t("已输出") }}</span></div>
            </div>
            <div class="priority-panel">
              <p class="detail-kicker">{{ fish.t("优先推进") }}</p>
              <button
                v-for="topic in priorityTopics"
                :key="topic.id"
                class="topic-row-button"
                :class="`is-${topic.health}`"
                type="button"
                @click="selectTopic(topic)"
              >
                <span>{{ fish.t(topic.name) }}</span>
                <em>{{ fish.t(statusById[topic.health]?.label || topic.health) }}</em>
              </button>
            </div>
            <div class="output-card">
              <div class="output-card-top">
                <p class="detail-kicker">{{ fish.t("输出闭环") }}</p>
                <span>{{ outputCardPage + 1 }}/{{ outputSteps.length }}</span>
              </div>
              <div class="flip-card-body">
                <strong>{{ fish.t(currentOutputStep.title) }}</strong>
                <p>{{ fish.t(currentOutputStep.text) }}</p>
              </div>
              <div class="output-card-controls">
                <button type="button" @click="turnOutputCard(-1)" :aria-label="fish.t('上一张')">‹</button>
                <div class="output-card-dots">
                  <button
                    v-for="(_, idx) in outputSteps"
                    :key="idx"
                    type="button"
                    :class="{ active: outputCardPage === idx }"
                    @click="outputCardPage = idx"
                    :aria-label="fish.t('第 {page} 张', { page: idx + 1 })"
                  ></button>
                </div>
                <button type="button" @click="turnOutputCard(1)" :aria-label="fish.t('下一张')">›</button>
              </div>
            </div>
          </div>
        </aside>
      </section>
    </template>

    <!-- Classic mode -->
    <section v-if="viewMode === 'classic'" class="panel progress-board">
      <nav class="subject-tabs">
        <button
          v-for="stat in allSubjectStats"
          :key="stat.id"
          class="subject-tab"
          :class="{ 'is-active': classicSubject === stat.id }"
          :style="classicSubject === stat.id ? { '--subject-accent': stat.accent, borderColor: stat.accent, background: stat.accent + '14' } : {}"
          @click="classicSubject = stat.id"
        >
          <span class="subject-tab-name">{{ fish.t(stat.name) }}</span>
          <span class="subject-tab-stat">{{ stat.done }}/{{ stat.total }}</span>
        </button>
      </nav>

      <div class="subject-progress-bar">
        <div class="progress-track">
          <div
            class="progress-fill"
            :style="{ width: classicProgress + '%', background: subjectById[classicSubject]?.accent }"
          ></div>
        </div>
        <span class="progress-label">{{ classicProgress }}%</span>
      </div>

      <div class="topic-chip-grid subject-detail-grid">
        <button
          v-for="topic in classicTopics"
          :key="topic.id"
          class="topic-chip"
          :class="`is-${topic.health}`"
          type="button"
          @click="fish.updateTopicStatus(classicSubject, topic.id, statusList[(statusList.findIndex(s => s.id === topic.health) + 1) % statusList.length].id)"
        >
          <span>{{ fish.t(topic.name) }}</span>
          <em>{{ fish.t(statusById[topic.health]?.label) }}</em>
        </button>
      </div>
    </section>
  </section>
</template>
