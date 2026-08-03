/* ricciflow — 组件: 研究台 THE OFFICE DESK
   灵感流 + 投稿箱 + 六阶段流水线 + 票工作台（金样例×2）。
   全链路：灵感 → 初筛 → 快研 → 深研 → 决策 → 跟踪 */

/* ==========================================================================
   数据
   ========================================================================== */
/* DATA.ideas（5 条写死的假灵感）已删。灵感流走 insight.js 的真实实时源。 */
const STAGES = ['灵感','初筛','快研','深研','决策','跟踪'];

/* 这里以前写死了 9 张假票。已删。
   流水线现在是真实课题的生命周期，六段各自对应一批真在办的事：
     初筛 = 待人审的新信念 · 快研 = 还没消化的原始材料 · 深研 = 未人审信念 + 🔴三方背离
     决策 = 今天各策略真锁的仓 · 跟踪 = 在仓标的 + 等新证据的陈旧信念
   由 /api/pipeline 灌入（需老板钥匙，票面含标的与观点）。 */
DATA.tickets = [];
const PIPE = {data:null, err:'', loading:false};

async function loadPipeline(force){
  if(PIPE.loading) return !!PIPE.data;
  if(PIPE.data && !force) return true;
  if(!realAuthed()){ PIPE.err = '需要老板钥匙'; return false; }
  PIPE.loading = true;
  try{
    const d = await (await fetch(BRIDGE + '/api/pipeline?key=' + encodeURIComponent(VAULT.key),
      {signal:AbortSignal.timeout(40000)})).json();
    if(!d || !d.ok) throw new Error(d && d.error || '空响应');
    PIPE.data = d; PIPE.err = '';
  }catch(e){ PIPE.err = String(e.message || e); PIPE.data = null; }
  finally{ PIPE.loading = false; }
  return !!PIPE.data;
}

DATA.clues = [];        /* 线索池 */
DATA.rejects = [];      /* 弃票堆 */

/* 金样例1：深研对话剧本（有 LLM key 时可切实时，见 provider.js） */
/* 这里以前有：深研对话剧本、四层追问链、跟踪四路情报 —— 全是写死的假内容。已删。
   真的追问链在「提问台」（从真实纪要问答里蒸馏），真的跟踪在流水线「跟踪」列。 */
/* ==========================================================================
   渲染：主视图
   ========================================================================== */
let RESEARCH_VIEW = 'board';   /* board | ticket:<id> */

RENDER.research = function(){
  if(RESEARCH_VIEW.startsWith('ticket:')) return renderTicketBench(RESEARCH_VIEW.slice(7));
  const root = $('#scr-research');
  root.innerHTML = `
    <div class="screen-head">
      <h1>研究台 · THE DESK OF THE BOSS</h1>
      <span class="sub">灵感 ▸ 初筛 ▸ 快研 ▸ 深研 ▸ 决策 ▸ 跟踪 —— 你只出题和拍板，中间是 AI 员工的事</span>
    </div>
    <div class="desk-grid">
      <div class="desk-col">
      ${win('灵感流', '<div id="ideaFeed"></div>',
        {color:'mustard', sub:'今天世界在聊什么', cls:'win-fill', attr:' style="flex:1.45"'})}
      ${win('投稿箱', `
          <div class="field"><label>类型</label>
            <div class="opts" id="subType">
              <div class="opt on" data-v="小段子">小段子</div>
              <div class="opt" data-v="待验证观点">待验证观点</div>
              <div class="opt" data-v="高质量报告">高质量报告</div>
            </div></div>
          <textarea class="inp" id="subText" rows="4" style="resize:none">听说某 CSP 在东南亚偷偷谈了 3 个电力 PPA</textarea>
          <div class="field" style="margin-top:8px"><label>派给谁交叉验证</label>
            <div class="opts" id="subWho">
              ${DATA.researchers.filter(r=>!r.veto).map((r,i)=>
                `<div class="opt ${i<2?'on':''}" data-v="${r.id}">${r.n}</div>`).join('')}
            </div></div>
          <button class="px-btn on dotted" id="subGo" style="width:100%;margin-top:6px">▸ 投进流水线</button>
          <div class="t-xs t-dim" style="font-weight:700;line-height:1.7;margin-top:10px">
            小道消息、待验证观点、看到的好报告，都能丢进来。<br>
            系统会开一张「交叉验证」票，派给你选的研究员去核。</div>`,
          {color:'pink', sub:'老板的小道消息也是生产资料', cls:'win-fill', attr:' style="flex:1"'})}
      </div>
      ${win('流水线',
        '<div id="kanbanWrap" style="flex:1;min-height:0;overflow:auto"><div id="kanban"></div></div>' +
        '<div class="t-xs t-dim" id="kanbanHint" style="font-weight:700;text-align:center;padding-top:4px;display:none">← 左右滑动看完整漏斗 →</div>',
        {color:'teal', sub:'点票卡进工作台 · 金框=完整样例 · 可横滑', cls:'win-fill',
         bodyStyle:'display:flex;flex-direction:column;min-height:0;overflow:hidden'})}
    </div>`;
  if(typeof renderInsightFeed === 'function') renderInsightFeed($('#ideaFeed'));
  else drawIdeas();
  drawKanban();
  bindSubmit();
};

