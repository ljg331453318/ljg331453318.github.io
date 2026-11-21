# 云道 · 云栖山

静态互动文化空间，部署在个人 GitHub Pages 网站的 `/cloud-dao/` 路径。

- 无需账号登录。游戏、八字研习和梅花课堂在浏览器运行，公共同游与云端进度由现有 Cloudflare Worker + D1 提供。
- Three.js 与 lunar-javascript 已随站点提供，不依赖外部 CDN。
- 本机存档键：`cloud-dao-v1`、`cloud-dao-play-v1`、`cloud-dao-study-v1`。
- 进度先从本机 localStorage / IndexedDB 备份恢复，再核对云端存档。跨浏览器恢复需下载并导入修习凭证。旧域名存档仍需先迁出。
- 出生信息与所问仅在页面内存中处理，只有明确下载的记录才会成为本地文件。
- `vendor/` 和 `knowledge/yueyuan/` 保留第三方许可、署名与资料来源。

更新时将云道源项目的 `dist/` 内容复制到本目录，不要复制 `.git`、`.openai`、登录资料或本机运行数据。提交到现有 Pages 发布分支 `main` 后等待 GitHub Pages 构建完成。

手机操作：进入云栖山后点选地标或底部活动；单指拖动环顾，双指缩放，也可以使用屏幕方向按钮。


公共庭院由 `/dao/presence` 每三秒同步位置和道号，十八秒无心跳即离线，聊天保留最近一天。独立洞天中的角色不会显示在公共庭院。在线列表最多返回六十个最近活跃会话。

云端只保存积分、参与记录、游戏进度与课程完成 ID。本机心语与出生输入不进入云端进度。匿名凭证的密钥只由浏览器持有，服务端保存 SHA-256 摘要。进度使用 revision 比较，另一页面写入后拒绝旧版本覆盖。

共享服务源码在 `counter-worker/dao.js`，数据库增量建表在 `counter-worker/dao-schema.sql`。发布前先运行 `npx wrangler d1 execute ljg-homepage-counter --remote --file=dao-schema.sql`，再运行 `npx wrangler deploy`。网站仍由 GitHub Pages 发布。
