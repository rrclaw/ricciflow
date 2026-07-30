/* ricciflow — 组件: 老板日报（咖啡机）

   rr 定的：**summary 就是日报**。所以主体是本机 summary 当日报告的原文分节，
   待办来自各账本的真实计数（审阅队列 / 待入库 / 停职名单 / 入库断档 / riskboard 告警）。

   两条纪律，写在界面上：
     1. 不拿昨天的冒充今天 —— 今天没跑就说没跑，并显示最近一期是哪天。
     2. 只切不改 —— 小节标题与正文都是原文，网站不做提炼。提炼由本地 Claude 跑。

   以前这里是 6 条写死的假事件（含假挖角 offer），已删。 */

const BRIEF = {data:null, err:'', loading:false};

async function loadBriefing(force){
  if(BRIEF.loading) return !!BRIEF.data;
  if(BRIEF.data && !force) return true;
  if(!realAuthed()){ BRIEF.err = '需要老板钥匙'; return false; }
  BRIEF.loading = true;
  try{
    const d = await (await fetch(BRIDGE + '/api/briefing?key=' + encodeURIComponent(VAULT.key),
      {signal:AbortSignal.timeout(30000)})).json();
    if(!d || !d.summary) throw new Error(d && d.error || '空响应');
    BRIEF.data = d; BRIEF.err = '';
  }catch(e){ BRIEF.err = String(e.message || e); BRIEF.data = null; }
  finally{ BRIEF.loading = false; }
  return !!BRIEF.data;
}

/* 真实事件流：组件之间互相 push 的提示（搬运、抽到线索、触发任务…）。
   不预置任何内容 —— 空就是空，不用假事件把它填满。 */
DATA.events = [];
function pushDaily(k, txt){
  DATA.events.unshift({k, t:new Date().toTimeString().slice(0,5), txt});
  if(PANEL_OPEN === 'daily' && RENDER.daily) RENDER.daily();
  if(typeof notifyBoss === 'function' && k === 'block') notifyBoss('里奇流资本', txt);
}
const DAILY_TAG = {track:['cyan','跟踪'], gap:['rose','缺口'], review:['gold','考核'],
  block:['gold','拦截'], intel:['cyan','情报'], sink:['gold','沉淀'], run:['cyan','任务']};

RENDER.daily = function(){
  const root = $('#scr-daily');
  if(!realAuthed()){
    root.innerHTML = `
      <div class="screen-head"><h1>老板日报 · DAILY BRIEF</h1>
        <span class="sub">当日 summary 报告原文 + 各账本真实待办</span></div>
      ${lockedCard('今日日报', `
        日报不是另写一份，它<b>就是</b>本机 summary 当日跑出来的那份报告，按小节原文呈现。
        待办也都是真数：审阅队列、待入库、被闸拦停的策略、入库断档天数。`,
        ['invest skills/summary/reports/&lt;date&gt;/summary-*.md',
         'knowledge/wiki/_REVIEW_QUEUE.md',
         'knowledge/wiki/_PENDING_INGEST.md'])}`;
    return;
  }
  if(!BRIEF.data){
    root.innerHTML = `<div class="screen-head"><h1>老板日报 · DAILY BRIEF</h1>
        <span class="sub">正在读 summary…</span></div>
      ${win('读取中', '<div class="t-sm" style="font-weight:700">正在读当日报告与各账本…</div>', {color:'ink'})}`;
    loadBriefing().then(ok=>{
      if(ok) return RENDER.daily();
      root.innerHTML = `
        <div class="screen-head"><h1>老板日报 · DAILY BRIEF</h1><span class="sub">读不到</span></div>
        ${win('读不到日报', `<div class="t-sm t-rose" style="font-weight:700">${BRIEF.err}</div>
          <div class="t-xs t-dim" style="font-weight:700;margin-top:8px">
            这里不会拿假内容顶替。</div>`, {color:'coral'})}`;
    });
    return;
  }
  drawBriefing(root);
};

