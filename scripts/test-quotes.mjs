/**
 * 「今日一句」的选取规则测试。
 *
 * 要守住的行为：
 *   - 同一天、任何设备、刷新多少次，都是同一句
 *   - 相邻两天不重复，且一轮走满刚好把句库用一遍
 *   - 日期跨月、跨年都不会错位
 *
 *   node scripts/test-quotes.mjs
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.resolve(import.meta.dirname, "..");
const dir = mkdtempSync(path.join(tmpdir(), "ll-quotes-test-"));
const bundle = path.join(dir, "quotes.mjs");
const entry = path.join(dir, "entry.ts");

/** esbuild 是 vite 的间接依赖，pnpm 下位置不固定，这里找一下。 */
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
  `export * from ${JSON.stringify(path.join(root, "src", "lib", "quotes.ts"))};\n`,
);

execFileSync(findEsbuild(), [entry, "--bundle", "--format=esm", `--outfile=${bundle}`], {
  stdio: "inherit",
});

const { QUOTES, QUOTE_STEP, afterIndex, dayNumber, quoteIndexForDay, quoteOfDay } = await import(
  pathToFileURL(bundle).href
);

let passed = 0;
let failed = 0;

function check(name, condition, detail) {
  if (condition) {
    passed += 1;
    console.log(`  ok   ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL ${name}`);
    if (detail) console.log(`       ${detail}`);
  }
}

const at = (y, m, d, hh = 9, mm = 30) => new Date(y, m - 1, d, hh, mm, 0);
const nextDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1, 9, 30, 0);
const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));

/* ------------------------------- 句库本身 ------------------------------- */
const texts = QUOTES.map((quote) => quote.text);

check("句库至少 30 句", QUOTES.length >= 30, `实际 ${QUOTES.length}`);
check("没有重复的句子", new Set(texts).size === texts.length);
check(
  "每句长度在 4–40 字之间",
  texts.every((text) => text.length >= 4 && text.length <= 40),
  texts.filter((text) => text.length < 4 || text.length > 40).join(" / "),
);
check(
  "每句都以中文句末标点收尾",
  texts.every((text) => /[。！？]$/.test(text)),
  texts.filter((text) => !/[。！？]$/.test(text)).join(" / "),
);
check(
  "写了出处的都有实际内容",
  QUOTES.every(
    (quote) => quote.from === undefined || (typeof quote.from === "string" && quote.from.length > 1),
  ),
);

/* ------------------------------ 每天一句 ------------------------------- */
check(
  "同一天的早上和深夜 → 同一句",
  quoteIndexForDay(dayNumber(at(2026, 9, 16, 6, 0))) ===
    quoteIndexForDay(dayNumber(at(2026, 9, 16, 23, 59))),
);

check(
  "同一天反复取 → 同一句",
  quoteOfDay(at(2026, 9, 16, 8, 0)).text === quoteOfDay(at(2026, 9, 16, 20, 0)).text,
);

check(
  "相邻两天不是同一句",
  quoteIndexForDay(dayNumber(at(2026, 9, 16))) !== quoteIndexForDay(dayNumber(at(2026, 9, 17))),
);

check(
  "跨月第一天不重复",
  quoteIndexForDay(dayNumber(at(2026, 9, 30))) !== quoteIndexForDay(dayNumber(at(2026, 10, 1))),
);

check(
  "跨年第一天不重复",
  quoteIndexForDay(dayNumber(at(2026, 12, 31))) !== quoteIndexForDay(dayNumber(at(2027, 1, 1))),
);

check(
  "闰年 2 月 29 日也算一天",
  dayNumber(at(2028, 3, 1)) - dayNumber(at(2028, 2, 28)) === 2,
);

check(
  "每天序号只加 1（不受夏令时/时区影响）",
  (() => {
    let cursor = at(2026, 3, 7);
    for (let i = 0; i < 8; i += 1) {
      const delta = dayNumber(nextDay(cursor)) - dayNumber(cursor);
      if (delta !== 1) return false;
      cursor = nextDay(cursor);
    }
    return true;
  })(),
);

/* --------------------------- 走满一轮不重复 --------------------------- */
{
  const seen = new Set();
  let cursor = at(2026, 9, 16);
  for (let i = 0; i < QUOTES.length; i += 1) {
    seen.add(quoteIndexForDay(dayNumber(cursor)));
    cursor = nextDay(cursor);
  }
  check(
    `连续 ${QUOTES.length} 天刚好把 ${QUOTES.length} 句全用一遍`,
    seen.size === QUOTES.length,
    `只用到 ${seen.size} 句`,
  );
}

check(
  `步长 ${QUOTE_STEP} 与句库数量互质（不会提前打转）`,
  gcd(QUOTE_STEP, QUOTES.length) === 1,
);

/* ------------------------------ 手动换一句 ----------------------------- */
check("换一句会变", afterIndex(5) !== 5);
check("换到末尾会绕回开头", afterIndex(QUOTES.length - 1) === 0);
check(
  "连续换一轮回到原句",
  (() => {
    let index = 3;
    for (let i = 0; i < QUOTES.length; i += 1) index = afterIndex(index);
    return index === 3;
  })(),
);

console.log(`\n${passed} 通过，${failed} 失败\n`);
process.exit(failed === 0 ? 0 : 1);
