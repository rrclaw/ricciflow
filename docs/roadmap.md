# ricciflow 路线图

> demo（当前仓库）已交付：可玩的单机像素世界 + 全链路投研流程 + mock 数据。
> 下面是投产三阶段。原则：每一阶段结束都是一个可用的产品，不做半成品跨阶段。

## Phase 1 — 接真数据（单机可用）

把 demo 的 mock 层换成作者真实管线（或任何用户自己的数据）：

| demo 环节 | 接入目标 |
|---|---|
| 灵感流 | search_alpha hotdata API / news_radar / Substack RSS / Reddit API |
| 快研·深研对话框 | 已有 BYO-key LLM 层，扩到全组件；便宜模型跑跟踪、贵模型跑深研 |
| 提问链 | 从 AceCamp 纪要真实采集「层层深入」问题库（付费源，独立任务） |
| 知识库 | ~/knowledge 四桶 + chroma 检索；沉淀层对应 wiki/digest（与 raw ingest 天然分层） |
| 交易台 | playbookex NAV 契约（T+1 开盘建仓 / A股后复权） |
| 跟踪日报 | 定时任务（schedule routine）+ filing-keyword + news_radar 定向抓取 |
| 通知真发 | Cloudflare Worker 中继：浏览器 → Worker → 飞书 webhook / 邮件 / WhatsApp |

技术改造：数据接口层 `src/data/` 从常量变为 adapter（mock adapter / http adapter 同接口）。

## Phase 2 — 联机世界（最大的想象空间）

- 世界状态服务（每个玩家一家基金，真实入驻地图：楼层/岛屿动态分配）
- 跨玩家拜访、饭局、策略会（异步留言 + 定时撮合）
- **跨玩家挖角**：你的虚拟研究员（含其考核履历）可被其他玩家出价
- 幽灵岛开放：东京丸之内 / 首尔汝矣岛 / 硅谷 / 孟买 BKC（地理映射已预留坐标）
- 账号体系 + 云端状态同步；反滥用（研究结论的传播即市场共识形成，天然有博弈设计空间）

## Phase 3 — 三端

- PWA（已有 manifest）→ Tauri 桌面壳 → Capacitor 移动壳
- 三端共用世界状态；移动端以「老板日报 + 拍板」为主界面（走动世界降级为查看）

## 开源节奏

- 当前：本地仓库，MIT。GitHub 建仓默认 private，是否 public 由 rr 单独拍板
- public 前检查：无任何 key/token、无真实业绩数字、戏仿机构名免责声明齐全
