/* ricciflow — 组件: 档案室 ARCHIVE

   原来这一屏叫「日报」，装的却是各研究员当天的全部产出，名不副实，
   而且和老板手机那块重复了。重新分工：

     · 档案室（这里）= 全量留痕，按日期倒序，翻到任意一天看那天每个人写了什么
     · 老板手机       = 只呈现最新一天

   留痕是各策略自己落盘的文件，不是另建的记录。点开就是原文。

   当日 summary 仍然单独置顶 —— 它是那天的研判正文，不是一份普通留痕。 */

const ARCH = {idx:null, day:null, err:'', loading:false, date:''};

async function loadArchive(date, force){
  if(ARCH.loading) return !!ARCH.day;
  if(ARCH.day && ARCH.date === (date || ARCH.date) && !force) return true;
  if(!realAuthed()){ ARCH.err = '需要老板钥匙'; return false; }
  ARCH.loading = true;
  try{
    const d = await (await fetch(BRIDGE + '/api/archive' + (date ? '?date=' + date + '&' : '?') +
      'key=' + encodeURIComponent(VAULT.key), {signal:AbortSignal.timeout(30000)})).json();
    if(!d || !d.ok) throw new Error(d && d.error || '空响应');
  ARCH.day = d; ARCH.date = d.date; ARCH.err = '';
    const tb = $('#tbScene'); if(tb) tb.textContent = (d.days || []).length;
  }catch(e){ ARCH.err = String(e.message || e); ARCH.day = null; }
  finally{ ARCH.loading = false; }
  return !!ARCH.day;
}

/* 会话内发生的事仍然记在这里（搬运、抽到线索、触发任务），不预置内容 */
DATA.events = [];
function pushDaily(k, txt){
  DATA.events.unshift({k, t:new Date().toTimeString().slice(0,5), txt});
  if(PANEL_OPEN === 'archive' && RENDER.archive) RENDER.archive();
  if(typeof notifyBoss === 'function' && k === 'block') notifyBoss('里奇流资本', txt);
}
const DAILY_TAG = {track:['cyan','跟踪'], gap:['rose','缺口'], review:['gold','考核'],
  block:['gold','拦截'], intel:['cyan','情报'], sink:['gold','沉淀'], run:['cyan','任务']};

RENDER.archive = function(){
  const root = $('#scr-archive');
  if(!realAuthed()){
    root.innerHTML = `
      <div class="screen-head"><h1>档案室 · ARCHIVE</h1>
        <span class="sub">每个研究员每天写了什么，按日期归档</span></div>
      ${lockedCard('工作留痕档案', `
        这里是各策略自己落盘的全部产出，按日期倒序：锁仓 picks、当日研判、盘后复盘、
        周度评审、summary 日报、因子日报…… 有什么算什么。<br>
        留痕带标的与仓位，属于机密层。`,
        ['invest skills/&lt;策略&gt;/reports/&lt;date&gt;/',
         'invest skills/summary/reports/&lt;date&gt;/summary-*.md',
         'invest skills/Factor/output/&lt;date&gt;/'])}`;
    return;
  }
  if(!ARCH.day){
    root.innerHTML = `<div class="screen-head"><h1>档案室 · ARCHIVE</h1>
        <span class="sub">正在清点留痕…</span></div>
      ${win('读取中', `<div class="t-sm" style="font-weight:700">${
        ARCH.err ? '读不到：<span class="t-rose">' + ARCH.err + '</span>' : '正在扫各策略的 reports 目录…'}</div>`,
        {color:'ink'})}`;
    if(!ARCH.err) loadArchive().then(ok=>{ if(PANEL_OPEN === 'archive') RENDER.archive(); });
    return;
  }
  drawArchive(root);
};

