/* ricciflow — 真实数据层 REAL
   拿到老板钥匙以后，把游戏里编的研究员/薪资全部换成本机 ~/invest skills 的真账。

   替换的是数据，不是界面：名册卡、个人看板、财务处的渲染代码原样复用，
   只是数据源从 mock.js 换成 kb-bridge 的 /api/roster 与 /api/finance。
   没有钥匙的访客走**公开层**：wiki 图谱、信源分布、名册身份与公开信条都是真的，
   只有持仓/净值/薪资/原文上锁。整站不留一个写死的假数字。 */

const REAL = {on:false, roster:null, finance:null, err:'', loading:false,
              pub:false, pubErr:''};

/* 公开层：不需要钥匙也能拿到的真实数据。开局就拉，拉到什么算什么。
   拉不到（桥没跑）就让组件显示「桥未运行」，绝不回落到写死的假数据。 */
async function loadPublic(){
  try{
    const [w, s, r] = await Promise.all([
      fetch(BRIDGE + '/api/wiki', {signal:AbortSignal.timeout(20000)}).then(x=>x.json()),
      fetch(BRIDGE + '/api/srcreg', {signal:AbortSignal.timeout(20000)}).then(x=>x.json()),
      fetch(BRIDGE + '/api/roster_public', {signal:AbortSignal.timeout(20000)}).then(x=>x.json())
    ]);
    if(w && w.pages){ REAL.kb = w; applyRealAtlas(w); }
    if(s && s.ok) REAL.srcreg = s;
    if(r && r.researchers) applyRealRoster(r);
    REAL.pub = !!(w && w.pages);
    REAL.pubErr = REAL.pub ? '' : '桥没返回 wiki';
  }catch(e){
    REAL.pub = false; REAL.pubErr = String(e.message || e);
  }
  return REAL.pub;
}

/* 真实策略 → 画面里已有的像素小人。按市场/风格挑一个像的，纯外观。 */
const REAL_SPRITE = {
  brownsugar:'growth', serenity:'serenity', usrocket:'tech', goldpool:'growth',
  wufu:'oldmoney', wavehunter:'tech', hedgepair:'quant', fattail:'oldmoney',
  smartmoney1:'macro', smartmoney2:'growth', factor:'quant', filing:'consume',
  news_radar:'macro', summary:'macro', bottom_mining:'consume', annealing:'quant'
};
/* 状态 → 角标颜色。裁员/停职是真的，不是剧情。 */
const REAL_STATUS_TAG = {
  fired:'rose', suspended:'rose', pip:'rose', watch:'gold',
  dormant:'', nobook:'', active:'cyan'
};

function realAuthed(){ return typeof VAULT !== 'undefined' && !!VAULT.key; }

async function loadReal(force){
  if(REAL.loading) return REAL.on;
  if(REAL.on && !force) return true;
  if(!realAuthed()){ REAL.err = '需要老板钥匙'; return false; }
  REAL.loading = true;
  const k = encodeURIComponent(VAULT.key);
  try{
    const [ros, fin] = await Promise.all([
      fetch(BRIDGE + '/api/roster?key=' + k, {signal:AbortSignal.timeout(30000)}).then(r=>r.json()),
      fetch(BRIDGE + '/api/finance?key=' + k, {signal:AbortSignal.timeout(30000)}).then(r=>r.json())
    ]);
    if(!ros || !ros.researchers) throw new Error(ros && ros.error || '名册为空');
    REAL.roster = ros; REAL.finance = fin; REAL.err = '';
    applyRealRoster(ros);
    REAL.on = true;
    await loadRealKB(force);       /* 知识库与数据源一起换真，失败不影响名册 */
  }catch(e){
    REAL.err = String(e.message || e);
    REAL.on = false;
  }finally{
    REAL.loading = false;
  }
  return REAL.on;
}

