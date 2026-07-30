/* ricciflow — MOCK 数据: 数据源/预设/优先级链（其余 DATA 分布在各组件文件）
   加载方式: 传统 <script> 顺序加载（零构建、file:// 可直开）。
   模块间通过顶层声明共享（var/function 提升到全局作用域）。 */

/* ==========================================================================
   SECTION 11 — MOCK 数据
   全部写死。源名 / 研究员 / 环节名用真实的，一眼认得出是自己的系统；
   所有数值是编的。
   ========================================================================== */
const DATA = {};

DATA.groups = [
  {k:'quote',  n:'行情 & 基础', tag:'QUOTE'},
  {k:'news',   n:'新闻 & 公告', tag:'NEWS'},
  {k:'expert', n:'专家 & 卖方', tag:'EXPERT'},
  {k:'sub',    n:'订阅 & 社群', tag:'SUBSCRIPTION'},
  {k:'free',   n:'免费公开接口', tag:'FREE / OPEN'}
];

DATA.sources = [
  /* 行情 & 基础 */
  {id:'stock_data', n:'stock_data 本地日线', g:'quote', t:'本地 CSV', freq:'T-1 收盘后', conf:5, fresh:1,  today:5218, auth:'无', bucket:'—',              on:true,  note:'后复权，A股全市场。回测唯一价格基准。'},
  {id:'akshare',    n:'akshare',             g:'quote', t:'Python 库', freq:'实时/日频', conf:4, fresh:1,  today:1140, auth:'无', bucket:'—',              on:true,  note:'大盘指数、资金流、板块。免费源，偶发字段漂移。'},
  {id:'tushare',    n:'Tushare 自建 server', g:'quote', t:'HTTP API', freq:'日频',     conf:4, fresh:1,  today:892,  auth:'API Key', bucket:'—',         on:true,  note:'必须指向自建 server，官方 URL 拒绝本账号 token。'},
  {id:'yfinance',   n:'yfinance',            g:'quote', t:'Python 库', freq:'日频',     conf:3, fresh:1,  today:430,  auth:'无', bucket:'—',              on:false, note:'美股。需代理，偶发限流。'},
  /* 新闻 & 公告 */
  {id:'cls',        n:'财联社电报',           g:'news',  t:'HTTP',     freq:'实时推流',  conf:3, fresh:0,  today:47,   auth:'Cookie', bucket:'research_assets', on:true,  note:'快，但噪声高。只做线索发现，不做结论依据。'},
  {id:'cninfo',     n:'巨潮资讯公告',         g:'news',  t:'HTTP',     freq:'盘后批量',  conf:5, fresh:1,  today:12,   auth:'无', bucket:'research_assets', on:true,  note:'一手法定披露。最高置信度，但报告日期须按次一交易日归档。'},
  {id:'filing_kw',  n:'filing-keyword 精筛', g:'news',  t:'本地管线',  freq:'盘后',     conf:5, fresh:1,  today:9,    auth:'无', bucket:'research_assets', on:true,  note:'在巨潮全量上做关键词精筛。选股用，不是避雷用。'},
  {id:'news_radar', n:'news_radar 98 站',    g:'news',  t:'爬虫池',    freq:'2h 轮询',  conf:3, fresh:0,  today:361,  auth:'无', bucket:'research_assets', on:true,  note:'零 LLM 纯规则抓取，广度换精度。'},
  /* 专家 & 卖方 */
  {id:'thirdbridge',n:'高临 Third Bridge',   g:'expert',t:'MCP',      freq:'按需',     conf:5, fresh:14, today:3,    auth:'MCP endpoint', bucket:'research_assets', on:true, locked:true, note:'专家访谈一手。付费，按需调用，外发内容永不署名。'},
  {id:'jiuqian',    n:'久谦中台',            g:'expert',t:'MCP',      freq:'按需',     conf:4, fresh:21, today:2,    auth:'MCP endpoint', bucket:'research_assets', on:true, locked:true, note:'消费/渠道调研强。外发永不露源。'},
  {id:'acecamp',    n:'AceCamp',             g:'expert',t:'MCP',      freq:'按需',     conf:4, fresh:7,  today:1,    auth:'API Key', bucket:'research_assets', on:false, locked:true, note:'100/天，按需才调。不做常驻轮询。'},
  {id:'comein',     n:'进门财经',            g:'expert',t:'MCP',      freq:'盘后',     conf:3, fresh:2,  today:26,   auth:'MCP endpoint', bucket:'research_assets', on:true, locked:true, note:'纪要/路演。内资点评与研报永不进 KB，只做线索。'},
  /* 订阅 & 社群 */
  {id:'semianalysis',n:'SemiAnalysis',       g:'sub',   t:'邮件订阅',  freq:'周更',     conf:4, fresh:5,  today:1,    auth:'Cookie', bucket:'research_assets', on:true,  note:'算力/半导体海外一手。只做内部校准，不当外发依据。'},
  {id:'zsxq',       n:'知识星球',            g:'sub',   t:'HTTP',     freq:'日更',     conf:2, fresh:1,  today:18,   auth:'Cookie', bucket:'personal_assets', on:false, note:'噪声极高。默认灰点，需二次交叉才入库。'},
  {id:'trendforce', n:'TrendForce',          g:'sub',   t:'采集器',    freq:'周更',     conf:4, fresh:4,  today:2,    auth:'无', bucket:'research_assets', on:true,  note:'存储/面板/功率器件价格。供需账本上游。'},
  {id:'substack',   n:'Substack 精选',       g:'sub',   t:'RSS',      freq:'日更',     conf:3, fresh:0,  today:8,    auth:'RSS URL', bucket:'research_assets', on:true, live:true, note:'投研 substack RSS。已预置 TMT Breakout / Doomberg / Bear Cave / MBI 四个，可增删。灵感流实时源。'},
  /* ─── 实时热点源（灵感流 realtime，真接 kb-bridge）─── */
  {id:'aihot',      n:'AI HOT 日报',         g:'sub',   t:'REST',     freq:'每日08:00', conf:3, fresh:0,  today:50,   auth:'无', bucket:'research_assets', on:true,  live:true, note:'aihot.virxact.com 今日 AI 动态 LLM 精选。灵感流实时源，真接通。'},
  {id:'polymarket', n:'Polymarket',          g:'sub',   t:'Gamma API', freq:'实时',      conf:3, fresh:0,  today:12,   auth:'无', bucket:'research_assets', on:true,  live:true, note:'预测市场 24h 成交榜。真金白银在赌什么=宏观/事件领先指标。灵感流实时源。'},
  {id:'tmtbreakout',n:'TMT Breakout',        g:'sub',   t:'RSS',      freq:'日更',     conf:4, fresh:0,  today:4,    auth:'无', bucket:'research_assets', on:true,  live:true, note:'美股科技投研前沿 substack。Morning/EOD Wrap 覆盖当日要闻。灵感流实时源。'},
  {id:'reddit',     n:'Reddit',              g:'sub',   t:'OAuth API', freq:'实时',      conf:2, fresh:0,  today:0,    auth:'OAuth key', bucket:'personal_assets', on:false, note:'散户情绪风向。免费：reddit.com/prefs/apps 建 script app 拿 client_id+secret，填这里即接通（100 QPM 免费）。'},
  {id:'epoch',      n:'Epoch AI',            g:'sub',   t:'公开CSV',   freq:'日更',     conf:5, fresh:0,  today:6,    auth:'无', bucket:'research_assets', on:true,  live:true, note:'epoch.ai 权威 AI 模型/GPU集群规模数据集（公开 CSV 适配器）。灵感流前沿模型时间线。真接通。'},
  /* ─── 免费公开接口：全部装在本机，状态不写死，「测试连接」真去拉一条最近数据 ───
     这一组的通病是「装得上不代表还活着」：证券宝可能停更、通达信免费服务器一批批
     失联、问财 token 规则常改。所以卡上的置信只反映「数据质量上限」，
     能不能用当场探。 */
  {id:'baostock',   n:'证券宝 baostock',      g:'free', t:'Python 库', freq:'日频',   conf:3, fresh:1, today:0, auth:'无（匿名登录）', bucket:'—', on:false, live:true, note:'免费 A 股日线/分钟线/财务，无需注册，本机已装 0.8.9。本机实测：baostock.com:10030 端口是开的，但 login() 一直不返回（挂死，库本身没有超时），探针只能靠外部超时判失败。想用得先解决这个握手问题。'},
  {id:'pytdx',      n:'通达信行情 pytdx',     g:'free', t:'TCP 协议',  freq:'实时',   conf:3, fresh:0, today:0, auth:'无', bucket:'—', on:true, live:true, note:'直连通达信免费行情服务器，实时五档/逐笔/K线，本机已装 1.72。本机实测通：前两台失联，第三台 180.153.18.170 活着，取回茅台与平安现价。库多年不维护，探针会逐台试并报出哪台还活着。'},
  {id:'efinance',   n:'东方财富 efinance',    g:'free', t:'HTTP',     freq:'实时/日频', conf:3, fresh:0, today:0, auth:'无', bucket:'—', on:false, live:true, note:'东财公开接口封装，A股/港股/美股/基金/ETF 全覆盖，还能取资金流与龙虎榜，本机已装 0.5.8。本机实测不通：push2his.eastmoney.com 连不上（挂代理和不挂代理都是 000），是网络可达性问题不是库的问题。'},
  {id:'pywencai',   n:'同花顺问财 pywencai',  g:'free', t:'HTTP',     freq:'实时',   conf:2, fresh:0, today:0, auth:'无（token 自动获取）', bucket:'—', on:false, live:true, note:'自然语言选股（「今日涨幅前5」直接问），summary 用它取主题热度，本机已装 0.13.1。本机实测被拦：库内部拿不到 token 直接抛 NoneType。问财反爬策略常改，这种失败是常态不是故障，噪声也高，只配做线索。'},
  {id:'arr_mcp',    n:'ARR Tracker（自建 MCP）', g:'quote', t:'MCP', freq:'日更', conf:5, fresh:0, today:7, auth:'无', bucket:'research_assets', on:true, live:true, note:'arr.polyalpha.cn/mcp — 自家的前沿实验室收入追踪器。6 个工具：公司 ARR 现值/收入密度/供需勾稽/需求二阶导/白名单序列。只读匿名，无 key。真接通。'},
  {id:'ramp',       n:'Ramp 消费数据',       g:'expert',t:'待接入',    freq:'—',        conf:4, fresh:0,  today:0,    auth:'企业账号', bucket:'research_assets', on:false, locked:true, note:'企业支付/消费 spending-side 数据。核实：无公开数据 API（ramp.com/api 404），需企业账号授权，暂无法接入。'}
];