function drawArchive(root){
  const A = ARCH.day;
  const B = (typeof BRIEF !== 'undefined') ? BRIEF.data : null;
  const S = B && B.summary && B.summary.ok && B.summary.date === A.date ? B.summary : null;

  /* 日期栏：一眼看出哪天干了活、哪天是空的 */
  const rail = A.days.map(d=>`
    <button class="px-btn sm ${d === A.date ? 'on' : ''}" data-arch="${d}"
      style="font-size:10px">${d.slice(5)}</button>`).join('');

  root.innerHTML = `
    <div class="screen-head">
      <h1>档案室 · ARCHIVE</h1>
      <span class="sub">${A.date}${A.is_today ? '（今天）' : ''} · ${A.n_who} 人 / ${A.n_files} 份留痕
        · 全库 ${ARCH.day.days.length} 天</span>
      <div class="tools">
        ${A.prev ? `<button class="px-btn" data-arch="${A.prev}">← ${A.prev.slice(5)}</button>` : ''}
        ${A.next ? `<button class="px-btn" data-arch="${A.next}">${A.next.slice(5)} →</button>` : ''}
        ${A.date !== A.latest ? `<button class="px-btn ghost" data-arch="${A.latest}">⏭ 回最新</button>` : ''}
      </div>
    </div>

    ${win('日期', `<div class="row wrap" style="gap:4px;max-height:78px;overflow:auto">${rail}</div>
      <div class="t-xs t-dim" style="font-weight:700;margin-top:6px">
        只列出真有留痕的日子。列表里没有的那天，就是那天谁都没落盘。</div>`,
      {color:'ink', sub:'倒序 · 点一天翻过去'})}

    <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,320px);gap:12px;align-items:start">
      <div class="col">
        ${S ? win('当日研判正文 · summary', `
            <div class="minutes" style="font-size:11px;line-height:1.9;max-height:200px;overflow:auto">${
              mdLite(S.head)}</div>
            <div class="t-xs t-dim" style="font-weight:700;margin-top:6px">${S.file}</div>`,
            {color:'pink', sub:`${S.sections.length} 节 · 原文`}) : ''}
        ${A.who.map(w=> win(w.who, w.files.map(f=>`
            <div class="gap-item" style="cursor:pointer" data-doc="${f.path}">
              <div class="gt">
                ${f.kind ? `<span class="tag">${f.kind}</span>` : ''}
                <span>${f.file}</span></div>
              <div class="why">${(f.bytes/1024).toFixed(1)} KB · 落盘 ${f.at}</div>
            </div>`).join(''),
          {color:'sky', sub:`${w.files.length} 份`})).join('')}
      </div>
      <div class="col">
        ${win('本次会话发生的事', DATA.events.length ? DATA.events.map(d=>`
            <div class="gap-item"><div class="why" style="color:var(--ink)">
              <span class="tag ${DAILY_TAG[d.k] ? DAILY_TAG[d.k][0] : ''}">${
                DAILY_TAG[d.k] ? DAILY_TAG[d.k][1] : d.k}</span>
              <span class="t-dim">${d.t}</span><br>${d.txt}</div></div>`).join('')
          : `<div class="t-xs t-dim" style="font-weight:700;line-height:1.8">
              空。搬运资料、抽到线索、触发任务都会记在这里。</div>`,
          {color:'mustard', sub:'不预置'})}
        ${B ? win('当天待办', archTodos(B), {color:'coral', sub:'手机上也是这一份'}) : ''}
      </div>
    </div>`;

  $$('[data-arch]').forEach(b=> b.onclick = ()=>{
    loadArchive(b.dataset.arch, true).then(()=> RENDER.archive());
  });
  $$('[data-doc]').forEach(b=> b.onclick = ()=> openArchiveDoc(b.dataset.doc));
  if(!BRIEF.data && typeof loadBriefing === 'function')
    loadBriefing().then(ok=>{ if(ok && PANEL_OPEN === 'archive') RENDER.archive(); });
}

/* 待办与手机共用同一份数据，不各算一套 */
function archTodos(B){
  const rq = B.review_queue || {}, pi = B.pending_ingest || {}, kf = B.kb_freshness || {},
        sp = B.suspended || {}, rb = B.riskboard || {};
  const rows = [];
  (rb.alerts || []).forEach(a=> rows.push(['风险','rose',a.txt,'trading']));
  if(kf.ok && (kf.stale_days ?? 0) > 2)
    rows.push(['断档','rose',`入库断档 ${kf.stale_days} 天（最新 ${kf.latest}）`,'rack']);
  Object.entries(rq.buckets || {}).forEach(([k,n])=> rows.push(['审阅','gold',`${k} ${n} 条`,'research']));
  if(pi.pending) rows.push(['入库','gold',`待入库 ${pi.pending} 条`,'research']);
  (sp.rows || []).forEach(x=> rows.push(['人事','gold',`${x.n} · ${x.label}`,'desk']));
  if(!rows.length) return '<div class="t-sm t-cyan" style="font-weight:700">今天没有待办。</div>';
  return rows.map(([tag,cls,txt,to])=>`
    <div class="gap-item"><div class="why" style="color:var(--ink)">
      <span class="tag ${cls}">${tag}</span> ${txt}</div>
      <button class="px-btn sm ghost" data-goto="${to}">▸ 去处理</button></div>`).join('');
}

/* 点一份留痕 → 原文。只切不改。 */
async function openArchiveDoc(rel){
  openModal(`<div class="win-bar" style="background:var(--sky)"><span>${rel.split('/').pop()}</span>
      <span class="dots" id="mClose" style="cursor:pointer">_ □ ×</span></div>
    <div style="padding:13px"><div class="t-sm">读取中…</div></div>`);
  $('#mClose').onclick = closeModal;
  let d;
  try{
    d = await (await fetch(BRIDGE + '/api/archive_read?path=' + encodeURIComponent(rel) +
      '&key=' + encodeURIComponent(VAULT.key), {signal:AbortSignal.timeout(25000)})).json();
  }catch(e){ d = {ok:false, error:String(e.message || e)}; }
  if(!d || !d.ok){
    $('#modalBox').querySelector('div:last-child').innerHTML =
      `<div class="t-sm t-rose" style="font-weight:700">${(d && d.error) || '读不到'}</div>`;
    return;
  }
  const isJson = rel.endsWith('.json') || rel.endsWith('.jsonl');
  $('#modalBox').innerHTML = `
    <div class="win-bar" style="background:var(--sky)"><span>${rel.split('/').pop()}</span>
      <span class="sub">${(d.bytes/1024).toFixed(1)} KB · 原文</span>
      <span class="dots" id="mClose2" style="cursor:pointer">_ □ ×</span></div>
    <div style="padding:13px;max-height:78vh;overflow:auto">
      <pre class="minutes" style="font-size:10.5px;white-space:pre-wrap;word-break:break-word;
        line-height:${isJson ? 1.5 : 1.85}">${
        d.text.replace(/[<>&]/g, c=> ({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]))}</pre>
      <div class="t-xs t-dim" style="font-weight:700;margin-top:8px">invest skills/${rel}</div>
    </div>`;
  $('#mClose2').onclick = closeModal;
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
