import { addDays, format, getDay, subDays } from "date-fns";
import { putMany, setMeta } from "./db";
import type {
  Asset,
  Course,
  Hobby,
  IncomeProject,
  Investment,
  Journey,
  LifeEvent,
  SavingsItem,
  SavingsSnapshot,
  SavingsTx,
  Settings,
  Stage,
} from "./types";
import { defaultSettings, saveSettings } from "./settings";
import type { Dataset } from "./stats";

/**
 * 生成带时区的 ISO 时刻，并且**不允许落在未来**。
 *
 * 之前这里写的是 "2026-09-14T12:00:00" 这种不带时区的字符串：
 * 存进 Supabase（数据库时区 UTC）就变成 12:00 UTC，也就是上海时间晚上 8 点。
 * 结果是"今天"的示例记录看起来总是在未来，用户删掉之后，
 * 同步会认为云端那份更新，把记录又拉回来 —— 晚上 8 点前怎么删都删不掉。
 */
const ISO = (d: Date, hhmm = "12:00") => {
  const [hour, minute] = hhmm.split(":").map(Number);
  const at = new Date(d);
  at.setHours(hour, minute || 0, 0, 0);
  /* 留一分钟余量，避免和"刚刚"打平 */
  const capped = Math.min(at.getTime(), Date.now() - 60_000);
  return new Date(capped).toISOString();
};
const DAY = (d: Date) => format(d, "yyyy-MM-dd");
const HHMM = (d: Date) => format(d, "HH:mm");

/**
 * Demo photos ship as plain files in /demo and are copied into IndexedDB on
 * first run, so the bundle stays small and the app behaves exactly like it
 * does with photos the user adds later.
 */
export const DEMO_PHOTOS: { id: string; file: string }[] = [
  { id: "demo_photo_drums_1", file: "demo/drums-1.jpg" },
  { id: "demo_photo_drums_2", file: "demo/drums-2.jpg" },
  { id: "demo_photo_street_1", file: "demo/street-1.jpg" },
  { id: "demo_photo_street_2", file: "demo/street-2.jpg" },
  { id: "demo_photo_conference", file: "demo/conference.jpg" },
  { id: "demo_photo_desk", file: "demo/desk-1.jpg" },
];