function drawBriefing(root){
  const B = BRIEF.data, S = B.summary || {}, rq = B.review_queue || {},
        pi = B.pending_ingest || {}, kf = B.kb_freshness || {},
        ov = B.wiki_overdue || {}, sp = B.suspended || {}, rb = B.riskboard || {};

  /* 待办全部是真实计数，每条都能点到源头 */
  const todos = [];
  (rb.alerts || []).forEach(a=> todos.push({tag:'风险', cls:'rose', txt:a.txt, to:'trading'}));
  if(kf.ok && (kf.stale_days ?? 0) > 2)
    todos.push({tag:'断档', cls:'rose',
      txt:`知识库最新原始材料是 ${kf.latest}，距今 ${kf.stale_days} 天没有新入库`, to:'rack'});
  Object.entries(rq.buckets || {}).forEach(([k, n])=>
    todos.push({tag:'审阅', cls: k.indexOf('OVERTURN') >= 0 ? 'rose' : 'gold',
      txt:`${k} ${n} 条待处理`, to:'research'}));
  if(pi.ok && pi.pending)
    todos.push({tag:'入库', cls:'gold', txt:`待入库 ${pi.pending} 条（已完成 ${pi.done}）`, to:'research'});
  (sp.rows || []).forEach(s=>
    todos.push({tag:'人事', cls: s.label === '已裁员' ? 'rose' : 'gold',
      txt:`${s.n} · ${s.label} —— ${s.why}`, to:'desk'}));
  if(ov.ok && ov.n)
    todos.push({tag:'复核', cls:'gold', txt:`${ov.n} 页 wiki 复核期限已过`, to:'atlas'});

  const stale = S.ok && !S.is_today;
  root.innerHTML = `
    <div class="screen-head">
      <h1>老板日报 · DAILY BRIEF</h1>
      <span class="sub">${S.ok ? `summary ${S.date}${S.is_today ? '（今日）' : `（${S.stale_days} 天前）`}`
                               : 'summary 读不到'}</span>
      <div class="tools"><button class="px-btn" id="briefReload">↻ 重读</button></div>
    </div>
    ${stale ? `<div class="bridge" style="margin-bottom:11px;box-shadow:inset 0 0 0 3px var(--coral)">
      <b>今天还没跑 summary。</b>下面是 ${S.date} 那期的原文，<b>不是今天的</b>。
      要今天的就去终端跑 summary —— 这里不拿隔夜的冒充当日。</div>` : ''}
    <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,340px);gap:12px;align-items:start">
      <div class="col">
        ${S.ok ? win('研判正文 · 原文', `
            <div class="minutes" style="font-size:11px;line-height:1.9;max-height:220px;overflow:auto">${
              mdLite(S.head)}</div>
            <div class="t-xs t-dim" style="font-weight:700;margin-top:6px">${S.file}</div>`,
            {color:'pink', sub:`${S.sections.length} 节 · 只切不改`})
          : win('读不到 summary', `<div class="t-sm t-rose" style="font-weight:700">${S.error || ''}</div>`,
            {color:'coral'})}
        ${(S.sections || []).map(sec=> win(sec.title, `
            <div class="minutes" style="font-size:10.5px;line-height:1.9;max-height:260px;overflow:auto">${
              mdLite(sec.body)}</div>`, {color:'sky', sub:'原文'})).join('')}
      </div>
      <div class="col">
        ${win('待办 · 全是真数', todos.length ? todos.map(t=>`
            <div class="gap-item">
              <div class="why" style="color:var(--ink)">
                <span class="tag ${t.cls}">${t.tag}</span> ${t.txt}</div>
              <button class="px-btn sm ghost" data-goto="${t.to}">▸ 去处理</button>
            </div>`).join('')
          : '<div class="t-sm t-cyan" style="font-weight:700">今天没有待办。少见。</div>',
          {color:'coral', sub: todos.length + ' 条'})}
        ${win('本次会话发生的事', DATA.events.length ? DATA.events.map(d=>`
            <div class="gap-item"><div class="why" style="color:var(--ink)">
              <span class="tag ${DAILY_TAG[d.k] ? DAILY_TAG[d.k][0] : ''}">${
                DAILY_TAG[d.k] ? DAILY_TAG[d.k][1] : d.k}</span>
              <span class="t-dim">${d.t}</span><br>${d.txt}</div></div>`).join('')
          : `<div class="t-xs t-dim" style="font-weight:700;line-height:1.8">
              空。搬运资料、抽到线索、触发任务都会记在这里。<br>
              这里不预置内容 —— 空就是空。</div>`,
          {color:'mustard', sub:'不预置'})}
        ${win('账本体检', `
          <div class="row" style="justify-content:space-between"><span class="t-xs t-dim">来源注册在册</span>
            <b>${kf.total ?? '—'}</b></div>
          <div class="row" style="justify-content:space-between"><span class="t-xs t-dim">最新原始材料</span>
            <b class="${(kf.stale_days ?? 0) > 2 ? 't-rose' : ''}">${kf.latest || '—'}</b></div>
          <div class="row" style="justify-content:space-between"><span class="t-xs t-dim">wiki 页数</span>
            <b>${ov.of ?? '—'}</b></div>
          <div class="row" style="justify-content:space-between"><span class="t-xs t-dim">合并净值</span>
            <b>${(rb.nav || {}).nav ?? '—'}</b></div>`, {color:'ink'})}
      </div>
    </div>`;
  $$('[data-goto]').forEach(b=> b.onclick = ()=> openComponent(b.dataset.goto));
  const r = $('#briefReload');
  if(r) r.onclick = ()=> loadBriefing(true).then(()=> RENDER.daily());
}

/* 极简 markdown 还原：加粗 / 行内码 / 引用 / 换行。只还形状，不改一个字。 */
function mdLite(t){
  const esc = String(t || '').replace(/[<>&]/g, c=> ({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]));
  return esc
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^&gt;\s?(.*)$/gm, '<span class="t-dim">$1</span>')
    .replace(/\n/g, '<br>');
}
