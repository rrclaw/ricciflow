/* ricciflow — 真实数据层 REAL
   拿到老板钥匙以后，把游戏里编的研究员/薪资全部换成本机 ~/invest skills 的真账。

   替换的是数据，不是界面：名册卡、个人看板、财务处的渲染代码原样复用，
   只是数据源从 mock.js 换成 kb-bridge 的 /api/roster 与 /api/finance。
   没有钥匙（公网访客）时保持 mock，并且卡上仍旧挂「编造值」角标。 */

const REAL = {on:false, roster:null, finance:null, err:'', loading:false};

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
  DATA.researchers = ros.researchers.map(r=>{
    const eq = r.equity || {}, c = r.closed || {};
    const hitPct = c.hit_rate != null ? Math.round(c.hit_rate * 100)
                 : eq.win_rate != null ? Math.round(eq.win_rate * 100) : null;
    return {
      id:r.id, sp:REAL_SPRITE[r.id] || 'guest', n:r.n,
      proto:r.market + ' · ' + r.style,
      /* 等级 = 真实产出厚度：平仓笔数 + 在册天数，不是拍的 */
      lv: Math.max(1, Math.min(99, Math.round((c.n || 0) / 2 + (eq.n_days || 0) / 6))),
      xp: r.hp,
      adopt: eq.total_return_pct != null ? Math.round(eq.total_return_pct) : null,
      hit: hitPct, mdd: eq.max_drawdown_pct != null ? Math.round(eq.max_drawdown_pct) : null,
      love: Math.max(0, Math.min(5, Math.round(r.hp / 20))),
      adopted:(r.picks && r.picks.picks || []).length, rejected:0,
      aggr:5, indep:7, horizon:5,
      factors:(r.creed || []).map(x=> x.length > 22 ? x.slice(0, 22) + '…' : x),
      motto:r.motto,
      say:{hi:r.motto, mid:r.motto, lo:r.motto},
      gone: r.status.code === 'fired',
      real: r
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
  const hp = r.real ? r.real.hp : null; if(hp == null) return '';
  const col = hp >= 70 ? 'var(--teal)' : hp >= 40 ? 'var(--mustard)' : 'var(--coral)';
  return `<div class="row" style="gap:5px;margin:5px 0 2px">
      <span class="cap" style="min-width:34px">信任</span>
      <span class="px-bar thin" style="flex:1"><i style="width:${hp}%;background:${col}"></i></span>
      <b class="t-xs" style="min-width:24px;text-align:right">${hp}</b></div>`;
}

/* 战绩三格 —— 有账本报账本，没账本就写「无账本」，不拿别人的数字凑 */
function realStat3(r){
  const R = r.real, eq = R.equity || {}, c = R.closed || {};
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
  const c = r.real.closed || {};
  const txt = c.n ? `${c.n} 笔平仓（_PLATFORM/ledger）+ playbookex 净值`
                  : 'playbookex 净值口径，尚无已平仓回合';
  return `<span class="tag cyan" title="${txt}">实盘</span>`;
}

/* 名册卡下半段：真实考核块。替换掉那套编造的 #排名/纪律分。 */
function realReviewBlock(r){
  const R = r.real, s = R.status, eq = R.equity || {};
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
  return `<span class="demo-mark" title="${REAL.err || '插上老板钥匙后换成真实名册'}">编造值</span>`;
}