/* 灵感流由 insight.js 渲染（真实实时源）。这里以前有一份写死的 5 条假灵感做兜底，已删：
   拉不到就该说拉不到。 */
function drawIdeas(){
  const box = $('#ideaFeed'); if(!box) return;
  box.innerHTML = '<div class="t-xs t-dim" style="font-weight:700;line-height:1.8">' +
    '灵感流模块没加载。<br><span style="opacity:.7">这里不放写死的假灵感兜底。</span></div>';
}
function bindSubmit(){
  $$('#subType .opt').forEach(o=> o.onclick = ()=>{
    $$('#subType .opt').forEach(x=>x.classList.toggle('on', x===o)); });
  $$('#subWho .opt').forEach(o=> o.onclick = ()=> o.classList.toggle('on'));
  $('#subGo').onclick = ()=>{
    const type = $('#subType .opt.on').dataset.v;
    const text = $('#subText').value.trim();
    if(!text) return toast('空投稿不收');
    const who = $$('#subWho .opt.on').map(o=>o.dataset.v);
    DATA.clues.push({src:'本次会话', hook:'（见下方线索池）'});
    who.forEach(id=> dispatchTask(id, '交叉验证：' + text.slice(0,10)));
    drawKanban(); toast(`已进「初筛」，派给 ${who.length} 人交叉验证`);
  };
}

function drawKanban(){
  const kb = $('#kanban'); if(!kb) return;
  const wrap = $('#kanbanWrap');

  if(!realAuthed()){
    kb.style.cssText = '';
    kb.innerHTML = `<div class="t-sm" style="font-weight:700;line-height:1.9;padding:10px">
      🔒 <b>流水线要老板钥匙</b><br>
      每张票都是真实在办的课题：待人审的新信念、还没消化的材料、
      一手与市场分歧未收敛的缺口、今天各策略真锁的仓、在仓标的。<br>
      <span class="t-dim">票面带标的和观点，所以整块属于机密层。</span></div>
      <div class="t-xs t-dim" style="font-weight:700;padding:0 10px;line-height:1.8">
        读自 <code>wiki/_BELIEFS.md</code> · <code>wiki/_PENDING_INGEST.md</code> ·
        <code>wiki/_RESOLVED_GAPS.json</code> · 各策略 <code>reports/&lt;date&gt;/picks*.json</code></div>
      <div style="padding:10px"><button class="px-btn on dotted" data-openvault="1">⚿ 转保险库输密码</button></div>`;
    if(typeof bindLockedCards === 'function') bindLockedCards();
    return;
  }
  if(!PIPE.data){
    kb.style.cssText = '';
    kb.innerHTML = `<div class="t-sm" style="font-weight:700;padding:10px">${
      PIPE.err ? '读不到流水线：<span class="t-rose">' + PIPE.err + '</span>' : '正在读信念账本与各策略锁仓…'}</div>`;
    if(!PIPE.err) loadPipeline().then(ok=>{ if(PANEL_OPEN === 'research') drawKanban(); });
    return;
  }

  const P = PIPE.data;
  kb.style.cssText = 'display:grid;grid-template-columns:repeat(6,minmax(150px,1fr));gap:6px;'
    + 'min-width:900px;align-content:start';
  kb.innerHTML = '';
  P.stages.forEach(st=>{
    const col = el('div');
    col.innerHTML = `<div class="cap" style="border-bottom:3px solid var(--ink);padding-bottom:3px;margin-bottom:7px">
      ${st.n} <span class="t-dim">${st.items.length}</span>
      <div class="t-xs t-dim" style="font-weight:700;letter-spacing:0">${st.note}</div></div>`;
    if(!st.items.length){
      col.insertAdjacentHTML('beforeend',
        `<div class="t-xs t-dim" style="font-weight:700;line-height:1.7">这一段现在是空的。<br>
          <span style="opacity:.7">${st.n === '灵感' ? '灵感流在左边那栏' : '空就是空，不填充。'}</span></div>`);
    }
    st.items.forEach(t=> col.insertAdjacentHTML('beforeend', pipeCard(t, st.n)));
    kb.appendChild(col);
  });
  $$('[data-pipe]').forEach(b2=> b2.onclick = ()=> openPipeCard(b2.dataset.pipe));
  if(wrap) $('#kanbanHint').style.display =
    wrap.scrollWidth > wrap.clientWidth + 2 ? '' : 'none';
}

