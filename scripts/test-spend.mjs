/**
 * 分类开销的统计规则测试。
 *
 * 要守住的行为：
 *   - 金额按币种分开累加，任何地方都不做汇率折算
 *   - 本月 / 上月 / 月均 / 预算 / 细分标签各自算对
 *   - 分类按本月花得多到少排，跨月、跨年不出错
 *
 *   node scripts/test-spend.mjs
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.resolve(import.meta.dirname, "..");
const dir = mkdtempSync(path.join(tmpdir(), "ll-spend-test-"));
const bundle = path.join(dir, "spend.mjs");
const entry = path.join(dir, "entry.ts");

function findEsbuild() {
  const candidates = [
    path.join(root, "node_modules", ".bin", "esbuild"),
    path.join(root, "node_modules", "esbuild", "bin", "esbuild"),
  ];
  const pnpmDir = path.join(root, "node_modules", ".pnpm");
  if (existsSync(pnpmDir)) {
    for (const item of readdirSync(pnpmDir)) {
      if (!item.startsWith("esbuild@")) continue;
      candidates.push(path.join(pnpmDir, item, "node_modules", "esbuild", "bin", "esbuild"));
    }
  }
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) throw new Error("找不到 esbuild，无法编译待测模块。");
  return found;
}

writeFileSync(
  entry,
  `export * from ${JSON.stringify(path.join(root, "src", "lib", "spend-stats.ts"))};\n`,
);

execFileSync(findEsbuild(), [entry, "--bundle", "--format=esm", `--outfile=${bundle}`], {
  stdio: "inherit",
});

const {
  monthOf,
  monthLabel,
  shiftMonth,
  spendMonthTotal,
  spendOverview,
  monthChange,
  deductsFromSavings,
  spendLinkOf,
} = await import(pathToFileURL(bundle).href);

let passed = 0;
let failed = 0;

function check(name, condition, detail) {
  if (condition) {
    passed += 1;
    console.log(`  ok   ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL ${name}`);
    if (detail !== undefined) console.log(`       ${detail}`);
  }
}

const row = (id, categoryId, amount, date, extra = {}) => ({
  id,
  categoryId,
  amount,
  date,
  currency: "CNY",
  createdAt: `${date}T10:00:00.000Z`,
  updatedAt: `${date}T10:00:00.000Z`,
  ...extra,
});

const categories = [
  {
    id: "c_games",
    name: "游戏",
    emoji: "🎮",
    accent: "clay",
    monthlyBudget: 300,
    budgetCurrency: "CNY",
    tags: ["买游戏", "皮肤道具"],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "c_clothes",
    name: "衣服",
    emoji: "🧥",
    accent: "sand",
    tags: ["自己买的", "妈妈买的"],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "c_coffee",
    name: "咖啡",
    emoji: "☕️",
    accent: "sage",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

const entries = [
  row("e1", "c_games", 100, "2026-11-01", { tag: "买游戏" }),
  row("e2", "c_games", 50, "2026-11-02", { tag: "皮肤道具" }),
  row("e3", "c_games", 12, "2026-11-03", { currency: "GBP", tag: "买游戏" }),
  row("e4", "c_clothes", 300, "2026-11-02", { tag: "妈妈买的", savingsItemId: "sv_trip" }),
  row("e5", "c_clothes", 200, "2026-11-05", { tag: "自己买的" }),
  row("e6", "c_games", 80, "2026-10-15"),
  row("e7", "c_coffee", 30, "2026-09-10"),
  row("e8", "c_gone", 999, "2026-11-04"),
  row("e9", "c_clothes", 60, "2026-09-11", {
    savingsItemId: "sv_extra",
    deductFromSavings: false,
  }),
];

/* ------------------------------ 基础工具 ------------------------------ */
check("月份提取只认 YYYY-MM", monthOf("2026-11-03") === "2026-11" && monthOf("bad") === "");
check("月份标签", monthLabel("2026-11") === "11月");
check("跨年往前一个月", shiftMonth("2026-01", -1) === "2025-12");
check("跨年往后一个月", shiftMonth("2026-12", 1) === "2027-01");
check(
  "某月合计按币种分开",
  (() => {
    const total = spendMonthTotal(entries, "2026-11");
    return total.CNY === 1649 && total.GBP === 12;
  })(),
  JSON.stringify(spendMonthTotal(entries, "2026-11")),
);

/* ------------------------------- 总览 ------------------------------- */
const overview = spendOverview(categories, entries, { month: "2026-11", today: "2026-11-03" });