/* 把真名册灌进 DATA.researchers —— 保持既有字段形状，界面代码不用改。 */
function applyRealRoster(ros){
  const pub = !!(ros.researchers[0] && ros.researchers[0].public);
  DATA.researchers = ros.researchers.map(r=>{
    const eq = r.equity || {}, c = r.closed || {};
    const hitPct = c.hit_rate != null ? Math.round(c.hit_rate * 100)
                 : eq.win_rate != null ? Math.round(eq.win_rate * 100) : null;
    return {
      id:r.id, sp:REAL_SPRITE[r.id] || 'guest', n:r.n,
      proto:r.market + ' · ' + r.style,
      /* 等级 = 真实产出厚度：平仓笔数 + 在册天数，不是拍的 */
      lv: pub ? null : Math.max(1, Math.min(99, Math.round((c.n || 0) / 2 + (eq.n_days || 0) / 6))),
      xp: r.hp ?? null,
      adopt: eq.total_return_pct != null ? Math.round(eq.total_return_pct) : null,
      hit: hitPct, mdd: eq.max_drawdown_pct != null ? Math.round(eq.max_drawdown_pct) : null,
      love: Math.max(0, Math.min(5, Math.round(r.hp / 20))),
      adopted:(r.picks && r.picks.picks || []).length, rejected:0,
      aggr:5, indep:7, horizon:5,
      factors:(r.creed || []).map(x=> x.length > 22 ? x.slice(0, 22) + '…' : x),
      motto:r.motto,
      say:{hi:r.motto, mid:r.motto, lo:r.motto},
      gone: r.status.code === 'fired',
      pub, real: r
    };
  });
  DATA.reviews = {};
  DATA.reports = {};
  DATA.trades  = {};
  ros.researchers.forEach(r=>{
    const c = r.closed || {}, eq = r.equity || {};
    DATA.reviews[r.id] = {
      hit: c.hit_rate != null ? Math.round(c.hit_rate * 100) : (eq.win_rate != null ? Math.round(eq.win_rate*100) : null),
      contrib: c.sum_pnl_pct != null ? Math.round(c.sum_pnl_pct) : null,
      disc: r.hp, rank: null, pip: ['pip','watch','suspended'].includes(r.status.code),
      status: r.status.label
    };
    /* 历史报告 = 真实落盘的那一期文件清单 */
    DATA.reports[r.id] = (r.report && r.report.files || [])
      .filter(f=> /\.(md|json)$/.test(f)).slice(0, 8)
      .map(f=> ({t:r.report.date, title:f, score:null, tag:'落盘产物'}));
    /* 买卖建议时间轴 = 真实平仓回合，退出理由是原文 */
    DATA.trades[r.id] = (r.trades || []).map(t=>({
      t: t.exit_date || t.entry_date, side: (t.realized_pnl_pct || 0) >= 0 ? 'buy' : 'sell',
      act: `${t.name || t.ticker} ${t.weight ? (t.weight*100).toFixed(1)+'%' : ''}`,
      why: `${t.entry_date} 建仓 → ${t.exit_date} 平仓，持有 ${t.hold_days ?? '—'} 天`,
      st: (t.realized_pnl_pct >= 0 ? '+' : '') + (t.realized_pnl_pct ?? '—') + '% · ' + (t.exit_rule_id || '')
    }));
  });
}

/* 名册顶部的真实擂台条：谁在合格池、谁在观察、谁被裁 */
function realBoardHTML(){
  const R = REAL.roster, b = R.board || {};
  const byCode = {};
  R.researchers.forEach(r=> (byCode[r.status.code] = byCode[r.status.code] || []).push(r.n));
  const chip = (label, arr, cls)=> arr && arr.length
    ? `<span class="tag ${cls}" title="${arr.join('、')}">${label} ${arr.length}</span>` : '';
  return win('研究部现状', `<div class="row wrap" style="gap:6px">
      <span class="tag gold" title="${(b.eligible||[]).join('、')}">PK 合格池 ${(b.eligible||[]).length}</span>
      ${chip('在岗', byCode.active, 'cyan')}
      ${chip('观察期', byCode.watch, 'gold')}
      ${chip('停职', byCode.suspended, 'rose')}
      ${chip('绩效改进', byCode.pip, 'rose')}
      ${chip('休眠', byCode.dormant, '')}
      ${chip('无组合', byCode.nobook, '')}
      ${chip('已裁员', byCode.fired, 'rose')}
      <span class="sp"></span>
      <span class="t-xs t-dim" style="font-weight:700">状态由三种真闸决定：verdict_gate / sunset / 长期无产出</span>
    </div>`, {color:'ink', sub:'鼠标悬停看都有谁'});
}

