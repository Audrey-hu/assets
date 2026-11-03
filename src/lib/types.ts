import type { CurrencyCode } from "./format";

export type ID = string;

export type AccentKey = "sage" | "clay" | "steel" | "sand" | "mauve";

export const ACCENTS: AccentKey[] = ["sage", "clay", "steel", "sand", "mauve"];

/* ------------------------------------------------------------------ *
 * Hobby — an interest kept as a long-running project, never a receipt.
 * ------------------------------------------------------------------ */

export type HobbyStatus =
  | "trying"
  | "building"
  | "active"
  | "deep"
  | "paused"
  | "archived";

export interface Hobby {
  id: ID;
  name: string;
  icon: string;
  accent: AccentKey;
  startDate: string;
  status: HobbyStatus;
  weeklyGoalSessions?: number;
  weeklyGoalMinutes?: number;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------------------------------------------ *
 * Journey — personal growth account with stages and a long timeline.
 * ------------------------------------------------------------------ */

export type JourneyKind =
  | "exam"
  | "study"
  | "language"
  | "professional"
  | "networking"
  | "content"
  | "career"
  | "habit"
  | "other";

export type JourneyStatus = "active" | "paused" | "completed" | "archived";

export interface Journey {
  id: ID;
  name: string;
  kind: JourneyKind;
  accent: AccentKey;
  startDate: string;
  targetDate?: string;
  description?: string;
  status: JourneyStatus;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export type StagePhase =
  | "exploration"
  | "foundation"
  | "systematic"
  | "practice"
  | "mock"
  | "sprint"
  | "complete";

export interface Stage {
  id: ID;
  journeyId: ID;
  phase: StagePhase;
  title?: string;
  startDate?: string;
  endDate?: string;
  goal?: string;
  note?: string;
  status: "planned" | "active" | "completed";
  progress: number;
  targetMinutes?: number;
  order: number;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------------------------------------------ *
 * LifeEvent — one unified record feeds Today, After Work, and every
 * timeline. Never key the same fact in twice.
 * ------------------------------------------------------------------ */

export type EventType =
  | "session"
  | "expense"
  | "income"
  | "milestone"
  | "result"
  | "reflection"
  | "feedback"
  | "decision"
  | "document"
  | "note"
  | "meeting";

export type Mood = "great" | "good" | "neutral" | "tired" | "frustrated";

export type TimeCategory =
  | "growth"
  | "hobby"
  | "health"
  | "sideproject"
  | "social"
  | "entertainment"
  | "rest"
  | "other";

export type ExpenseCategory =
  | "course"
  | "gear"
  | "consumable"
  | "venue"
  | "membership"
  | "transport"
  | "other";

export interface LifeEvent {
  id: ID;
  type: EventType;
  date: string;
  startTime?: string;
  endTime?: string;
  durationMin?: number;
  amount?: number;
  /** 这笔钱的币种；不填表示跟随应用的记账币种 */
  currency?: CurrencyCode;
  moneyType?: "expense" | "income";
  expenseCategory?: ExpenseCategory;
  title: string;
  note?: string;
  mood?: Mood;
  photoIds: ID[];
  hobbyId?: ID;
  journeyId?: ID;
  stageId?: ID;
  courseId?: ID;
  assetId?: ID;
  incomeId?: ID;
  timeCategory?: TimeCategory;
  person?: string;
  meta?: Record<string, string | number | boolean | null>;
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------------------------------------------ *
 * Course — prepaid lesson packages with utilisation.
 * ------------------------------------------------------------------ */

export interface Course {
  id: ID;
  hobbyId?: ID;
  journeyId?: ID;
  name: string;
  totalPrice: number;
  currency?: CurrencyCode;
  totalLessons: number;
  completedLessons: number;
  /**
   * prepaid   = 一次性付清：建课程时自动记一笔支出，之后上课只记时间
   * perlesson = 每上完一节记一次钱
   */
  billing?: "prepaid" | "perlesson";
  /** 每课时时长（分钟），用来把已完成的课时折算成投入时间 */
  lessonMinutes?: number;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------------------------------------------ *
 * Side income — money made after work, measured per hour.
 * ------------------------------------------------------------------ */

export type IncomeType = "oneoff" | "recurring" | "compounding";

export interface IncomeProject {
  id: ID;
  name: string;
  type: IncomeType;
  revenue: number;
  cost: number;
  currency?: CurrencyCode;
  minutes: number;
  date: string;
  assetId?: ID;
  hobbyId?: ID;
  journeyId?: ID;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------------------------------------------ *
 * Asset — what the time and money actually left behind.
 * ------------------------------------------------------------------ */

export type AssetType =
  | "skill"
  | "certificate"
  | "portfolio"
  | "article"
  | "website"
  | "video"
  | "relationship"
  | "client"
  | "tool"
  | "template"
  | "notes"
  | "other";

export interface Asset {
  id: ID;
  name: string;
  type: AssetType;
  createdDate: string;
  minutes: number;
  cost: number;
  incomeGenerated: number;
  currency?: CurrencyCode;
  sourceHobbyId?: ID;
  sourceJourneyId?: ID;
  sourceIncomeId?: ID;
  photoIds: ID[];
  link?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------------------------------------------ *
 * Savings — deliberately narrow: deposits, emergency fund, reservoir.
 * ------------------------------------------------------------------ */

export type SavingsKind = "reservoir" | "emergency" | "deposit";
/** 小荷包也是储蓄的一种：钱还是你的钱，只是先 earmark 给某件事 */
export type SavingsKindWithEnvelope = SavingsKind | "envelope";

export interface SavingsItem {
  id: ID;
  kind: SavingsKindWithEnvelope;
  name: string;
  currency?: CurrencyCode;
  /** reservoir / emergency */
  current?: number;
  target?: number;
  monthlyEssential?: number;
  /** envelope：小荷包 */
  emoji?: string;
  monthlyPlan?: number;
  dueDate?: string;
  /** deposit */
  bank?: string;
  principal?: number;
  rate?: number;
  termMonths?: number;
  depositDate?: string;
  maturityDate?: string;
  autoRenew?: boolean;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------------------------------------------ *
 * Investment — 黄金、基金、股票、数字货币……类别由用户自己定义。
 * ------------------------------------------------------------------ */

export interface Investment {
  id: ID;
  name: string;
  /** 自由文本，用户想怎么分就怎么分 */
  category: string;
  currency?: CurrencyCode;
  /** 累计投入本金 */
  cost: number;
  /** 当前市值；没有更新过就留空，按本金计入总额 */
  value?: number;
  startDate: string;
  /** 市值最后一次更新的时间 */
  valueUpdatedAt?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SavingsTx {
  id: ID;
  itemId: ID;
  amount: number;
  currency?: CurrencyCode;
  reason: string;
  date: string;
  createdAt: string;
}

export interface SavingsSnapshot {
  id: ID;
  month: string;
  total: number;
  /** 多币种：按币种分开存 */
  totals?: Record<string, number>;
}

/* ------------------------------------------------------------------ *
 * Spend — 只记「我在乎的那几类开销」，不是流水账。
 *
 * 和 Journey 里的投入是两件事：
 *   - Journey / Hobby 的支出是「为了这件事我投了多少钱」，算投入产出；
 *   - 这里的开销是「我想知道自己在哪些地方花了多少」，纯生活视角。
 * 所以两边分开记、分开统计，不互相计入，也不做汇率折算。
 * ------------------------------------------------------------------ */

export interface SpendCategory {
  id: ID;
  name: string;
  emoji?: string;
  accent: AccentKey;
  /** 每月预算；只跟 budgetCurrency 这一种币种比 */
  monthlyBudget?: number;
  budgetCurrency?: CurrencyCode;
  /** 常用细分，比如 衣服 → 自己买的 / 妈妈买的 */
  tags?: string[];
  note?: string;
  createdAt: string;
  updatedAt: string;
}

/** 一笔开销可以关联的对象类型 */
export type SpendLinkKind = "savings" | "journey" | "hobby" | "asset" | "income";

export interface SpendLink {
  kind: SpendLinkKind;
  id: ID;
}

export interface SpendEntry {
  id: ID;
  categoryId: ID;
  /** 细分标签，例如「妈妈买的」；不填就是「未细分」 */
  tag?: string;
  amount: number;
  currency?: CurrencyCode;
  /** 关联对象：储蓄 / Journey / 兴趣 / 资产 / 收入项目 */
  link?: SpendLink;
  /**
   * 旧字段，仅用于兼容：等价于 link = { kind: "savings", id }。
   * 新记录一律写 link。
   */
  savingsItemId?: ID;
  /**
   * 是否真的从上面那个储蓄里扣钱。
   *   true  = 扣减余额，并留一条可取回的流水
   *   false = 只标记"这笔属于哪个储蓄/计划"，余额不变
   * 只有 link.kind === "savings" 时才有意义。
   * 旧数据没有这个字段时按 true 处理（当时关联即扣款）。
   */
  deductFromSavings?: boolean;
  /** YYYY-MM-DD */
  date: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------------------------------------------ *
 * Photos live in IndexedDB as blobs and stay attached to records.
 * ------------------------------------------------------------------ */

export interface Photo {
  id: ID;
  blob: Blob;
  name: string;
  mime: string;
  size: number;
  createdAt: string;
}

export interface Settings {
  displayName: string;
  currency: CurrencyCode;
  dateFormat: "YYYY.MM.DD" | "YYYY-MM-DD" | "MM/DD/YYYY";
  theme: "light" | "dark";
  weekStartsOn: 0 | 1;
  demoSeeded: boolean;
  /** 新设备第一次打开时，是否自动生成一组示例数据 */
  seedDemo: boolean;
  lastBackupAt?: string;
}

export interface BackupFile {
  app: "LifeLedger" | "人生账本";
  version: 1;
  exportedAt: string;
  settings: Settings;
  data: {
    hobbies: Hobby[];
    journeys: Journey[];
    stages: Stage[];
    events: LifeEvent[];
    courses: Course[];
    incomes: IncomeProject[];
    assets: Asset[];
    savings: SavingsItem[];
    investments: Investment[];
    savingsTx: SavingsTx[];
    snapshots: SavingsSnapshot[];
    spendCategories?: SpendCategory[];
    spendEntries?: SpendEntry[];
    photos: { id: ID; name: string; mime: string; createdAt: string; dataUrl: string }[];
  };
}
