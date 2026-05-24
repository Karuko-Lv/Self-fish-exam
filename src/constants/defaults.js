export const STORAGE_KEY_BASE = "selfFish408.v1";
export const SERVER_STATE_ENDPOINT = "/api/state";
export const SERVER_SAVE_DELAY = 500;
export const DEFAULT_EXAM_DATE = "2026-12-19";

export const subjects = [
  { id: "ds", name: "数据结构", accent: "#20786f" },
  { id: "co", name: "计算机组成原理", accent: "#e95d48" },
  { id: "os", name: "操作系统", accent: "#6d63b4" },
  { id: "net", name: "计算机网络", accent: "#d8a229" },
  { id: "math1", name: "数学一", accent: "#2f80ed" },
  { id: "english1", name: "英语一", accent: "#b05ca8" },
];

export const nonStudySubject = { id: "nonStudy", name: "非学习", accent: "#8e8e93" };
export const timerSubjects = [...subjects, nonStudySubject];

export const statusList = [
  { id: "empty", label: "未启", score: 0 },
  { id: "fragile", label: "虚", score: 1 },
  { id: "basic", label: "基础", score: 2 },
  { id: "wrong", label: "错多", score: 2 },
  { id: "mastered", label: "掌握", score: 4 },
  { id: "review", label: "复盘", score: 3 },
];

export const knowledgeReviewCauses = ["概念不清", "公式不会", "题意误判", "粗心", "时间不够", "知识迁移失败"];

export const distractionTypes = {
  idea: "新想法",
  phone: "手机/消息",
  worry: "焦虑担心",
  task: "杂事",
  other: "其他",
};

export const breakSuggestions = [
  "站起来喝水，眼睛看远处 30 秒。",
  "做 8 次慢呼吸，肩膀放松下来。",
  "离开屏幕走 2 分钟，不刷短视频。",
  "整理桌面 1 分钟，只收走最碍眼的东西。",
  "闭眼休息 60 秒，然后写下下一步要做什么。",
  "做一次颈部拉伸，回来直接点开始。",
];

export const defaultPromptCards = [
  { id: "pool-1", group: "dashboard", text: "先选一个最小动作，游起来比想清楚更重要。" },
  { id: "pool-2", group: "dashboard", text: "今天不用赢很多，只要把主线接住。" },
  { id: "pool-3", group: "dashboard", text: "记录不是审判，是给明天的自己留浮标。" },
  { id: "countdown-1", group: "countdown", text: "把大日子拆成小勾选，压力会变轻一点。" },
  { id: "countdown-2", group: "countdown", text: "每个节点只放 3 到 5 个 todo，完成感会更清楚。" },
  { id: "map-1", group: "map", text: "先找红色和粉色块，它们就是下一轮最值钱的入口。" },
  { id: "map-2", group: "map", text: "绿色不是终点，复盘过的绿色才更稳。" },
  { id: "practice-1", group: "practice", text: "错题不是坏消息，它在告诉你哪里能最快涨分。" },
  { id: "timer-1", group: "timer", text: "一颗番茄只需要一个目标，别让它背太多东西。" },
  { id: "review-1", group: "review", text: "周复盘只抓一个主问题，下周才真的能变轻。" },
];

export const shortPoolLines = [
  "稳住节奏",
  "先做一件",
  "小步前进",
  "今天也游",
  "慢慢靠岸",
  "把心放稳",
  "别急会到",
  "主线接住",
  "一点点赢",
  "去做就好",
  "保持在线",
  "慢慢变强",
];

export const moods = [
  {
    id: "clear",
    title: "清醒",
    desc: "适合啃主线",
    advice: "先做标准任务，再把一个高频错因推进到复盘。数一和英语也可以各补一小组。",
  },
  {
    id: "anxious",
    title: "焦虑",
    desc: "先落地再加速",
    advice: "只开保底任务，做完再判断今天要不要加码。",
  },
  {
    id: "slump",
    title: "摆烂",
    desc: "门槛降到最低",
    advice: "不要讲道理，直接做 25 分钟错题整理。",
  },
  {
    id: "excited",
    title: "兴奋",
    desc: "把热度接到主线",
    advice: "允许冲刺，但先完成一项 408 核心任务再碰新灵感。",
  },
  {
    id: "tired",
    title: "疲惫",
    desc: "保住连续性",
    advice: "复习轻任务优先：看错题、画框架、背协议字段。",
  },
  {
    id: "lost",
    title: "迷茫",
    desc: "只找下一步",
    advice: "从全科进度里找一个“错多”或“虚”的点，做 20 分钟。",
  },
];