/* 票面：能一眼看出「这是什么、凭什么、下一步干嘛」 */
function pipeCard(t, stage){
  const hot = t.stale || (t.against != null && t.evidence != null && t.against >= t.evidence);
  const line2 =
    t.evidence != null ? `证据 ${t.evidence} · 反方 ${t.against}${t.last_evidence ? ' · ' + t.last_evidence : ''}`
    : t.gross ? `占本金 ${t.gross} · ${t.holders || ''}`
    : t.weight != null ? `${(t.weight * 100).toFixed(1)}% · ${t.who || ''}`
    : t.empty ? `${t.who} · 空仓`
    : t.as_of ? `🔴三方背离 · 强度 ${t.strength} · ${t.as_of}`
    : t.date ? `${t.date} · ${t.type || ''}` : '';
  return `<div class="gap-item" style="cursor:pointer${hot ? ';box-shadow:inset 0 0 0 2px var(--coral)' : ''}"
      data-pipe="${String(t.id).replace(/"/g, '')}">
    <div style="font-size:10px;font-weight:700;line-height:1.4">${
      t.stale ? '🥶 ' : ''}${t.empty ? '○ ' : ''}${(t.title || '').slice(0, 60)}</div>
    <div class="why">${line2}</div>
  </div>`;
}

function pipeFind(id){
  for(const st of (PIPE.data ? PIPE.data.stages : []))
    for(const it of st.items) if(String(it.id) === String(id)) return it;
  return null;
}

/* 点开 = 这个课题的真实档案。全是原文字段，不是我写的摘要。 */
function openPipeCard(id){
  const t = pipeFind(id); if(!t) return;
  const row = (k, v)=> v ? `<div class="row" style="justify-content:space-between;gap:10px;
      border-bottom:2px dotted rgba(63,43,35,.22);padding:4px 0">
      <span class="t-xs t-dim" style="font-weight:700;min-width:64px">${k}</span>
      <span class="t-sm" style="font-weight:700;text-align:right;flex:1">${v}</span></div>` : '';
  openModal(`
    <div class="win-bar" style="background:var(--teal)"><span>${t.stage} · 课题档案</span>
      <span class="dots" id="mClose" style="cursor:pointer">_ □ ×</span></div>
    <div style="padding:13px;max-height:76vh;overflow:auto">
      <div style="font-size:13px;font-weight:700;line-height:1.7;margin-bottom:10px">${t.title || ''}</div>
      ${t.first_hand ? `<div class="gap-item"><div class="why"><b>一手证据</b> ${t.first_hand}</div></div>` : ''}
      ${t.market_view ? `<div class="gap-item"><div class="why"><b>市场怎么讲</b> ${t.market_view}</div></div>` : ''}
      ${t.investment ? `<div class="gap-item"><div class="why t-cyan"><b>怎么用</b> ${t.investment}</div></div>` : ''}
      ${t.why ? `<div class="gap-item"><div class="why">${t.why}</div></div>` : ''}
      ${t.review ? `<div class="gap-item"><div class="why"><b>人审</b> ${t.review}</div></div>` : ''}
      <div style="margin-top:9px">
        ${row('把握', t.conf != null ? t.conf : t.conviction)}
        ${row('证据 / 反方', t.evidence != null ? `${t.evidence} 条 / ${t.against} 条` : '')}
        ${row('最新证据', t.last_evidence ? t.last_evidence + (t.stale ? ' 🥶 已陈旧' : '') : '')}
        ${row('涉及标的', (t.tickers || []).join(' '))}
        ${row('提出者', t.who)}
        ${row('日期', t.date || t.as_of)}
        ${row('来源缺口', t.gap ? t.gap + (t.page ? ' @ ' + t.page : '') : '')}
        ${row('权重', t.weight != null ? (t.weight * 100).toFixed(1) + '%' : '')}
        ${row('合并敞口', t.gross)}
        ${row('持有者', t.holders)}
      </div>
      <div class="bridge" style="margin-top:11px"><b>下一步</b> · ${t.next || '—'}</div>
      <div class="t-xs t-dim" style="font-weight:700;margin-top:8px">出处 ${t.src || ''}</div>
      <div class="t-xs t-dim" style="font-weight:700;margin-top:4px">
        这张票不是我编的进度条，是账本里真在等人处理的一条。处理它要去本地跑对应的命令。</div>
    </div>`);
  $('#mClose').onclick = closeModal;
}

function tk(id){ return DATA.tickets.find(t=>t.id===id); }

/* 老板日报已搬到手机（phone.js），研究台不再展示 */
function drawDailyRail(){ /* moved to phone */ }

/* ==========================================================================
   票工作台
   ========================================================================== */
/* 票工作台以前是一套写死的深研对话剧本 + 四路跟踪情报，全是编的。已删。
   现在点票直接开真实档案（openPipeCard），里面每个字段都来自账本原文。
   要做真正的深研对话，得接本地 Claude —— 网站不自己生成观点。 */
function renderTicketBench(id){ RESEARCH_VIEW = 'board'; RENDER.research(); openPipeCard(id); }
