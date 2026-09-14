/**
 * 同步合并规则的测试。纯逻辑，不需要 Supabase，也不需要浏览器。
 *
 *   node scripts/test-sync.mjs
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.resolve(import.meta.dirname, "..");
const dir = mkdtempSync(path.join(tmpdir(), "ll-sync-test-"));
const bundle = path.join(dir, "sync-plan.mjs");
const entry = path.join(dir, "entry.ts");
/** esbuild 是 vite 的间接依赖，pnpm 下位置不固定，这里找一下。 */
function findEsbuild() {
  const candidates = [
    path.join(root, "node_modules", ".bin", "esbuild"),
    path.join(root, "node_modules", "esbuild", "bin", "esbuild"),
  ];
  const pnpmDir = path.join(root, "node_modules", ".pnpm");
  if (existsSync(pnpmDir)) {
    for (const entry of readdirSync(pnpmDir)) {
      if (!entry.startsWith("esbuild@")) continue;
      candidates.push(path.join(pnpmDir, entry, "node_modules", "esbuild", "bin", "esbuild"));
    }
  }
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) throw new Error("找不到 esbuild，无法编译待测模块。");
  return found;
}

const esbuild = findEsbuild();

writeFileSync(
  entry,
  `export { planSync, keyOf } from ${JSON.stringify(
    path.join(root, "src", "lib", "sync-plan.ts"),
  )};\n`,
);

execFileSync(esbuild, [entry, "--bundle", "--format=esm", `--outfile=${bundle}`], {
  stdio: "inherit",
});

const { planSync, keyOf } = await import(pathToFileURL(bundle).href);

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

const USER = "user-1";
const T = (n) => new Date(Date.UTC(2026, 0, n)).toISOString();

const remoteRow = (store, id, updatedAt, deleted = false) => ({
  store,
  id,
  data: deleted ? null : { id, updatedAt },
  updated_at: updatedAt,
  deleted,
});

const localRec = (store, id, updatedAt) => ({
  store,
  id,
  updatedAt,
  data: { id, updatedAt },
});

const plan = (local, remote, tombstones = {}) =>
  planSync({ local, remote, tombstones, userId: USER });

const firstPlan = (local, remote, tombstones = {}) =>
  planSync({ local, remote, tombstones, userId: USER, firstSync: true });

const pristinePlan = (local, remote) =>
  planSync({
    local,
    remote,
    tombstones: {},
    userId: USER,
    firstSync: true,
    dropLocalExtras: true,
  });

console.log("\n同步合并规则\n");

{
  const p = plan([], [remoteRow("events", "e1", T(2))]);
  check("云端有、本地没有 → 下载", p.pull.length === 1 && p.push.length === 0, JSON.stringify(p));
}

{
  const p = plan([localRec("events", "e1", T(2))], []);
  check("本地有、云端没有 → 上传", p.push.length === 1 && p.pull.length === 0);
}

{
  const p = plan([localRec("events", "e1", T(2))], [remoteRow("events", "e1", T(2))]);
  check("两边一致 → 什么都不做", p.pull.length === 0 && p.push.length === 0);
}

{
  const p = plan([localRec("events", "e1", T(5))], [remoteRow("events", "e1", T(3))]);
  check("两边都改、本地更新 → 上传本地", p.push.length === 1 && p.pull.length === 0);
}

{
  const p = plan([localRec("events", "e1", T(3))], [remoteRow("events", "e1", T(5))]);
  check("两边都改、云端更新 → 覆盖本地", p.pull.length === 1 && p.push.length === 0);
}

{
  const p = plan([localRec("events", "e1", T(2))], [remoteRow("events", "e1", T(4), true)]);
  check(
    "云端删除 → 本地跟着删",
    p.deleteLocal.length === 1 && p.pull.length === 0 && p.push.length === 0,
    JSON.stringify(p),
  );
}

{
  const p = plan([localRec("events", "e1", T(6))], [remoteRow("events", "e1", T(4), true)]);
  check(
    "云端已删 + 本地改过 → 仍然删除（删除优先）",
    p.deleteLocal.length === 1 && p.push.length === 0,
    JSON.stringify(p),
  );
}

{
  const p = plan([], [remoteRow("events", "e1", T(2))], { [keyOf("events", "e1")]: T(5) });
  check("本地删除 → 上传墓碑", p.push.length === 1 && p.push[0].deleted === true, JSON.stringify(p));
}

{
  /* 这是「删掉的记录又出现」的根因：本地已删，云端还留着旧副本 */
  const p = plan([], [remoteRow("events", "e1", T(2))], { [keyOf("events", "e1")]: T(5) });
  check(
    "本地已删 + 云端有旧副本 → 不能拉回来",
    p.pull.length === 0 && p.push.length === 1 && p.push[0].deleted === true,
    JSON.stringify(p),
  );
}

{
  const p = plan([], [remoteRow("events", "e1", T(2))], { [keyOf("events", "e1")]: T(2) });
  check(
    "墓碑与云端同样新 → 仍然以删除为准，并把云端标记成删除",
    p.pull.length === 0 && p.push.length === 1 && p.push[0].deleted === true,
    JSON.stringify(p),
  );
}