DATA.presets = {
  semi:   {n:'半导体全家桶', ids:['stock_data','akshare','tushare','cninfo','filing_kw','thirdbridge','semianalysis','trendforce','comein']},
  ashare: {n:'A股日频最小集', ids:['stock_data','akshare','tushare','cninfo','filing_kw']},
  all:    {n:'全部拉满',     ids:DATA.sources.map(s=>s.id)}
};

DATA.prio = ['wiki','KB raw','进门财经','web'];

/* 24 小时入流（编的，但形状按真实作息：早 9 点开盘冲高、15 点盘后公告峰、23 点 nightly） */
DATA.inflow = [2,1,1,0,0,1,3,9,26,61,48,37,22,31,44,88,57,34,21,17,25,33,41,12];

DATA.recent = [
  {t:'23:14', src:'巨潮资讯公告', txt:'北方华创 · 2026 半年度业绩预告（预增 42%-58%）', bucket:'research_assets', conf:5},
  {t:'22:51', src:'SemiAnalysis', txt:'HBM4 supply digest — Samsung yield ramp slower than guided', bucket:'research_assets', conf:4},
  {t:'22:07', src:'高临 Third Bridge', txt:'专家访谈 · 光刻胶 KrF 国产验证进度（LOCK 源，外发剥名）', bucket:'research_assets', conf:5},
  {t:'21:33', src:'TrendForce', txt:'DDR5 现货 7 月第 4 周均价 +3.1% w/w', bucket:'research_assets', conf:4},
  {t:'20:45', src:'filing-keyword 精筛', txt:'命中「扩产」×9 / 「涨价」×4 / 「验证通过」×2', bucket:'research_assets', conf:5},
  {t:'19:58', src:'财联社电报', txt:'某头部 CSP 上调 2027 资本开支指引（未证实，线索级）', bucket:'research_assets', conf:3}
];