export const seedTopics = {
  ds: ["线性表", "栈和队列", "树与二叉树", "图", "查找", "排序"],
  co: ["数据表示", "运算器", "存储系统", "指令系统", "CPU", "I/O 系统"],
  os: ["进程与线程", "处理机调度", "同步互斥", "内存管理", "文件系统", "I/O 管理"],
  net: ["物理层", "数据链路层", "网络层", "传输层", "应用层", "网络安全基础"],
  math1: ["高等数学", "线性代数", "概率论", "选择填空", "计算题速度", "真题复盘"],
  english1: ["阅读", "完形", "新题型", "翻译", "作文", "长难句"],
};

export const defaultTasks = [
  {
    id: "task-base-1",
    level: "base",
    title: "25 分钟错题重启",
    subject: "ds",
    minutes: 25,
    detail: "只整理一道题：错因 + 正确触发条件。",
    done: false,
  },
  {
    id: "task-base-2",
    level: "base",
    title: "画一个知识点小框架",
    subject: "os",
    minutes: 20,
    detail: "不用完整，画出概念关系就算接上主线。",
    done: false,
  },
  {
    id: "task-standard-1",
    level: "standard",
    title: "408 主线推进一节",
    subject: "co",
    minutes: 90,
    detail: "看讲义 + 做 8 道基础题 + 标出不稳点。",
    done: false,
  },
  {
    id: "task-standard-2",
    level: "standard",
    title: "英一阅读一篇",
    subject: "english1",
    minutes: 45,
    detail: "计时做一篇阅读，复盘每个错选项为什么诱人。",
    done: false,
  },
  {
    id: "task-standard-3",
    level: "standard",
    title: "数一计算手感",
    subject: "math1",
    minutes: 60,
    detail: "做 10 道同类题，只追踪卡顿步骤。",
    done: false,
  },
  {
    id: "task-base-3",
    level: "base",
    title: "英一长难句拆解",
    subject: "english1",
    minutes: 20,
    detail: "至少拆一句：主干、修饰、卡点各写一点。",
    done: false,
  },
  {
    id: "task-standard-4",
    level: "standard",
    title: "408 错题二刷",
    subject: "net",
    minutes: 60,
    detail: "只刷上周错题，按错因重新分类。",
    done: false,
  },
  {
    id: "task-burst-1",
    level: "burst",
    title: "数一半套训练",
    subject: "math1",
    minutes: 150,
    detail: "计时做题，结束后只复盘最值钱的 3 个错误。",
    done: false,
  },
  {
    id: "task-burst-2",
    level: "burst",
    title: "跨科联动复盘",
    subject: "os",
    minutes: 120,
    detail: "把操作系统、组成原理里共享的存储/中断问题串起来。",
    done: false,
  },
];

export const moodTaskTemplates = {
  clear: [
    ["standard", "主线 90 分钟推进", "挑一个“虚”的知识点，看讲义后做 8 道题。"],
    ["burst", "错题高压复盘", "把近 7 天错题按错因重排，找出最该修的一类。"],
  ],
  anxious: [
    ["base", "25 分钟落地", "只做一道错题，从题干里圈出关键条件。"],
    ["standard", "低速主线", "看 20 分钟讲义，再做 5 道基础题。"],
  ],
  slump: [
    ["base", "桌面重启任务", "整理学习区 5 分钟，然后复盘一道已经做过的题。"],
    ["base", "只背一张卡", "选一个概念，用自己的话写 3 句。"],
  ],
  excited: [
    ["standard", "先把热度接到 408", "完成一节主线后，灵感才能进入停车场。"],
    ["burst", "冲刺训练", "计时 120 分钟，结束后只记录三个错因。"],
  ],
  tired: [
    ["base", "轻复盘", "看 3 道错题，不要求重做，只说出为什么错。"],
    ["standard", "框架补洞", "画一张科目小地图，把不稳点标出来。"],
  ],
  lost: [
    ["base", "找下一步", "打开全科进度，选一个“错多”点做 20 分钟。"],
    ["standard", "单点突破", "只抓一个知识点，不跨科，不扩展。"],
  ],
};