/* 名册卡上的真实状态角标 —— 该标裁员就标裁员 */
function realStatusHTML(r){
  const s = r.real && r.real.status; if(!s) return '';
  const c = REAL_STATUS_TAG[s.code] || '';
  return `<span class="tag ${c}" title="${String(s.why||'').replace(/"/g,'&quot;')}">${s.label}</span>`;
}
/* 信任度血条 —— 数值由 real.py 的公式算出，鼠标悬停能看到扣分理由 */
function realHpHTML(r){
  const hp = r.real ? r.real.hp : null;
  if(hp == null) return r.real && r.real.public
    ? '<div class="t-xs t-dim" style="font-weight:700;margin:5px 0 2px">🔒 信任度需要钥匙</div>' : '';
  const col = hp >= 70 ? 'var(--teal)' : hp >= 40 ? 'var(--mustard)' : 'var(--coral)';
  return `<div class="row" style="gap:5px;margin:5px 0 2px">
      <span class="cap" style="min-width:34px">信任</span>
      <span class="px-bar thin" style="flex:1"><i style="width:${hp}%;background:${col}"></i></span>
      <b class="t-xs" style="min-width:24px;text-align:right">${hp}</b></div>`;
}

/* 战绩三格 —— 有账本报账本，没账本就写「无账本」，不拿别人的数字凑 */
function realStat3(r){
  const R = r.real, eq = R.equity || {}, c = R.closed || {};
  if(R.public){
    return `<div class="stat3"><div style="grid-column:1/-1">
      <div class="k">战绩</div>
      <div class="v t-dim" style="font-size:12px">🔒 净值与平仓统计需要老板钥匙</div></div></div>`;
  }
  const pct = v=> v == null ? '—' : (v > 0 ? '+' : '') + (+v).toFixed(1) + '%';
  const cls = v=> v == null ? '' : v >= 0 ? 't-cyan' : 't-rose';
  if(R.status.code === 'nobook'){
    return `<div class="stat3"><div style="grid-column:1/-1">
      <div class="k">组合战绩</div>
      <div class="v t-dim" style="font-size:12px">无账本 · 只产信号与报告</div></div></div>`;
  }
  return `<div class="stat3">
    <div title="${eq.start_date||''} 起，${eq.n_days||0} 个交易日"><div class="k">组合净值</div>
      <div class="v ${eq.current_nav >= 1 ? 't-cyan' : 't-rose'}">${eq.current_nav != null ? eq.current_nav.toFixed(3) : '—'}</div></div>
    <div title="${c.n ? c.n + ' 笔已平仓，累计 ' + pct(c.sum_pnl_pct) : '尚无已平仓记录'}"><div class="k">${c.n ? '平仓命中' : '持仓胜率'}</div>
      <div class="v">${(c.hit_rate != null ? Math.round(c.hit_rate*100) : (eq.win_rate != null ? Math.round(eq.win_rate*100) : null)) ?? '—'}%</div></div>
    <div><div class="k">最大回撤</div>
      <div class="v ${cls(eq.max_drawdown_pct)}">${pct(eq.max_drawdown_pct)}</div></div>
  </div>`;
}
/* 数据出处角标：告诉你这三个数是从哪个账本读出来的 */
function realStatSrc(r){
  if(r.real.public) return '<span class="tag" title="公开层：只有身份与公开信条">公开层</span>';
  const c = r.real.closed || {};
  const txt = c.n ? `${c.n} 笔平仓（_PLATFORM/ledger）+ playbookex 净值`
                  : 'playbookex 净值口径，尚无已平仓回合';
  return `<span class="tag cyan" title="${txt}">实盘</span>`;
}

