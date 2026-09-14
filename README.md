# 人生账本 · LifeLedger

> 把时间和钱，变成看得见的人生。

**在线使用：[audrey-hu.github.io/assets](https://audrey-hu.github.io/assets/)** — 手机上打开后可以「添加到主屏幕」，像 App 一样用。

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
| **Ledger** | 储蓄（蓄水池 / 备用金 / **小荷包** / 定期存单 / 到期时间轴 / 增长曲线 / 里程碑）、**理财**（黄金、基金、股票、数字货币，类别自己定）、业余收入（净收入与时薪）、After Work 时间账户 |
| **Assets** | 沉淀资产，以及 From Investment to Asset 关系链 |
| **其他** | Focus Timer、**补记时长**（不打计时器，直接填"我练了多久"）、Session 小结、照片、Calendar、Monthly Review、Life Moments、全局搜索、JSON 导入导出、PWA |

### 多币种

支持人民币 / 美元 / 欧元 / 英镑 / 日元 / 港币。**每一笔记录可以有自己的币种**
（记小荷包、理财、支出、收入、资产、课程时都能单独选），填金额时输入框的前缀
会跟着变。

**汇总时按币种分开累加，不做汇率换算** —— 总额会显示成 `¥70,140 · £120`，
而不是硬凑成一个数字。汇率会变、来源也不可靠，凑出来的总额反而失真。

收益率、时薪、占比这类**比率只在单一币种下计算**，跨币种时会显示"多币种，不折算"，
因为不同币种的金额相除没有意义。储蓄里程碑和增长曲线只能取一个币种，取金额最大的那个。

**Me → Preferences** 或 Ledger 页右上角的币种是「默认币种」，只决定新记录用什么货币，
不会改动已有记录 —— 旧数据在升级时会一次性钉上当时的默认币种。

## 云同步（可选）

默认完全离线，数据只在这台设备上。想要手机和电脑看到同一份数据，可以接自己的 Supabase：

**Me → 云同步** → 填 Project URL 和 anon public key → 用邮箱注册 → 完成。

大概十分钟，设置步骤见 [`supabase/README.md`](supabase/README.md)，SQL 脚本在 [`supabase/schema.sql`](supabase/schema.sql)。

同步规则（都在 `src/lib/sync-plan.ts`，是纯函数，有 25 条测试覆盖）：

- **删除优先**：只要存在墓碑，这条记录就是删除状态，编辑不能把它翻回来。
  个人账本里「删了又冒出来」比「离线改的那一版没了」更让人恼火，
  而且时间戳会因为时区、时钟不准而不可靠。墓碑 90 天后清理。
- 没有墓碑时，每条记录带 `updatedAt`，两边对比后**取更新的那一份**
- 时间一律按真实时刻比较，不按字符串 —— `T12:00:00` 和 `T12:00:00+00:00`
  混在一起比字符串毫无意义
- 首次在新设备上连接、且云端已有数据时，**以云端为准**——
  否则新设备刚生成的示例数据会因为时间戳更新而盖掉真实记录
- 照片存进私有存储桶，按 id 对账：本地缺就下载，云端缺就上传
- 数据权限由 Supabase 的行级权限（RLS）保证，每个账号只能读写自己的行

同步有两组测试：`pnpm test:sync`（合并规则 25 条）、
`pnpm test:db`（墓碑并发写 4 条，防止「删掉的记录又回来」）。

> anon key 是设计给客户端用的公开密钥，真正的防线是 RLS。
> 千万不要把 `service_role` key 填进应用或提交到仓库。

## 快速开始

```bash
pnpm install
pnpm dev            # 开发服务器 http://localhost:5173
pnpm build          # 多文件构建 + PWA service worker
pnpm build:single   # 单文件构建：JS/CSS/图标/示例照片内联成一个 HTML
pnpm test:sync      # 同步合并规则测试（纯逻辑，不需要网络）
pnpm test:db        # 存储层并发测试（纯逻辑，不需要网络）
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