export async function storeDemoPhotos() {
  const records = [];
  /* 单文件版本会把示例照片作为 data URL 内联进来，这里优先使用 */
  const inlined =
    typeof window !== "undefined"
      ? (window as unknown as { __LL_DEMO_PHOTOS__?: Record<string, string> })
          .__LL_DEMO_PHOTOS__
      : undefined;
  for (const photo of DEMO_PHOTOS) {
    try {
      let blob: Blob | null = null;
      const inline = inlined?.[photo.id];
      if (inline) {
        blob = await (await fetch(inline)).blob();
      } else if (location.protocol !== "file:") {
        const url = new URL(photo.file, document.baseURI).toString();
        const response = await fetch(url);
        if (response.ok) blob = await response.blob();
      }
      if (!blob) continue;
      records.push({
        id: photo.id,
        blob,
        name: photo.file.split("/").pop() ?? "photo.jpg",
        mime: blob.type || "image/jpeg",
        size: blob.size,
        createdAt: new Date().toISOString(),
      });
    } catch {
      /* photos are a nice-to-have — never block seeding on them */
    }
  }
  if (records.length) await putMany("photos", records);
  return records.length;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildDemoData(today = new Date()): Dataset {
  const rand = mulberry32(20260910);
  let counter = 0;
  const nid = (p: string) => `${p}_${(++counter).toString(36)}`;

  const hobbies: Hobby[] = [
    {
      id: "h_drums",
      name: "架子鼓",
      icon: "🥁",
      accent: "sage",
      startDate: DAY(subDays(today, 196)),
      status: "active",
      weeklyGoalSessions: 3,
      weeklyGoalMinutes: 180,
      note: "从零开始，先把节奏感练稳。",
      createdAt: ISO(subDays(today, 196)),
      updatedAt: ISO(subDays(today, 1)),
    },
    {
      id: "h_photo",
      name: "摄影",
      icon: "📷",
      accent: "steel",
      startDate: DAY(subDays(today, 74)),
      status: "building",
      weeklyGoalSessions: 1,
      weeklyGoalMinutes: 120,
      note: "先学会看光，再谈器材。",
      createdAt: ISO(subDays(today, 74)),
      updatedAt: ISO(subDays(today, 12)),
    },
    {
      id: "h_fitness",
      name: "健身",
      icon: "🏋️",
      accent: "clay",
      startDate: DAY(subDays(today, 421)),
      status: "deep",
      weeklyGoalSessions: 3,
      weeklyGoalMinutes: 150,
      createdAt: ISO(subDays(today, 421)),
      updatedAt: ISO(subDays(today, 3)),
    },
  ];

  const journeys: Journey[] = [
    {
      id: "j_sqe",
      name: "SQE1",
      kind: "exam",
      accent: "sage",
      startDate: DAY(subDays(today, 128)),
      targetDate: DAY(addDays(today, 308)),
      description: "英国事务律师资格考试第一阶段。",
      status: "active",
      createdAt: ISO(subDays(today, 128)),
      updatedAt: ISO(subDays(today, 2)),
    },
    {
      id: "j_legal_en",
      name: "Legal English",
      kind: "language",
      accent: "mauve",
      startDate: DAY(subDays(today, 64)),
      targetDate: DAY(addDays(today, 400)),
      description: "法律英语写作与口语，每周保持输入。",
      status: "active",
      createdAt: ISO(subDays(today, 64)),
      updatedAt: ISO(subDays(today, 5)),
    },
    {
      id: "j_network",
      name: "Professional Network",
      kind: "networking",
      accent: "clay",
      startDate: DAY(subDays(today, 436)),
      description: "长期维护的职业关系，不追求数量。",
      status: "active",
      createdAt: ISO(subDays(today, 436)),
      updatedAt: ISO(subDays(today, 4)),
    },
    {
      id: "j_vibe",
      name: "Vibe Coding",
      kind: "professional",
      accent: "steel",
      startDate: DAY(subDays(today, 41)),
      description: "用 AI 协作把想法做成能跑的东西。",
      status: "active",
      createdAt: ISO(subDays(today, 41)),
      updatedAt: ISO(subDays(today, 6)),
    },
  ];

  const stages: Stage[] = [
    stage("s_sqe_1", "j_sqe", "exploration", "考试信息梳理", 1, "completed", 100, 42, 3, 30),
    stage("s_sqe_2", "j_sqe", "foundation", "完成 FLK1 第一轮", 2, "active", 42, 90, 90, 3),
    stage("s_sqe_3", "j_sqe", "systematic", "系统学习 FLK2", 3, "planned", 0, 150, 120, 5),
    stage("s_sqe_4", "j_sqe", "practice", "刷题与错题复盘", 4, "planned", 0, 210, 100, 7),
    stage("s_sqe_5", "j_sqe", "mock", "模考成绩稳定在 70%", 5, "planned", 0, 250, 60, 45),
    stage("s_sqe_6", "j_sqe", "sprint", "冲刺与考纲复核", 6, "planned", 0, 300, 40, 60),
    stage("s_le_1", "j_legal_en", "foundation", "法律写作句式积累", 1, "active", 55, 90, 60, 5),
    stage("s_vibe_1", "j_vibe", "exploration", "跑通第一个小工具", 1, "completed", 100, 60, 20, 4),
  ];

  function stage(
    id: string,
    journeyId: string,
    phase: Stage["phase"],
    goal: string,
    order: number,
    status: Stage["status"],
    progress: number,
    targetMinutes: number,
    offsetStartDays: number,
    spanDays: number,
  ): Stage {
    const start = subDays(today, offsetStartDays);
    const end = addDays(start, spanDays);
    return {
      id,
      journeyId,
      phase,
      goal,
      order,
      status,
      progress,
      targetMinutes,
      startDate: DAY(start),
      endDate: DAY(end),
      completedAt: status === "completed" ? ISO(end) : undefined,
      createdAt: ISO(start),
      updatedAt: ISO(subDays(today, 2)),
    };
  }

  const courses: Course[] = [
    {
      id: "c_drums",
      hobbyId: "h_drums",
      name: "架子鼓私教",
      totalPrice: 3600,
      totalLessons: 20,
      completedLessons: 7,
      note: "每周一节，提前买断 20 节。",
      createdAt: ISO(subDays(today, 150)),
      updatedAt: ISO(subDays(today, 9)),
    },
  ];

  const events: LifeEvent[] = [];
  const push = (e: Partial<LifeEvent> & { type: LifeEvent["type"]; date: string; title: string }) => {
    events.push({
      id: nid("e"),
      photoIds: [],
      createdAt: ISO(new Date(e.date)),
      updatedAt: ISO(new Date(e.date)),
      ...e,
    } as LifeEvent);
  };

  /* ----------------------------- Today ------------------------------ */
  const todayKey = DAY(today);
  push({
    type: "session",
    date: todayKey,
    startTime: "07:20",
    endTime: "07:55",
    durationMin: 35,
    title: "合同法 · 判例精读",
    journeyId: "j_sqe",
    stageId: "s_sqe_2",
    timeCategory: "growth",
    mood: "good",
    note: "合同解释的三种路径，比昨天顺。",
  });
  push({
    type: "session",
    date: todayKey,
    startTime: "20:10",
    endTime: "20:55",
    durationMin: 45,
    title: "Paradiddle + 完整打一遍歌",
    hobbyId: "h_drums",
    timeCategory: "hobby",
    mood: "great",
    note: "右脚终于顺了一点。",
  });
  push({
    type: "session",
    date: todayKey,
    startTime: "21:30",
    endTime: "22:50",
    durationMin: 80,
    title: "MakeChoice 上线收尾",
    journeyId: "j_vibe",
    timeCategory: "sideproject",
    mood: "good",
  });

  /* ----------------------------- Drums ------------------------------ */
  const drumDays: Date[] = [];
  for (let i = 196; i >= 0; i--) {
    const d = subDays(today, i);
    if (DAY(d) === todayKey) continue;
    const dow = getDay(d);
    const chance = dow === 2 || dow === 4 || dow === 6 ? 0.82 : 0.3;
    if (rand() < chance) drumDays.push(d);
  }
  const drumSlice = drumDays.slice(-41);
  const classDayIndexes = new Set(
    drumSlice.map((_, i) => i).filter((i) => i % 6 === 3).slice(-7),
  );

  drumSlice.forEach((d, i) => {
    const isClass = classDayIndexes.has(i);
    const minutes = isClass ? 60 : [60, 75, 90, 90, 105, 120][Math.floor(rand() * 6)];
    const startHour = isClass ? 19 : rand() > 0.5 ? 20 : 21;
    const startMin = isClass ? 30 : [0, 10, 20, 30][Math.floor(rand() * 4)];
    const start = new Date(d);
    start.setHours(startHour, startMin, 0, 0);
    const end = new Date(start.getTime() + minutes * 60000);
    push({
      type: "session",
      date: DAY(d),
      startTime: HHMM(start),
      endTime: HHMM(end),
      durationMin: minutes,
      title: isClass
        ? "私教课 · 打点与律动"
        : ["基础打点", "Paradiddle 练习", "跟歌练习", "节奏型拓展", "视奏练习"][Math.floor(rand() * 5)],
      hobbyId: "h_drums",
      courseId: isClass ? "c_drums" : undefined,
      amount: isClass ? 180 : undefined,
      moneyType: isClass ? "expense" : undefined,
      expenseCategory: isClass ? "course" : undefined,
      timeCategory: "hobby",
      mood: (["great", "good", "neutral", "good", "tired"] as const)[Math.floor(rand() * 5)],
      note: isClass ? "老师指出腕部太紧，下次放松。" : undefined,
    });
  });

  const drumGear: [string, number, number, LifeEvent["expenseCategory"]][] = [
    ["电子鼓套件", 2000, 168, "gear"],
    ["鼓凳", 480, 150, "gear"],
    ["监听耳机", 320, 96, "gear"],
    ["鼓棒与消耗品", 180, 40, "consumable"],
  ];
  for (const [title, amount, daysAgo, category] of drumGear) {
    const d = subDays(today, daysAgo);
    push({
      type: "expense",
      date: DAY(d),
      title,
      amount,
      moneyType: "expense",
      expenseCategory: category,
      hobbyId: "h_drums",
      timeCategory: "hobby",
    });
  }

  push({
    type: "milestone",
    date: DAY(subDays(today, 46)),
    title: "累计练习 40 小时",
    hobbyId: "h_drums",
    note: "从只能打单拍，到能跟一首歌。",
  });
  push({
    type: "reflection",
    date: DAY(subDays(today, 18)),
    title: "关于练鼓节奏的想法",
    hobbyId: "h_drums",
    note: "每天 20 分钟，比周末一次练两小时有效。",
  });

  /* --------------------------- Photography -------------------------- */
  for (let i = 70; i >= 0; i -= 9) {
    const d = subDays(today, i);
    if (DAY(d) === todayKey) continue;
    const minutes = 60 + Math.floor(rand() * 90);
    const start = new Date(d);
    start.setHours(16, 30, 0, 0);
    const end = new Date(start.getTime() + minutes * 60000);
    push({
      type: "session",
      date: DAY(d),
      startTime: HHMM(start),
      endTime: HHMM(end),
      durationMin: minutes,
      title: ["扫街练手", "练习构图", "夜景练习", "看摄影集"][Math.floor(rand() * 4)],
      hobbyId: "h_photo",
      timeCategory: "hobby",
    });
  }
  push({
    type: "expense",
    date: DAY(subDays(today, 68)),
    title: "定焦镜头",
    amount: 1680,
    moneyType: "expense",
    expenseCategory: "gear",
    hobbyId: "h_photo",
    timeCategory: "hobby",
    note: "35mm，逼自己走近一点。",
  });

  /* ------------------------------ Fitness --------------------------- */
  for (let i = 180; i >= 0; i -= 2) {
    const d = subDays(today, i);
    const dow = getDay(d);
    if (dow !== 1 && dow !== 3 && dow !== 6) continue;
    if (rand() < 0.35) continue;
    if (DAY(d) === todayKey) continue;
    const minutes = 45 + Math.floor(rand() * 4) * 15;
    const start = new Date(d);
    start.setHours(7, 0, 0, 0);
    const end = new Date(start.getTime() + minutes * 60000);
    push({
      type: "session",
      date: DAY(d),
      startTime: HHMM(start),
      endTime: HHMM(end),
      durationMin: minutes,
      title: ["力量训练", "推拉日", "腿日", "有氧 + 核心"][Math.floor(rand() * 4)],
      hobbyId: "h_fitness",
      timeCategory: "health",
    });
  }
  push({
    type: "expense",
    date: DAY(subDays(today, 100)),
    title: "健身房年卡",
    amount: 2400,
    moneyType: "expense",
    expenseCategory: "membership",
    hobbyId: "h_fitness",
    timeCategory: "health",
  });

  /* ------------------------------- SQE ------------------------------ */
  const sqeSessions: Date[] = [];
  for (let i = 128; i >= 1; i--) {
    const d = subDays(today, i);
    const dow = getDay(d);
    const chance = dow === 0 || dow === 6 ? 0.5 : 0.55;
    if (rand() < chance) sqeSessions.push(d);
  }
  sqeSessions.slice(-35).forEach((d) => {
    const minutes = [30, 35, 40, 45, 45, 60, 75, 90][Math.floor(rand() * 8)];
    const start = new Date(d);
    const morning = rand() > 0.55;
    start.setHours(morning ? 7 : 21, morning ? 20 : 0, 0, 0);
    const end = new Date(start.getTime() + minutes * 60000);
    push({
      type: "session",
      date: DAY(d),
      startTime: HHMM(start),
      endTime: HHMM(end),
      durationMin: minutes,
      title: [
        "Contract Law",
        "Tort Law",
        "Business Law",
        "Dispute Resolution",
        "Property Practice",
        "Legal System",
      ][Math.floor(rand() * 6)],
      journeyId: "j_sqe",
      stageId: "s_sqe_2",
      timeCategory: "growth",
      mood: (["great", "good", "neutral", "good", "tired", "frustrated"] as const)[Math.floor(rand() * 6)],
    });
  });

  const sqeSpend: [string, number, number, LifeEvent["expenseCategory"]][] = [
    ["FLK1 教材套装", 1350, 120, "course"],
    ["真题集", 800, 87, "course"],
    ["模考班", 1200, 62, "course"],
    ["考试报名费", 2200, 21, "other"],
    ["网课 · Contract Law 精讲", 880, 8, "course"],
  ];
  for (const [title, amount, daysAgo, category] of sqeSpend) {
    const d = subDays(today, daysAgo);
    push({
      type: "expense",
      date: DAY(d),
      title,
      amount,
      moneyType: "expense",
      expenseCategory: category,
      journeyId: "j_sqe",
      stageId: "s_sqe_2",
      timeCategory: "growth",
    });
  }

  const mockScores: [number, number][] = [
    [74, 45],
    [46, 52],
    [20, 58],
    [5, 63],
    [2, 71],
  ];
  for (const [daysAgo, score] of mockScores) {
    const d = subDays(today, daysAgo);
    push({
      type: "result",
      date: DAY(d),
      title: "Mock Test",
      journeyId: "j_sqe",
      stageId: "s_sqe_2",
      meta: { score },
      note: score >= 63 ? "错题集中在程序性细节。" : undefined,
      timeCategory: "growth",
    });
  }

  push({
    type: "milestone",
    date: DAY(subDays(today, 13)),
    title: "累计投入 100 小时",
    journeyId: "j_sqe",
    stageId: "s_sqe_2",
    timeCategory: "growth",
  });
  push({
    type: "decision",
    date: DAY(subDays(today, 7)),
    title: "考试时间调整到 2027 年 7 月",
    journeyId: "j_sqe",
    note: "把节奏放缓，优先保证 FLK1 的基础扎实。",
    timeCategory: "growth",
  });
  push({
    type: "document",
    date: DAY(subDays(today, 20)),
    title: "SQE 报名确认函",
    journeyId: "j_sqe",
    timeCategory: "growth",
  });
  push({
    type: "reflection",
    date: DAY(subDays(today, 3)),
    title: "八月的投入回顾",
    journeyId: "j_sqe",
    note: "晚上的两小时是最稳定的时段，早上更适合背记。",
    timeCategory: "growth",
  });
  push({
    type: "feedback",
    date: DAY(subDays(today, 11)),
    title: "导师反馈：写作结构清晰，细节偏薄",
    journeyId: "j_sqe",
    timeCategory: "growth",
  });

  /* -------------------------- Legal English ------------------------- */
  for (let i = 60; i >= 1; i -= 5) {
    const d = subDays(today, i);
    if (rand() < 0.35) continue;
    const minutes = 30 + Math.floor(rand() * 3) * 15;
    const start = new Date(d);
    start.setHours(7, 40, 0, 0);
    const end = new Date(start.getTime() + minutes * 60000);
    push({
      type: "session",
      date: DAY(d),
      startTime: HHMM(start),
      endTime: HHMM(end),
      durationMin: minutes,
      title: ["Legal Writing 精读", "口语跟读", "法律词汇整理"][Math.floor(rand() * 3)],
      journeyId: "j_legal_en",
      stageId: "s_le_1",
      timeCategory: "growth",
    });
  }
  push({
    type: "expense",
    date: DAY(subDays(today, 30)),
    title: "Legal English 课程",
    amount: 1280,
    moneyType: "expense",
    expenseCategory: "course",
    journeyId: "j_legal_en",
    timeCategory: "growth",
  });

  /* ----------------------------- Network ---------------------------- */
  const conference = nid("e");
  events.push({
    id: conference,
    type: "meeting",
    date: DAY(subDays(today, 4)),
    title: "行业交流会",
    amount: 800,
    moneyType: "expense",
    expenseCategory: "other",
    journeyId: "j_network",
    timeCategory: "social",
    durationMin: 180,
    startTime: "14:00",
    endTime: "17:00",
    person: "Person A",
    note: "认识了做跨境合规的 A。",
    photoIds: [],
    createdAt: ISO(subDays(today, 4)),
    updatedAt: ISO(subDays(today, 4)),
  });
  events.push({
    id: nid("e"),
    type: "meeting",
    date: DAY(subDays(today, 96)),
    title: "咖啡深聊",
    journeyId: "j_network",
    timeCategory: "social",
    durationMin: 75,
    startTime: "10:00",
    endTime: "11:15",
    person: "Person B",
    note: "聊到她正在做的合规培训业务。",
    photoIds: [],
    createdAt: ISO(subDays(today, 96)),
    updatedAt: ISO(subDays(today, 96)),
  });
  events.push({
    id: nid("e"),
    type: "note",
    date: DAY(subDays(today, 2)),
    title: "Referral：A 转介的合规咨询",
    amount: 5000,
    moneyType: "income",
    journeyId: "j_network",
    timeCategory: "social",
    person: "Person A",
    note: "四个月前的会议，今天有了结果。",
    meta: { followUpOf: conference },
    photoIds: [],
    createdAt: ISO(subDays(today, 2)),
    updatedAt: ISO(subDays(today, 2)),
  });
  events.push({
    id: nid("e"),
    type: "meeting",
    date: DAY(subDays(today, 210)),
    title: "校友聚会",
    journeyId: "j_network",
    timeCategory: "social",
    durationMin: 120,
    startTime: "18:30",
    endTime: "20:30",
    person: "Person C",
    photoIds: [],
    createdAt: ISO(subDays(today, 210)),
    updatedAt: ISO(subDays(today, 210)),
  });

  /* ---------------------------- Vibe coding ------------------------- */
  for (const daysAgo of [34, 28, 21, 14, 9, 6]) {
    const d = subDays(today, daysAgo);
    const minutes = 60 + Math.floor(rand() * 3) * 30;
    const start = new Date(d);
    start.setHours(21, 0, 0, 0);
    const end = new Date(start.getTime() + minutes * 60000);
    push({
      type: "session",
      date: DAY(d),
      startTime: HHMM(start),
      endTime: HHMM(end),
      durationMin: minutes,
      title: ["搭脚手架", "写表单逻辑", "部署上线", "修样式细节"][Math.floor(rand() * 4)],
      journeyId: "j_vibe",
      stageId: "s_vibe_1",
      timeCategory: "sideproject",
    });
  }

  /* ---------------------- Entertainment / rest ---------------------- */
  const leisure: [string, LifeEvent["timeCategory"], number][] = [
    ["看电影《沙丘 2》", "entertainment", 120],
    ["朋友聚餐", "social", 90],
    ["打游戏放松", "entertainment", 60],
    ["散步 + 播客", "rest", 30],
    ["读闲书", "rest", 45],
    ["看剧", "entertainment", 75],
  ];
  for (let i = 0; i < 9; i++) {
    const d = subDays(today, 1 + Math.floor(rand() * 7));
    const [title, category, minutes] = leisure[Math.floor(rand() * leisure.length)];
    const start = new Date(d);
    start.setHours(19 + Math.floor(rand() * 2), 0, 0, 0);
    const end = new Date(start.getTime() + minutes * 60000);
    push({
      type: "session",
      date: DAY(d),
      startTime: HHMM(start),
      endTime: HHMM(end),
      durationMin: minutes,
      title,
      timeCategory: category,
    });
  }

  /* --------------------------- Side income -------------------------- */
  const incomes: IncomeProject[] = [
    {
      id: "i_makechoice",
      name: "MakeChoice 网站",
      type: "oneoff",
      revenue: 500,
      cost: 50,
      minutes: 300,
      date: DAY(subDays(today, 9)),
      assetId: "a_makechoice",
      journeyId: "j_vibe",
      note: "第一个付费交付的网站。",
      createdAt: ISO(subDays(today, 9)),
      updatedAt: ISO(subDays(today, 9)),
    },
    {
      id: "i_template",
      name: "周报模板包",
      type: "recurring",
      revenue: 700,
      cost: 0,
      minutes: 120,
      date: DAY(subDays(today, 5)),
      assetId: "a_template",
      note: "上架后被动出单，几乎不需要维护。",
      createdAt: ISO(subDays(today, 5)),
      updatedAt: ISO(subDays(today, 5)),
    },
    {
      id: "i_old_site",
      name: "旧站维护",
      type: "recurring",
      revenue: 300,
      cost: 0,
      minutes: 90,
      date: DAY(subDays(today, 52)),
      note: "每月一次的小修小补。",
      createdAt: ISO(subDays(today, 52)),
      updatedAt: ISO(subDays(today, 52)),
    },
  ];

  /* ------------------------------ Assets ---------------------------- */
  const assets: Asset[] = [
    {
      id: "a_makechoice",
      name: "MakeChoice Website",
      type: "portfolio",
      createdDate: DAY(subDays(today, 8)),
      minutes: 300,
      cost: 0,
      incomeGenerated: 500,
      sourceJourneyId: "j_vibe",
      sourceIncomeId: "i_makechoice",
      photoIds: [],
      link: "https://example.com/makechoice",
      note: "可以放进作品集的第一件东西。",
      createdAt: ISO(subDays(today, 8)),
      updatedAt: ISO(subDays(today, 8)),
    },
    {
      id: "a_template",
      name: "Excel 周报模板",
      type: "template",
      createdDate: DAY(subDays(today, 33)),
      minutes: 120,
      cost: 0,
      incomeGenerated: 700,
      sourceIncomeId: "i_template",
      photoIds: [],
      note: "把公司里做的东西抽象成了通用模板。",
      createdAt: ISO(subDays(today, 33)),
      updatedAt: ISO(subDays(today, 5)),
    },
    {
      id: "a_notes",
      name: "SQE 学习笔记库",
      type: "notes",
      createdDate: DAY(subDays(today, 11)),
      minutes: 2520,
      cost: 0,
      incomeGenerated: 0,
      sourceJourneyId: "j_sqe",
      photoIds: [],
      note: "按学科整理的错题与要点。",
      createdAt: ISO(subDays(today, 11)),
      updatedAt: ISO(subDays(today, 3)),
    },
    {
      id: "a_drums_skill",
      name: "架子鼓 · 基础视奏能力",
      type: "skill",
      createdDate: DAY(subDays(today, 90)),
      minutes: 4080,
      cost: 0,
      incomeGenerated: 0,
      sourceHobbyId: "h_drums",
      photoIds: [],
      note: "从零到能跟着歌打完一首。",
      createdAt: ISO(subDays(today, 90)),
      updatedAt: ISO(subDays(today, 1)),
    },
    {
      id: "a_codex_article",
      name: "《Codex 上手笔记》",
      type: "article",
      createdDate: DAY(subDays(today, 7)),
      minutes: 180,
      cost: 0,
      incomeGenerated: 0,
      sourceJourneyId: "j_vibe",
      photoIds: [],
      note: "写给同事看的一篇内部分享。",
      createdAt: ISO(subDays(today, 7)),
      updatedAt: ISO(subDays(today, 7)),
    },
    {
      id: "a_client",
      name: "客户：A 的合规咨询",
      type: "client",
      createdDate: DAY(subDays(today, 2)),
      minutes: 300,
      cost: 0,
      incomeGenerated: 5000,
      sourceJourneyId: "j_network",
      photoIds: [],
      note: "由一次会议延伸出来的机会。",
      createdAt: ISO(subDays(today, 2)),
      updatedAt: ISO(subDays(today, 2)),
    },
    {
      id: "a_portrait",
      name: "街头摄影作品集",
      type: "portfolio",
      createdDate: DAY(subDays(today, 25)),
      minutes: 420,
      cost: 1680,
      incomeGenerated: 0,
      sourceHobbyId: "h_photo",
      photoIds: [],
      createdAt: ISO(subDays(today, 25)),
      updatedAt: ISO(subDays(today, 25)),
    },
  ];

  /* ------------------------------ Savings --------------------------- */
  const savings: SavingsItem[] = [
    {
      id: "sv_reservoir",
      kind: "reservoir",
      name: "蓄水池",
      current: 30000,
      target: 30000,
      monthlyEssential: 5000,
      note: "覆盖 6 个月必要开支。",
      createdAt: ISO(subDays(today, 600)),
      updatedAt: ISO(subDays(today, 1)),
    },
    {
      id: "sv_emergency",
      kind: "emergency",
      name: "备用金",
      current: 8400,
      target: 10000,
      note: "只用于突发支出。",
      createdAt: ISO(subDays(today, 400)),
      updatedAt: ISO(subDays(today, 5)),
    },
    {
      id: "sv_dep_1",
      kind: "deposit",
      name: "两年期存单",
      bank: "招商银行",
      principal: 10000,
      rate: 1.55,
      termMonths: 24,
      depositDate: DAY(subDays(today, 452)),
      maturityDate: DAY(addDays(today, 279)),
      autoRenew: true,
      createdAt: ISO(subDays(today, 452)),
      updatedAt: ISO(subDays(today, 452)),
    },
    {
      id: "sv_dep_2",
      kind: "deposit",
      name: "三年期存单",
      bank: "工商银行",
      principal: 20000,
      rate: 1.7,
      termMonths: 36,
      depositDate: DAY(subDays(today, 18)),
      maturityDate: DAY(addDays(today, 1078)),
      autoRenew: false,
      note: "到期后视情况转入蓄水池。",
      createdAt: ISO(subDays(today, 18)),
      updatedAt: ISO(subDays(today, 18)),
    },
  ];

  const savingsTx: SavingsTx[] = [
    tx("sv_reservoir", 8000, "月度结余存入", subDays(today, 9)),
    tx("sv_emergency", -1200, "笔记本维修", subDays(today, 5)),
    tx("sv_emergency", 400, "结余补充", subDays(today, 35)),
    tx("sv_reservoir", 5000, "月度结余存入", subDays(today, 39)),
    tx("sv_reservoir", 6000, "季度奖金", subDays(today, 70)),
  ];

  function tx(itemId: string, amount: number, reason: string, date: Date): SavingsTx {
    return {
      id: nid("tx"),
      itemId,
      amount,
      reason,
      date: DAY(date),
      createdAt: ISO(date),
    };
  }

  const snapshotTotals = [42000, 45500, 48000, 52000, 55000, 58000, 62000, 68400];
  const snapshots: SavingsSnapshot[] = snapshotTotals.map((total, i) => {
    const month = format(subDays(today, (snapshotTotals.length - 1 - i) * 30), "yyyy-MM");
    return { id: `snap_${month}`, month, total };
  });

  /* ----------------------------- 理财 ------------------------------- */
  const investments: Investment[] = [
    {
      id: "inv_gold",
      name: "黄金积存",
      category: "黄金",
      cost: 5000,
      value: 5420,
      startDate: DAY(subDays(today, 180)),
      valueUpdatedAt: ISO(subDays(today, 3)),
      note: "每月定投 500。",
      createdAt: ISO(subDays(today, 180)),
      updatedAt: ISO(subDays(today, 3)),
    },
    {
      id: "inv_fund",
      name: "沪深300指数基金",
      category: "基金",
      cost: 8000,
      value: 7640,
      startDate: DAY(subDays(today, 300)),
      valueUpdatedAt: ISO(subDays(today, 5)),
      createdAt: ISO(subDays(today, 300)),
      updatedAt: ISO(subDays(today, 5)),
    },
    {
      id: "inv_btc",
      name: "比特币",
      category: "数字货币",
      cost: 3000,
      value: 3900,
      startDate: DAY(subDays(today, 120)),
      valueUpdatedAt: ISO(subDays(today, 2)),
      note: "只放能接受归零的部分。",
      createdAt: ISO(subDays(today, 120)),
      updatedAt: ISO(subDays(today, 2)),
    },
  ];

  /* ---------------------------- 小荷包 ------------------------------ */
  savings.push(
    {
      id: "sv_env_gpt",
      kind: "envelope",
      name: "GPT 会员",
      emoji: "💻",
      current: 240,
      target: 240,
      monthlyPlan: 40,
      note: "每月自动续费，先存够一年。",
      createdAt: ISO(subDays(today, 120)),
      updatedAt: ISO(subDays(today, 4)),
    },
    {
      id: "sv_env_trip",
      kind: "envelope",
      name: "出去玩",
      emoji: "✈️",
      current: 1500,
      target: 5000,
      monthlyPlan: 600,
      dueDate: DAY(addDays(today, 240)),
      createdAt: ISO(subDays(today, 60)),
      updatedAt: ISO(subDays(today, 6)),
    },
  );

  /* --------------------------- attach photos ------------------------ */
  const attachLatest = (predicate: (event: LifeEvent) => boolean, photoId: string) => {
    const found = [...events].reverse().find(predicate);
    if (found) found.photoIds = [...found.photoIds, photoId];
  };
  attachLatest((e) => e.hobbyId === "h_drums" && e.date === todayKey, "demo_photo_drums_1");
  attachLatest((e) => e.title === "电子鼓套件", "demo_photo_drums_2");
  attachLatest((e) => e.hobbyId === "h_photo", "demo_photo_street_1");
  attachLatest((e) => e.type === "meeting" && e.journeyId === "j_network", "demo_photo_conference");
  attachLatest((e) => e.journeyId === "j_sqe" && e.type === "session", "demo_photo_desk");

  const photoEvents = events
    .filter((e) => e.hobbyId === "h_photo")
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  if (photoEvents[1]) photoEvents[1].photoIds = ["demo_photo_street_2"];

  return {
    hobbies,
    journeys,
    stages,
    events,
    courses,
    incomes,
    assets,
    savings,
    savingsTx,
    snapshots,
    investments,
  };
}

export async function seedDemoData(): Promise<Settings> {
  const dataset = buildDemoData();
  await Promise.all([
    putMany("hobbies", dataset.hobbies),
    putMany("journeys", dataset.journeys),
    putMany("stages", dataset.stages),
    putMany("events", dataset.events),
    putMany("courses", dataset.courses),
    putMany("incomes", dataset.incomes),
    putMany("assets", dataset.assets),
    putMany("savings", dataset.savings),
    putMany("savingsTx", dataset.savingsTx),
    putMany("snapshots", dataset.snapshots),
  ]);
  await setMeta("seeded", true);
  const settings: Settings = { ...defaultSettings, demoSeeded: true };
  saveSettings(settings);
  return settings;
}