/* 名册卡下半段：真实考核块。替换掉那套编造的 #排名/纪律分。 */
function realReviewBlock(r){
  const R = r.real, s = R.status, eq = R.equity || {};
  if(R.public) return `
    <div style="border-top:3px dashed var(--ink);margin-top:8px;padding-top:7px">
      <div class="row" style="gap:4px"><span class="cap">状态</span>
        <span class="tag ${REAL_STATUS_TAG[s.code] || ''}">${s.label}</span>
        <span class="sp"></span>
        <span class="t-xs t-dim" style="font-weight:700">🔒 战绩与产出需要钥匙</span></div>
    </div>`;
  const why = String(s.why || '').replace(/"/g, '&quot;');
  const ser = (eq.series || []).map(p=> p.nav * 100);
  return `
  <div style="border-top:3px dashed var(--ink);margin-top:8px;padding-top:7px">
    <div class="row" style="gap:4px;flex-wrap:wrap">
      <span class="cap">状态</span>
      <span class="tag ${REAL_STATUS_TAG[s.code] || ''}" title="${why}">${s.label}</span>
      ${R.closed && R.closed.eligible ? '<span class="tag gold" title="PK 合格池">合格池</span>' : ''}
      <span class="sp"></span>
      <span class="t-xs t-dim" style="font-weight:700">${R.report.date || '无产出'}</span>
    </div>
    <div class="t-xs t-dim" style="font-weight:700;margin-top:4px;line-height:1.6">${s.why || ''}</div>
    ${ser.length > 2 && typeof sparkHTML === 'function'
      ? `<div style="margin:6px 0">${sparkHTML(ser, 250, 34,
          (eq.total_return_pct || 0) < 0 ? 'var(--coral)' : 'var(--teal)')}</div>` : ''}
    <div class="row" style="gap:4px">
      <button class="px-btn sm ghost" data-realdir="${r.id}">看它的目录</button>
    </div>
  </div>`;
}

/* 「最近一期怎么说」= 真实 picks 的理由原文，没开仓就说没开仓 */
function realSayHTML(r){
  if(r.real.public) return `${r.real.motto}
    <span class="t-dim" style="font-weight:400"> —— 引自 ${r.real.src}</span>`;
  const p = r.real.picks || {}, list = p.picks || [];
  if(list.length){
    const top = list[0];
    return `<b>${top.name || top.ticker}</b>${top.weight ? ' ' + (top.weight*100).toFixed(1) + '%' : ''}
      ${list.length > 1 ? `<span class="t-dim">等 ${list.length} 只</span>` : ''}
      ${top.why ? '<br>' + top.why : ''}
      <span class="t-dim" style="font-weight:400"> —— ${p.date}</span>`;
  }
  if(p.nofile){
    return `这一期目录里没有 picks 文件。<span class="t-dim" style="font-weight:400">
      落盘的是 ${(p.files || []).slice(0, 3).join('、') || '别的产物'} —— 说明那天跑的不是选股腿。</span>`;
  }
  return `这一期没开仓。<span class="t-dim" style="font-weight:400">${p.note
    ? p.note.slice(0, 90) : '空仓在这套体系里是合法答案。'}</span>`;
}

/* 个人看板 · 真实组合：净值曲线取 playbookex 的 equity 序列，不是随机漫步 */
function realPortfolioHTML(r){
  const R = r.real, eq = R.equity || {}, c = R.closed || {};
  if(R.status.code === 'nobook'){
    return win('没有组合', `<div class="t-sm" style="font-weight:700;line-height:1.8">
      ${R.n} 只产信号和报告，不建仓、不锁 picks，所以没有净值可考。<br>
      <span class="t-dim">它是别人的输入。考核它要看产出是否按时、口径是否稳定，不是看收益率。</span></div>`,
      {color:'ink'});
  }
  if(eq.current_nav == null){
    return win('组合', `<div class="t-sm" style="font-weight:700;line-height:1.8">
      playbookex 上还没有这套策略的净值序列。<br>
      <span class="t-dim">${R.status.why || ''}</span></div>`, {color:'ink'});
  }
  const ser = (eq.series || []).map(p=> p.nav * 100);
  const pct = v=> v == null ? '—' : (v > 0 ? '+' : '') + (+v).toFixed(2) + '%';
  const bad = eq.total_return_pct < 0;
  return win('真实组合净值', `
    <div class="row"><span class="cap">${eq.start_date} 起 · ${eq.n_days} 个交易日</span>
      <span class="tag cyan" title="口径来自 rr.playbookex.com，本地 nav_ledger 已判死">playbookex</span>
      <span class="sp"></span><b style="font-size:15px" class="${bad?'t-rose':'t-cyan'}">${eq.current_nav.toFixed(4)}</b></div>
    ${ser.length > 2 && typeof sparkHTML === 'function'
      ? `<div style="margin-top:8px">${sparkHTML(ser, 560, 96, bad ? 'var(--coral)' : 'var(--teal)')}</div>`
      : '<div class="t-xs t-dim" style="font-weight:700;margin-top:6px">序列点太少，画不出曲线</div>'}
    <div class="stat3" style="margin-top:9px">
      <div><div class="k">累计</div><div class="v ${bad?'t-rose':'t-cyan'}">${pct(eq.total_return_pct)}</div></div>
      <div><div class="k">最大回撤</div><div class="v t-rose">${pct(eq.max_drawdown_pct)}</div></div>
      <div><div class="k">持仓胜率</div><div class="v">${eq.win_rate != null ? Math.round(eq.win_rate*100)+'%' : '—'}</div></div>
    </div>
    ${c.n ? `<div class="bridge" style="margin-top:9px">
      已平仓 <b>${c.n}</b> 笔 · 命中 <b>${Math.round((c.hit_rate||0)*100)}%</b> ·
      累计 <b class="${c.sum_pnl_pct>=0?'t-cyan':'t-rose'}">${pct(c.sum_pnl_pct)}</b> ·
      最差一笔 ${pct(c.worst_pct)}${c.eligible === false ? ' · <span class="t-rose">未进 PK 合格池</span>' : ''}</div>` : ''}
    <div class="t-xs t-dim" style="font-weight:700;margin-top:7px;line-height:1.7">
      净值口径 = 锁仓 picks 按真实权重跟踪。平仓统计口径 = _PLATFORM 平仓账本，两者不是同一件事，
      所以「净值涨」和「平仓亏」可以同时成立。</div>`,
    {color: bad ? 'coral' : 'teal', sub:'真实跟踪，不是纸面模拟'});
}

/* 个人看板 · 最新一期真实建议 */
function realPicksHTML(r){
  const p = r.real.picks || {};
  const list = p.picks || [];
  return win('最新一期投资建议', list.length ? list.map(x=>`
      <div class="gap-item">
        <div class="gt"><span class="tag ${x.weight ? 'gold' : ''}">${x.weight ? (x.weight*100).toFixed(1)+'%' : '—'}</span>
          <span><b>${x.name || x.ticker}</b> <span class="t-dim">${x.ticker}</span></span></div>
        ${x.why ? `<div class="why">${x.why}</div>` : ''}
      </div>`).join('')
    : `<div class="t-sm" style="font-weight:700;line-height:1.8">${p.nofile
       ? '这一期目录里没有 picks 文件，跑的不是选股腿。' : '这一期没开仓。'}
       ${p.note ? `<br><span class="t-dim">理由（原文）：${p.note}</span>` : ''}
       <br><span class="t-xs t-dim">空仓在这套体系里是合法答案，不算失职。</span></div>`,
    {color:'mustard', sub:`${p.date || '—'}${p.regime ? ' · 环境 ' + p.regime : ''}${p.file ? ' · ' + p.file : ''}`});
}

/* 公网/无钥匙时的提示条，明说现在看到的是哪一种数据 */
function realBanner(){
  if(REAL.on){
    const r = REAL.roster;
    return `<span class="tag cyan" title="数据来自本机 ~/invest skills 与 rr.playbookex.com">实盘账本 · ${r.n} 名 · ${r.as_of}</span>`;
  }
  return `<span class="tag" title="身份与信条是真的；净值、平仓、薪资需要老板钥匙">公开层 · 数字已上锁</span>`;
}

/* ==========================================================================
   真实知识库：613 页 wiki 变成 ATLAS 的节点，1887 条缺口变成缺口提示，
   8552 条来源注册变成数据源机架的库存与时效。
   节点的 docs / fresh 不是编的：docs = sources.jsonl 里标到这个行业头上的原始
   材料份数，fresh = 最近一份距今天数。页面在但 docs=0 的，本身就是真实缺口。
   ========================================================================== */
REAL.kb = null; REAL.srcreg = null;

async function loadRealKB(force){
  if(REAL.kb && !force) return true;
  if(!realAuthed()) { REAL.err = '需要老板钥匙'; return false; }
  const k = encodeURIComponent(VAULT.key);
  try{
    const [w, s] = await Promise.all([
      fetch(BRIDGE + '/api/wiki?key=' + k, {signal:AbortSignal.timeout(30000)}).then(r=>r.json()),
      fetch(BRIDGE + '/api/srcreg?key=' + k, {signal:AbortSignal.timeout(30000)}).then(r=>r.json())
    ]);
    if(!w || !w.pages) throw new Error(w && w.error || 'wiki 为空');
    REAL.kb = w; REAL.srcreg = s && s.ok ? s : null;
    applyRealAtlas(w);
    return true;
  }catch(e){ REAL.err = String(e.message || e); return false; }
}

/* 行业页 → ATLAS 节点。个股页不上图（488 个点会糊成一片），
   但它们的 belongs_to 用来还原「按公司」维度的真实归属。 */
function applyRealAtlas(w){
  const ind = w.pages.filter(p=> p.kind === 'industry');
  const byslug = {};
  DATA.atlas = ind.map((p, i)=>{
    const id = 'w_' + p.slug;
    byslug[p.slug] = id;
    const seg = (p.sector || '').split(/\s*[-/]\s*/).filter(Boolean);
    return {
      id, slug:p.slug, kind:'industry', domain:p.domain || '未分类',
      layer: seg[1] || seg[0] || '—', name:p.title || p.slug,
      docs:p.docs || 0, conf:p.conf || 0, fresh:p.fresh ?? 999,
      sources:[], edges:[], validated:p.gaps || 0,
      stance:p.stance, cycle:p.cycle, updated:p.updated, gaps:p.gaps || 0,
      themes:p.themes || []
    };
  });
  /* 真实连边：wiki frontmatter 里的 upstream/downstream/competitors… */
  const idx = {}; DATA.atlas.forEach(n=> idx[n.id] = n);
  ind.forEach(p=>{
    const n = idx['w_' + p.slug]; if(!n) return;
    Object.values(p.edges || {}).flat().forEach(t=>{
      const tid = byslug[t];
      if(tid && tid !== n.id && !n.edges.includes(tid)) n.edges.push(tid);
    });
  });
  /* 按公司维度：从个股页的 belongs_to 反查它挂在哪些行业下 */
  const co = {};
  w.pages.filter(p=> p.kind === 'stock').forEach(p=>{
    const list = (p.edges && p.edges.belongs_to || []).map(s=> byslug[s]).filter(Boolean);
    if(list.length) co[p.title.split(' ')[0] || p.slug] = list.map(id=> idx[id].name);
  });
  const keep = Object.entries(co).sort((a,b)=> b[1].length - a[1].length).slice(0, 8);
  if(keep.length){
    Object.keys(COMPANY_MAP).forEach(k=> delete COMPANY_MAP[k]);
    keep.forEach(([k, v])=> COMPANY_MAP[k] = v);
    ATLAS_CO = keep[0][0];
  }
}

/* 机密 wiki 原文阅读器 —— 有钥匙才到得了这里。整页原文 + 该页的真实缺口。 */
async function openWikiPage(slug){
  if(!realAuthed()) return toast('要老板钥匙才看得到原文');
  openModal(`<div class="win-bar" style="background:var(--sky)"><span>${slug}</span>
      <span class="dots" id="mClose" style="cursor:pointer">_ □ ×</span></div>
    <div style="padding:13px"><div class="t-sm">读取中…</div></div>`);
  $('#mClose').onclick = closeModal;
  let d;
  try{
    d = await (await fetch(BRIDGE + '/api/wiki_page?slug=' + encodeURIComponent(slug)
      + '&key=' + encodeURIComponent(VAULT.key), {signal:AbortSignal.timeout(25000)})).json();
  }catch(e){ d = {ok:false, error:String(e.message || e)}; }
  if(!d || !d.ok){
    $('#modalBox').querySelector('div:last-child').innerHTML =
      `<div class="t-sm t-rose">读不到：${(d && d.error) || '未知错误'}</div>`;
    return;
  }
  const fm = d.fm || {};
  const gapRow = g=> `<div class="gap-item">
      <div class="gt"><span class="tag ${g.type === '🔴' ? 'rose' : g.type === '🟠' ? 'gold' : ''}">${g.type || ''} ${g.type_name || ''}</span>
        <span>${g.title || ''}</span></div>
      ${g.first_hand ? `<div class="why"><b>一手</b> ${g.first_hand}</div>` : ''}
      ${g.market_view ? `<div class="why"><b>市场</b> ${g.market_view}</div>` : ''}
      ${g.investment ? `<div class="why t-cyan"><b>怎么用</b> ${g.investment}</div>` : ''}
      <div class="why t-dim">${g.as_of || ''} · 强度 ${g.strength ?? '—'} · 把握 ${g.conviction || '—'}</div>
    </div>`;
  $('#modalBox').innerHTML = `
    <div class="win-bar" style="background:var(--sky)">
      <span>${fm.industry || fm.company || slug}</span>
      <span class="sub">${d.kind === 'industry' ? '行业页' : '个股页'} · ${(d.bytes/1024).toFixed(0)} KB</span>
      <span class="dots" id="mClose2" style="cursor:pointer">_ □ ×</span></div>
    <div style="padding:13px;max-height:74vh;overflow:auto">
      <div class="row wrap" style="margin-bottom:9px">
        ${fm.stance ? `<span class="tag ${fm.stance==='bullish'?'cyan':fm.stance==='bearish'?'rose':''}">${fm.stance}</span>` : ''}
        ${fm.cycle_stage_code ? `<span class="tag">${fm.cycle_stage_code}</span>` : ''}
        ${fm.market ? `<span class="tag">${fm.market}</span>` : ''}
        ${fm.updated ? `<span class="t-xs t-dim" style="font-weight:700">更新 ${String(fm.updated).slice(0,10)}</span>` : ''}
        ${fm.review_by ? `<span class="t-xs t-dim" style="font-weight:700">复核期限 ${fm.review_by}</span>` : ''}
        <span class="sp"></span>
        <span class="tag rose" title="本机文件，公网看不到">机密 · 仅本机</span>
      </div>
      ${(d.gaps || []).length ? `<div class="cap" style="margin:4px 0 6px">这一页的真实缺口（${d.gaps.length}）</div>
        ${d.gaps.slice(0, 12).map(gapRow).join('')}` : ''}
      <div class="cap" style="margin:12px 0 6px">wiki 原文</div>
      <pre class="minutes" style="font-size:10.5px;white-space:pre-wrap;word-break:break-word;line-height:1.75">${
        d.content.slice(0, 60000).replace(/[<>&]/g, c=> ({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]))}</pre>
      <div class="t-xs t-dim" style="font-weight:700;margin-top:8px">${d.file}</div>
    </div>`;
  $('#mClose2').onclick = closeModal;
}

/* 数据源机架下半屏的真实版：入库日线 + 信源分布。
   这里的每个数都能在 ~/knowledge/index/sources.jsonl 里数出来。 */
function realSrcRegHTML(){
  const S = REAL.srcreg;
  const days = (S.recent_days || []).slice(0, 30).reverse();
  const max = Math.max(1, ...days.map(d=> d.n));
  const bars = days.map(d=>`<div title="${d.date} — ${d.n} 份" style="flex:1;height:${Math.max(3, d.n/max*80)}px;
      background:${d.n >= max*0.6 ? 'var(--mustard)' : 'var(--sky)'};
      box-shadow:inset 0 0 0 2px var(--ink);
      background-image:repeating-linear-gradient(0deg,transparent 0 4px,rgba(63,43,35,.28) 4px 6px)"></div>`).join('');
  const chans = (S.channels || []).filter(c=> c.channel !== '_by_date').slice(0, 10);
  const maxc = Math.max(1, ...chans.map(c=> c.n));
  const gradeRow = Object.entries(S.grades || {}).sort((a,b)=> b[1]-a[1])
    .map(([g, n])=> `<span class="tag ${g==='A'?'gold':g==='B'?'cyan':''}" title="${g} 级 ${n} 份">${g} ${n}</span>`).join(' ');
  /* 断档要明说：最新一份材料到今天隔了几天 */
  const gapDays = Math.round((Date.now() - new Date(S.latest + 'T00:00:00').getTime()) / 86400000);
  return `
    ${win('真实入库日线 · 最近 30 个有入库的日子', `
      <div style="display:flex;align-items:flex-end;gap:2px;height:80px">${bars}</div>
      <div class="row t-xs t-dim" style="margin-top:5px;font-weight:700">
        <span>${days[0] ? days[0].date : ''}</span><span class="sp"></span>
        <span>${days.length ? days[days.length-1].date : ''}</span></div>
      <div class="bridge" style="margin-top:9px">
        最新一份原始材料是 <b>${S.latest}</b>${gapDays > 2
          ? ` —— 距今 <b class="t-rose">${gapDays} 天</b>，入库已经断档，图上最后几根柱子的空缺不是没画，是真没有。`
          : '，入库正常。'}</div>`,
      {color:'sky', sub:`累计 ${S.total.toLocaleString()} 份`})}
    ${win('真实信源分布', chans.map(c=>`
      <div class="cover-meter" style="grid-template-columns:132px 1fr 52px">
        <span style="font-size:11px">${c.label}</span>
        <span class="px-bar thin"><i style="width:${Math.max(2, c.n/maxc*100)}%;background:var(--${
          c.bucket==='expert'?'teal':c.bucket==='broker'?'coral':'sky'})"></i></span>
        <span style="text-align:right">${c.n}</span></div>`).join('') + `
      <div class="row wrap" style="margin-top:9px;gap:4px">
        <span class="cap">置信分级</span>${gradeRow}</div>
      <div class="t-xs t-dim" style="font-weight:700;margin-top:7px;line-height:1.7">
        另有 ${((S.channels||[]).find(c=> c.channel === '_by_date') || {}).n || 0} 份是早期按日期批量入的，
        没有 channel 标注 —— 不冒充成某个具体信源，单列。</div>`,
      {color:'pink', sub:'来自 index/sources.jsonl'})}`;
}

