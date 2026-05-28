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

export const knowledgeReviewCauses = ["概念不清", "公式不会", "题意误判", "粗心", "时间不够", "知识迁移失败", "题目做少了", "做题太慢", "计算错误", "审题不清", "心态不稳"];

export const examFrequencyOptions = ["高频", "中频", "低频", "未考"];

export const distractionTypes = {
  idea: "新想法",
  phone: "手机/消息",
  worry: "焦虑担心",
  task: "杂事",
  other: "其他",
};


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
  "今天慢一点也没关系",
  "先把眼前这一题做好",
  "一步一步慢慢游向岸",
  "把今天过成一次小胜",
  "焦虑时先做完一页书",
  "别急答案会慢慢变亮",
  "认真一点就很了不起",
  "低头做题心就会安定",
  "主线不断你已经在赢",
  "撑过这一段就有回响",
  "每一次复盘都在涨分",
  "把难题拆小一点就不怕",
  "不用完美今天也前进",
  "心再稳一点路就清楚",
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
  ds: ["绪论与复杂度", "线性表", "栈", "队列", "串与数组", "树的基本概念", "二叉树与遍历", "树与森林", "图的基本概念", "图的遍历与应用", "查找", "内部排序"],
  co: ["计算机系统概述", "数制与编码", "定点运算", "浮点运算", "运算器设计", "存储系统概述", "Cache", "虚拟存储器", "指令格式与寻址", "CPU 数据通路", "控制器与时序", "总线与 I/O"],
  os: ["OS 概述", "进程概念与状态", "进程同步", "信号量与管程", "死锁", "处理机调度", "内存管理", "虚拟内存", "页面置换", "文件系统", "磁盘调度", "I/O 子系统"],
  net: ["网络体系结构", "物理层基础", "数据链路层", "介质访问控制", "网络层与 IP", "路由协议", "IPv6", "传输层", "TCP 可靠传输", "应用层协议", "网络安全基础", "无线网络"],
  math1: ["函数极限连续", "一元微分学", "一元积分学", "多元微分学", "多重积分", "曲线曲面积分", "无穷级数", "常微分方程", "行列式矩阵", "向量与线性方程组", "特征值与二次型", "概率论与数理统计"],
  english1: ["阅读 Part A", "新题型 Part B", "翻译 Part C", "完形填空", "小作文", "大作文", "词汇基础", "长难句训练", "真题精读", "模拟冲刺"],
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