{
  /*
   * 这条覆盖真正把用户坑到的场景：云端那份的 updated_at 看起来比墓碑还新
   * （示例数据的时间戳曾经落在未来），旧逻辑会因此把删除翻案。
   */
  const p = plan([], [remoteRow("events", "e1", T(7))], { [keyOf("events", "e1")]: T(5) });
  check(
    "云端那份时间戳更新 → 删除依然优先，不拉回来",
    p.pull.length === 0 && p.push.length === 1 && p.push[0].deleted === true,
    JSON.stringify(p),
  );
}

{
  const p = plan([], [remoteRow("events", "e1", T(5), true)], {
    [keyOf("events", "e1")]: T(5),
  });
  check("墓碑云端已存在 → 不重复上传", p.push.length === 0, JSON.stringify(p));
}

{
  /* 用户当前的状态：上一轮同步把删掉的记录又拉了回来，本地既有记录又有墓碑 */
  const p = plan([localRec("events", "e1", T(3))], [remoteRow("events", "e1", T(9))], {
    [keyOf("events", "e1")]: T(5),
  });
  check(
    "本地既有记录又有墓碑 → 本地也删掉，并推墓碑",
    p.deleteLocal.length === 1 && p.pull.length === 0 && p.push.length === 1,
    JSON.stringify(p),
  );
}

{
  /* 时区 / 格式不一致时，必须按真实时刻比较，不能按字符串 */
  const p = plan(
    [localRec("events", "e1", "2026-09-14T20:00:00.000Z")],
    [
      {
        store: "events",
        id: "e1",
        data: { id: "e1" },
        updated_at: "2026-09-14T12:00:00+00:00",
        deleted: false,
      },
    ],
  );
  check(
    "带 +00:00 的云端时间戳按真实时刻比较（本地 20:00Z 更新 → 上传）",
    p.push.length === 1 && p.pull.length === 0,
    JSON.stringify(p),
  );
}

{
  const p = plan([localRec("hobbies", "h1", T(2))], []);
  check(
    "上传行带 user_id 与完整 data",
    p.push[0].user_id === USER && p.push[0].data.id === "h1",
    JSON.stringify(p.push[0]),
  );
}

{
  const p = plan([localRec("events", "same", T(2))], [remoteRow("hobbies", "same", T(2))]);
  check(
    "不同 store 的同名 id 是两条记录",
    p.pull.length === 1 && p.push.length === 1,
    JSON.stringify(p),
  );
}

{
  const p = plan([], [], { [keyOf("events", "e1")]: T(9) });
  check(
    "本地已删、云端从未有过 → 不推墓碑（没有东西可删）",
    p.push.length === 0 && p.pull.length === 0 && p.deleteLocal.length === 0,
    JSON.stringify(p),
  );
}

console.log("\n首次连接的保护（新设备不要覆盖云端）\n");

{
  /* 新设备刚生成的 Demo 数据时间戳是"现在"，比云端真实记录新 */
  const p = firstPlan([localRec("events", "e1", T(9))], [remoteRow("events", "e1", T(2))]);
  check(
    "首次连接、云端已有数据 → 同 id 以云端为准",
    p.pull.length === 1 && p.push.length === 0,
    JSON.stringify(p),
  );
}

{
  const p = firstPlan([localRec("events", "demo-only", T(9))], [remoteRow("events", "e1", T(2))]);
  check(
    "首次连接 → 本地独有记录不上传",
    p.push.length === 0 && p.pull.length === 1,
    JSON.stringify(p),
  );
}

{
  const p = firstPlan([localRec("events", "demo-only", T(9))], []);
  check(
    "首次连接、云端什么都没有 → 正常上传",
    p.push.length === 1 && p.push[0].deleted === false,
    JSON.stringify(p),
  );
}

{
  const p = firstPlan([], [remoteRow("events", "e1", T(2))], { [keyOf("events", "e2")]: T(9) });
  check(
    "首次连接 → 不把本地的删除推到云端",
    p.push.length === 0 && p.pull.length === 1,
    JSON.stringify(p),
  );
}

{
  const p = plan([localRec("events", "e1", T(9))], [remoteRow("events", "e1", T(2))]);
  check(
    "非首次连接 → 仍然按时间取新（本地胜出）",
    p.push.length === 1 && p.pull.length === 0,
    JSON.stringify(p),
  );
}

console.log("\n新设备带着示例数据连接时\n");

{
  const p = pristinePlan(
    [localRec("events", "demo-1", T(9)), localRec("events", "demo-2", T(9))],
    [remoteRow("events", "e1", T(2))],
  );
  check(
    "没改过的示例数据 → 本地独有记录被清掉",
    p.deleteLocal.length === 2 && p.push.length === 0 && p.pull.length === 1,
    JSON.stringify(p),
  );
}

{
  /* 用户改过的记录不能删，只在 firstSync 时保留 */
  const p = planSync({
    local: [localRec("events", "mine", T(9))],
    remote: [remoteRow("events", "e1", T(2))],
    tombstones: {},
    userId: USER,
    firstSync: true,
    dropLocalExtras: false,
  });
  check(
    "用户改过的本地记录 → 保留，不上传",
    p.deleteLocal.length === 0 && p.push.length === 0 && p.pull.length === 1,
    JSON.stringify(p),
  );
}

{
  const p = pristinePlan([localRec("events", "demo-1", T(9))], []);
  check(
    "云端是空的 → 示例数据照常上传，不丢",
    p.push.length === 1 && p.deleteLocal.length === 0,
    JSON.stringify(p),
  );
}

console.log(`\n${passed} 通过，${failed} 失败\n`);
process.exit(failed === 0 ? 0 : 1);
