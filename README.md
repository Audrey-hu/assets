# 人生账本 · LifeLedger

> 把时间和钱，变成看得见的人生。

一个**长期主义记录工具**，不是消费记账软件。
它回答的问题只有一个：**这些年，我把自己的时间和钱，变成了什么。**

追踪六件事：兴趣爱好投入、个人成长投入、下班后的时间、业余收入、沉淀下来的资产、存款与安全储备。

<sub>React 18 · TypeScript · Vite · Tailwind CSS · Radix UI · Recharts · Framer Motion · IndexedDB · PWA</sub>

---

## 为什么它不是记账软件

传统记账记录的是「我今天花了多少钱」。人生账本记录的是**投入和产出之间的关系**：

- 架子鼓练了 68 小时、花了 ¥4,200 —— 每小时成本是多少？器材有没有真的被用起来？
- SQE1 投入 128 天、42 小时、¥6,430 —— 现在走到哪一阶段了，下一步是什么？
- MakeChoice 网站花了 5 小时、收入 ¥500 —— 它最后变成了一件作品，作品又带来了新的收入。
- 蓄水池 ¥30,000、每月必要开支 ¥5,000 —— 安全月数是 6 个月。

所有数字都是**算出来的**，不是填进去的。你只记录发生了什么。

## 核心设计

**一个统一的 LifeEvent，喂给所有页面。**
一次 40 分钟的专注只写一条记录，它同时出现在 Today、After Work 时间构成、Journey/Hobby 时间线和日历里 —— 不需要重复录入。

```ts
LifeEvent {
  id, type, date, startTime, endTime, durationMin,
  amount, moneyType, expenseCategory, title, note, mood, photoIds,
  hobbyId, journeyId, stageId, courseId, assetId, incomeId,
  timeCategory, person, meta, createdAt, updatedAt
}
```

**统计全部即时计算，不存冗余字段。**
`hobbyStats` / `journeyStats` / `monthSummary` / `categoryBreakdown` / `savingsTotals` / `incomeStats` / `journeyTrend` / `courseStats` 都在 `src/lib/stats.ts`，是纯函数，好测也好改。

**语气不制造内疚。**
显示「3 天前练过」，而不是「连续打卡失败」。长期主义允许暂停。

## 功能

| 区域 | 内容 |
| --- | --- |
| **Today** | 今日记录、本月投入、After Work 近 7 天时间构成、Continue 长期项目 |
| **Journey** | 成长（阶段、长期时间轴、趋势曲线）/ 兴趣（累计时间、Cost per Hour、课程利用率、照片时间线） |
| **Ledger** | 存款（蓄水池 / 备用金 / 定期存单 / 到期时间轴 / 增长曲线 / 里程碑）、业余收入（净收入与时薪）、After Work 时间账户 |
| **Assets** | 沉淀资产，以及 From Investment to Asset 关系链 |
| **其他** | Focus Timer、Session 小结、照片、Calendar、Monthly Review、Life Moments、全局搜索、JSON 导入导出、PWA |

## 快速开始

```bash
pnpm install
pnpm dev            # 开发服务器 http://localhost:5173
pnpm build          # 多文件构建 + PWA service worker
pnpm build:single   # 单文件构建：JS/CSS/图标/示例照片内联成一个 HTML
```

### 两个构建目标

| 产物 | 用途 | 存储 |
| --- | --- | --- |
| `dist/` | 多文件 + service worker，给开发服务器 / 静态托管 / PWA | IndexedDB |
| `dist-single/人生账本.html` | 单文件，双击即用（`file://`） | 自动降级到 localStorage |

`file://` 下浏览器会禁用 IndexedDB，也不允许加载 ES Module。所以单文件版把脚本编译成普通 IIFE 并内联，存储层则在运行时探测：
IndexedDB → localStorage → 内存，三种后端实现同一套接口（`src/lib/db.ts`），上层完全无感。

第一次打开会自动生成一组 Demo 数据，想从零开始就在 **Me → Clear Demo Data** 里清掉。

## 部署到 GitHub Pages

仓库自带 [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml)：

1. 仓库 **Settings → Pages → Source** 选 **GitHub Actions**
2. 推到 `main`（或在 Actions 页面手动 Run workflow）

构建完成后访问 `https://<你的用户名>.github.io/<仓库名>/`。
因为跑在 https 下，这时的存储是 IndexedDB，容量充足，也可以装到手机桌面。

## 数据与隐私

没有服务器、没有账号、没有埋点。所有数据只存在你自己的浏览器里。

- 备份：**Me → 导出 JSON**（照片会一并编码进去）
- 恢复：**Me → 导入 JSON**

注意：`file://` 打开和 `localhost` 打开在浏览器眼里是两个站点，各自存各自的数据；想迁移就用导出导入。

## 目录结构

```
src/
  lib/        类型、存储后端、统计计算、格式化、Demo 数据、备份、路由
  store/      AppStore（数据 + CRUD + 级联删除）、UIStore（弹层）、FocusStore（计时器）
  components/ ui/（设计系统原语）、editors/（各类表单）、overlays/（弹层与计时器）
  features/   today/ hobby/ journey/ ledger/ assets/ me/
scripts/      单文件打包脚本
```

接 Supabase / Firebase 时只需要替换 `src/lib/db.ts` 这一层的读写实现，界面与统计逻辑不用动。

## License

[MIT](LICENSE)
