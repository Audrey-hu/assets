import type {
  AssetType,
  EventType,
  ExpenseCategory,
  HobbyStatus,
  IncomeType,
  JourneyKind,
  JourneyStatus,
  Mood,
  StagePhase,
  TimeCategory,
} from "./types";

export const HOBBY_STATUS: Record<HobbyStatus, string> = {
  trying: "尝试中",
  building: "培养中",
  active: "稳定爱好",
  deep: "深度投入",
  paused: "暂停",
  archived: "归档",
};

export const JOURNEY_KIND: Record<JourneyKind, string> = {
  exam: "考试",
  study: "学习",
  language: "语言",
  professional: "专业能力",
  networking: "人脉拓展",
  content: "内容创作",
  career: "职业项目",
  habit: "长期习惯",
  other: "其他",
};

export const JOURNEY_STATUS: Record<JourneyStatus, string> = {
  active: "进行中",
  paused: "暂停",
  completed: "已完成",
  archived: "归档",
};

export const STAGE_PHASE: Record<StagePhase, string> = {
  exploration: "探索",
  foundation: "基础",
  systematic: "系统学习",
  practice: "强化",
  mock: "模考",
  sprint: "冲刺",
  complete: "完成",
};

export const STAGE_PHASE_ORDER: StagePhase[] = [
  "exploration",
  "foundation",
  "systematic",
  "practice",
  "mock",
  "sprint",
  "complete",
];

export const STAGE_STATUS = {
  planned: "未开始",
  active: "进行中",
  completed: "已完成",
} as const;

export const MOOD: Record<Mood, { label: string; emoji: string }> = {
  great: { label: "很爽", emoji: "😄" },
  good: { label: "不错", emoji: "🙂" },
  neutral: { label: "普通", emoji: "😐" },
  tired: { label: "有点累", emoji: "😮‍💨" },
  frustrated: { label: "挫败", emoji: "😣" },
};

export const MOOD_ORDER: Mood[] = ["great", "good", "neutral", "tired", "frustrated"];

export const TIME_CATEGORY: Record<TimeCategory, { label: string; hex: string }> = {
  growth: { label: "成长", hex: "#3F5F4E" },
  hobby: { label: "兴趣", hex: "#87A083" },
  health: { label: "运动", hex: "#6B7C90" },
  sideproject: { label: "副业", hex: "#A9765A" },
  social: { label: "社交", hex: "#C7B396" },
  entertainment: { label: "娱乐", hex: "#8A8298" },
  rest: { label: "休息", hex: "#B9B3A6" },
  other: { label: "其他", hex: "#CFC9BC" },
};

export const TIME_CATEGORY_ORDER: TimeCategory[] = [
  "growth",
  "hobby",
  "health",
  "sideproject",
  "social",
  "entertainment",
  "rest",
  "other",
];

export const EXPENSE_CATEGORY: Record<ExpenseCategory, string> = {
  course: "课程",
  gear: "器材",
  consumable: "耗材",
  venue: "场地",
  membership: "会员",
  transport: "交通",
  other: "其他",
};

export const EXPENSE_CATEGORY_ORDER: ExpenseCategory[] = [
  "course",
  "gear",
  "consumable",
  "venue",
  "membership",
  "transport",
  "other",
];

export const EVENT_TYPE: Record<EventType, string> = {
  session: "记录",
  expense: "支出",
  income: "收入",
  milestone: "里程碑",
  result: "成绩",
  reflection: "反思",
  feedback: "反馈",
  decision: "决定",
  document: "文件",
  note: "笔记",
  meeting: "会面",
};

export const ASSET_TYPE: Record<AssetType, string> = {
  skill: "技能",
  certificate: "证书",
  portfolio: "作品",
  article: "文章",
  website: "网站",
  video: "视频",
  relationship: "关系",
  client: "客户",
  tool: "工具",
  template: "模板",
  notes: "知识笔记",
  other: "其他",
};

export const ASSET_TYPE_ORDER: AssetType[] = [
  "skill",
  "certificate",
  "portfolio",
  "article",
  "website",
  "video",
  "relationship",
  "client",
  "tool",
  "template",
  "notes",
  "other",
];

export const INCOME_TYPE: Record<IncomeType, string> = {
  oneoff: "一次性收入",
  recurring: "重复性收入",
  compounding: "可复利收入",
};

export const HOBBY_ICONS = [
  "🥁",
  "🎸",
  "🎹",
  "📷",
  "🏋️",
  "🏃",
  "🧘",
  "🎨",
  "✍️",
  "📚",
  "🍳",
  "🌱",
  "🏔️",
  "🎧",
  "🧩",
  "🛠️",
];