/* 卡带上的条数：能在注册表里对上号的报真数，对不上的就报「未留痕」。
   本地行情源（stock_data/akshare/tushare）根本不进知识库，它们没有条数不是故障。 */
const REAL_SRC_CHANNELS = {
  acecamp:     ['Expert_Acecamp', 'Analyst_Acecamp', 'acecamp', 'expert_acecamp', 'analyst_acecamp'],
  thirdbridge: ['Expert_ThirdBridge', 'expert_thirdbridge'],
  comein:      ['Analyst_Market', 'analyst_market'],
  cls:         ['media_news'],
  cninfo:      ['filing'],
};
function realSrcCount(id){
  if(!(typeof REAL !== 'undefined' && REAL.srcreg)) return null;
  const want = REAL_SRC_CHANNELS[id];
  if(!want) return {n:null, why:'这个源不入知识库（或入库时没留 channel 标注），注册表里查不到它'};
  const n = (REAL.srcreg.channels || [])
    .filter(c=> want.includes(c.channel)).reduce((a, c)=> a + c.n, 0);
  return {n, why:`sources.jsonl 里 channel ∈ {${want.join(', ')}} 的累计条数`};
}
function realCartMeta(s){
  const r = realSrcCount(s.id);
  if(!r) return `<span>今日 <b class="t-gold">${s.today}</b> 条</span>`;
  /* 实时源不进知识库是设计，不是缺陷 —— 它们的真数在上游，测一次连接就现出来 */
  if(s.live) return s._live
    ? `<span title="上一次真实拉取">上游 <b class="t-gold">${s._live}</b> 条</span>`
    : '<span class="t-cyan" title="不入知识库，数在上游。点开卡带测试连接可现拉">实时源 · 可现拉</span>';
  if(r.n == null) return `<span class="t-dim" title="${r.why}">未留痕</span>`;
  return `<span title="${r.why}">在册 <b class="t-gold">${r.n.toLocaleString()}</b> 份</span>`;
}
