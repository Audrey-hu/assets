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
  totalLessons: number;
  completedLessons: number;
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

export interface SavingsItem {
  id: ID;
  kind: SavingsKind;
  name: string;
  /** reservoir / emergency */
  current?: number;
  target?: number;
  monthlyEssential?: number;
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

export interface SavingsTx {
  id: ID;
  itemId: ID;
  amount: number;
  reason: string;
  date: string;
  createdAt: string;
}

export interface SavingsSnapshot {
  id: ID;
  month: string;
  total: number;
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
  currency: "CNY" | "USD" | "EUR" | "GBP" | "JPY";
  dateFormat: "YYYY.MM.DD" | "YYYY-MM-DD" | "MM/DD/YYYY";
  theme: "light" | "dark";
  weekStartsOn: 0 | 1;
  demoSeeded: boolean;
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
    savingsTx: SavingsTx[];
    snapshots: SavingsSnapshot[];
    photos: { id: ID; name: string; mime: string; createdAt: string; dataUrl: string }[];
  };
}