check("本月笔数（含已删分类）", overview.count === 6, overview.count);
check("上月金额", overview.previous.CNY === 80, JSON.stringify(overview.previous));
check("多币种时不给环比", overview.change === undefined);
check("多币种时不给占比", overview.categories[1].share === undefined);
check("已删分类的记录计入总额", overview.orphanCount === 1);
check(
  "分类按本月金额从大到小",
  overview.categories.map((row) => row.category.name).join(",") === "衣服,游戏,咖啡",
  overview.categories.map((row) => row.category.name).join(","),
);
check(
  "单类本月金额",
  overview.categories.find((row) => row.category.id === "c_clothes").month.CNY === 500,
);
check(
  "预算使用比例",
  Math.abs(overview.categories.find((row) => row.category.id === "c_games").budgetUsed - 0.5) < 1e-9,
);
check(
  "细分标签各自合计",
  (() => {
    const row = overview.categories.find((item) => item.category.id === "c_clothes");
    const mum = row.tags.find((tag) => tag.tag === "妈妈买的");
    const own = row.tags.find((tag) => tag.tag === "自己买的");
    return mum.month.CNY === 300 && own.month.CNY === 200;
  })(),
);
check("趋势固定 6 个月", overview.trend.length === 6);
check("趋势以本月结尾", overview.trend[5].month === "2026-11");
check("趋势里上月是 80", overview.trend[4].total.CNY === 80);
check("日均 = 本月 / 已过天数", Math.abs(overview.daily.CNY - 1649 / 3) < 1e-9);
check("本月从储蓄里出的金额单独可见", overview.fromSavings.CNY === 300, JSON.stringify(overview.fromSavings));
check("没关联储蓄的记录不计入 fromSavings", overview.fromSavings.GBP === undefined);
check(
  "只关联、不扣款的记录不算「来自储蓄」",
  spendOverview(categories, entries, { month: "2026-09", today: "2026-09-30" }).fromSavings.CNY ===
    undefined,
  JSON.stringify(spendOverview(categories, entries, { month: "2026-09", today: "2026-09-30" }).fromSavings),
);

/* ---------------------- 关联 ≠ 扣款 ---------------------- */
check("旧数据：有关联就按扣款处理", deductsFromSavings({ savingsItemId: "sv" }) === true);
check(
  "显式关闭扣款时只标记来源",
  deductsFromSavings({ savingsItemId: "sv", deductFromSavings: false }) === false,
);
check("没关联就不扣款", deductsFromSavings({}) === false);
check(
  "旧数据：savingsItemId 自动折算成 savings 关联",
  spendLinkOf({ savingsItemId: "sv" })?.kind === "savings" &&
    spendLinkOf({ savingsItemId: "sv" })?.id === "sv",
);
check(
  "新数据：可以关联非储蓄对象",
  spendLinkOf({ link: { kind: "journey", id: "j1" } })?.kind === "journey" &&
    spendLinkOf({ link: { kind: "journey", id: "j1" } })?.id === "j1",
);
check("没有关联对象时返回空", spendLinkOf({}) === undefined);

/* --------------------------- 单币种下的占比 --------------------------- */
const single = spendOverview(categories, entries.filter((row) => row.currency !== "GBP"), {
  month: "2026-11",
  today: "2026-11-03",
});
check(
  "单币种时给占比",
  Math.abs(single.categories.find((row) => row.category.id === "c_clothes").share - 500 / 1649) <
    1e-9,
);
check("单币种环比可以算", typeof single.change === "number");

/* ------------------------------ 环比工具 ------------------------------ */
check("环比：多花一倍是 +100%", monthChange({ CNY: 200 }, { CNY: 100 }) === 1);
check("环比：少花一半是 -50%", monthChange({ CNY: 50 }, { CNY: 100 }) === -0.5);
check("环比：上期为 0 时不给数", monthChange({ CNY: 50 }, {}) === undefined);
check("环比：跨币种不给数", monthChange({ CNY: 50 }, { GBP: 20 }) === undefined);

/* ------------------------------ 月均 ------------------------------ */
check(
  "月均是近 6 个月总额除以 6",
  Math.abs(overview.categories.find((row) => row.category.id === "c_games").average.CNY - 230 / 6) <
    1e-9,
);

console.log(`\n${passed} 通过，${failed} 失败\n`);
process.exit(failed === 0 ? 0 : 1);
