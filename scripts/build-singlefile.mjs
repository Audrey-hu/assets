/**
 * 把 dist-single 的产物打成一个自包含的 HTML 文件。
 *
 * 处理内容：
 *   - 内联 JS（改成普通 <script>，去掉 type=module 与 crossorigin）
 *   - 内联 CSS
 *   - 把图标、示例照片转成 data URL（file:// 下无法 fetch 本地文件）
 *   - 去掉 manifest 与 modulepreload
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const dist = path.join(root, "dist-single");
const publicDir = path.join(root, "public");
const outFile = path.join(dist, "人生账本.html");

const read = (p) => readFileSync(p, "utf8");
const mime = {
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webmanifest": "application/manifest+json",
};

function dataUrl(file) {
  const ext = path.extname(file).toLowerCase();
  const type = mime[ext] ?? "application/octet-stream";
  return `data:${type};base64,${readFileSync(file).toString("base64")}`;
}

let html = read(path.join(dist, "index.html"));

/*
 * 所有替换一律使用函数形式。
 * 如果用字符串做 replacement，JS/CSS 里出现的 $&  $'  $` 会被当成特殊模式，
 * 结果是整段 HTML 被重复注入（曾经真的踩到过）。
 */

/* ---- 内联 CSS ---- */
html = html.replace(
  /<link[^>]+rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g,
  (_match, href) => {
    const file = path.join(dist, href.replace(/^\.\//, ""));
    return `<style>\n${read(file)}\n</style>`;
  },
);

/* ---- 单文件版本本来就是给 file:// 用的，去掉“必须起服务器”的拦截页 ---- */
html = html.replace(
  /<!-- ll:server-only-guard -->[\s\S]*?<!-- \/ll:server-only-guard -->/,
  () => "",
);

/* ---- 内联 JS ----
   注意：内联脚本不能再放 <head> 里同步执行，否则 #root 还不存在，
   所以要收集起来统一插到 </body> 之前。 */
const scripts = [];
html = html.replace(/<script[^>]*src="([^"]+)"[^>]*><\/script>/g, (_match, src) => {
  const file = path.join(dist, src.replace(/^\.\//, ""));
  scripts.push(read(file).replace(/<\/script/gi, "<\\/script"));
  return "";
});

/* ---- 清理不再需要的外部引用 ---- */
html = html.replace(/<link[^>]+rel="modulepreload"[^>]*>/g, () => "");
html = html.replace(/<link[^>]+rel="manifest"[^>]*>/g, () => "");

/* ---- 图标改内联 ---- */
for (const [attr, file] of [
  ["favicon.svg", "favicon.svg"],
  ["apple-touch-icon.png", "apple-touch-icon.png"],
]) {
  const full = path.join(publicDir, file);
  if (!existsSync(full)) continue;
  html = html.replace(
    new RegExp(`href="[^"]*${attr}"`, "g"),
    () => `href="${dataUrl(full)}"`,
  );
}

/* ---- 示例照片内联，供首次运行时写入本地存储 ---- */
const demoFiles = [
  ["demo_photo_drums_1", "demo/drums-1.jpg"],
  ["demo_photo_drums_2", "demo/drums-2.jpg"],
  ["demo_photo_street_1", "demo/street-1.jpg"],
  ["demo_photo_street_2", "demo/street-2.jpg"],
  ["demo_photo_conference", "demo/conference.jpg"],
  ["demo_photo_desk", "demo/desk-1.jpg"],
];
const demoMap = {};
let demoBytes = 0;
for (const [id, file] of demoFiles) {
  const full = path.join(publicDir, file);
  if (!existsSync(full)) continue;
  const encoded = dataUrl(full);
  demoMap[id] = encoded;
  demoBytes += encoded.length;
}
const demoScript = `<script>window.__LL_DEMO_PHOTOS__=${JSON.stringify(demoMap)};</script>`;
html = html.replace("</head>", () => `${demoScript}\n  </head>`);

/* ---- 应用脚本放到 body 末尾 ---- */
html = html.replace(
  "</body>",
  () => `${scripts.map((code) => `<script>\n${code}\n</script>`).join("\n")}\n</body>`,
);

writeFileSync(outFile, html);
const kb = (n) => `${Math.round(n / 1024)} KB`;
console.log(`单文件构建完成 → ${outFile}`);
console.log(`  内联脚本 + 样式 + 图标 + ${Object.keys(demoMap).length} 张示例照片（${kb(demoBytes)}）`);
console.log(`  文件大小：${kb(Buffer.byteLength(html))}`);
