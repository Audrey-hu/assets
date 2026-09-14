/**
 * 存储层的并发回归测试。
 *
 * 墓碑是「读出来 → 改 → 写回去」，如果并发调用不做串行化，
 * 后写的会把前一个抹掉 —— 表现为「删掉的记录同步后又回来了」。
 * 这里直接对 addTombstones 做并发调用，验证不会丢。
 *
 *   node scripts/test-db.mjs
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.resolve(import.meta.dirname, "..");
const dir = mkdtempSync(path.join(tmpdir(), "ll-db-test-"));
const bundle = path.join(dir, "db.mjs");
const entry = path.join(dir, "entry.ts");

function findEsbuild() {
  const candidates = [
    path.join(root, "node_modules", ".bin", "esbuild"),
    path.join(root, "node_modules", "esbuild", "bin", "esbuild"),
  ];
  const pnpmDir = path.join(root, "node_modules", ".pnpm");
  if (existsSync(pnpmDir)) {
    for (const entryName of readdirSync(pnpmDir)) {
      if (!entryName.startsWith("esbuild@")) continue;
      candidates.push(
        path.join(pnpmDir, entryName, "node_modules", "esbuild", "bin", "esbuild"),
      );
    }
  }
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) throw new Error("找不到 esbuild，无法编译待测模块。");
  return found;
}

/* 用内存版 localStorage 顶替浏览器环境，让存储层跑在 Node 里 */
const store = new Map();
globalThis.localStorage = {
  get length() {
    return store.size;
  },
  key: (i) => [...store.keys()][i] ?? null,
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => void store.set(k, String(v)),
  removeItem: (k) => void store.delete(k),
  clear: () => store.clear(),
};

writeFileSync(
  entry,
  `export {
    addTombstones,
    getTombstones,
    deleteRecord,
    deleteMany,
    getAll,
    clearStores,
    setMeta,
  } from ${JSON.stringify(path.join(root, "src", "lib", "db.ts"))};\n`,
);

execFileSync(findEsbuild(), [entry, "--bundle", "--format=esm", `--outfile=${bundle}`], {
  stdio: "inherit",
});

const db = await import(pathToFileURL(bundle).href);

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

console.log("\n存储层并发\n");

/* 1. 并发写墓碑不能互相覆盖 */
await db.addTombstones(["events:e1"], "2026-01-05T00:00:00.000Z");
await Promise.all([
  db.addTombstones(["events:e2"], "2026-01-05T00:00:00.000Z"),
  db.addTombstones(["photos:p1"], "2026-01-05T00:00:00.000Z"),
]);
let map = await db.getTombstones();
check(
  "两个并发的 addTombstones 都保留下来",
  Boolean(map["events:e1"] && map["events:e2"] && map["photos:p1"]),
  JSON.stringify(map),
);

/* 2. 四个并发（删除兴趣时会这样） */
await db.addTombstones(["hobbies:h1"], "2026-01-06T00:00:00.000Z");
await Promise.all([
  db.addTombstones(["events:a"], "2026-01-06T00:00:00.000Z"),
  db.addTombstones(["events:b"], "2026-01-06T00:00:00.000Z"),
  db.addTombstones(["courses:c"], "2026-01-06T00:00:00.000Z"),
  db.addTombstones(["photos:p2"], "2026-01-06T00:00:00.000Z"),
]);
map = await db.getTombstones();
check(
  "四个并发写入一个都不丢",
  ["hobbies:h1", "events:a", "events:b", "courses:c", "photos:p2"].every((k) => map[k]),
  JSON.stringify(map),
);

/* 3. 删除记录 + 照片（deleteEvent 的真实形态）各自都留下墓碑 */
await db.setMeta("tombstones", {});
await Promise.all([
  db.deleteRecord("events", "e9"),
  db.deleteMany("photos", ["p9"]),
]);
map = await db.getTombstones();
check(
  "同时删记录和照片，两个墓碑都在",
  Boolean(map["events:e9"] && map["photos:p9"]),
  JSON.stringify(map),
);

/* 4. 清空数据时，被清掉的记录都要留下墓碑 */
await db.setMeta("tombstones", {});
await Promise.all([
  db.deleteRecord("events", "keep"),
  db.clearStores(["hobbies", "journeys", "events"]),
]);
map = await db.getTombstones();
check(
  "清空与删除并发时，两者都不丢",
  Boolean(map["events:keep"]),
  JSON.stringify(map),
);

console.log(`\n${passed} 通过，${failed} 失败\n`);
process.exit(failed === 0 ? 0 : 1);
