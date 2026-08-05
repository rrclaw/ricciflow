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
  $('#subGo').onclick = async ()=>{
    const text = ($('#subText').value || '').trim();
    if(text.length < 8) return toast('太短了，至少写 8 个字');
    if(!realAuthed()) return toast('投稿要落到本机队列，需要老板钥匙');
    const who = $$('#subWho .opt.on').map(o=> o.dataset.v);
    const tag = ($('#subType .opt.on') || {}).textContent || '';
    let d;
    try{
      d = await (await fetch(BRIDGE + '/api/submit?key=' + encodeURIComponent(VAULT.key), {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({text, who, tag}), signal:AbortSignal.timeout(20000)})).json();
    }catch(e){ d = {ok:false, error:String(e.message || e)}; }
    if(d && d.dup){
      toast(d.error);
      return openWorkbench(d.dup);      /* 已经投过了，直接把那条打开 */
    }
    if(!d || !d.ok) return toast('没投进去：' + ((d && d.error) || '桥不通'));
    $('#subText').value = '';
    toast('已进选题队列 —— 正在给你翻本机已有的料');
    await loadPipeline(true);
    drawKanban();
    openWorkbench(d.row.id);          /* 直接进工作台，别让人自己找 */
  };
}

/* ==========================================================================
   研究工作台 —— 投了个话题，先把「本机已经有什么」摊开
   不生成观点：只找出来、对上号、列出该问什么、指出下一步跑什么命令。
   ========================================================================== */
async function openWorkbench(sid, q){
  if(!realAuthed()) return toast('工作台读的是本机知识库，需要老板钥匙');
  openModal(`<div class="win-bar" style="background:var(--mustard)"><span>研究工作台</span>
      <span class="dots" id="mClose" style="cursor:pointer">_ □ ×</span></div>
    <div style="padding:14px"><div class="t-sm" style="font-weight:700">
      正在翻本机的 wiki、缺口账本、信念账本和原始材料…</div></div>`);
  $('#mClose').onclick = closeModal;
  let d;
  try{
    const qs = sid ? 'id=' + encodeURIComponent(sid) : 'q=' + encodeURIComponent(q || '');
    d = await (await fetch(BRIDGE + '/api/workbench?' + qs + '&key=' + encodeURIComponent(VAULT.key),
      {signal:AbortSignal.timeout(40000)})).json();
  }catch(e){ d = {ok:false, error:String(e.message || e)}; }
  if(!d || !d.ok){
    $('#modalBox').querySelector('div:last-child').innerHTML =
      `<div class="t-sm t-rose" style="font-weight:700">${(d && d.error) || '读不到'}</div>`;
    return;
  }
  drawWorkbench(d);
}

function drawWorkbench(d){
  const empty = t=> `<div class="t-xs t-dim" style="font-weight:700;line-height:1.8">${t}</div>`;
  const iq = d.inquiry || {};
  const layers = (iq.layers || []).filter(l=> (l.qs || []).length);

  $('#modalBox').innerHTML = `
    <div class="win-bar" style="background:var(--mustard)">
      <span>研究工作台</span><span class="sub">本机已有什么 · 该问什么 · 下一步</span>
      <span class="dots" id="mClose2" style="cursor:pointer">_ □ ×</span></div>
    <div style="padding:14px;max-height:78vh;overflow:auto">
      <div class="minutes" style="font-size:11px;line-height:1.9;margin-bottom:9px">${
        String(d.text).replace(/[<>&]/g, c=> ({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]))}</div>
      <div class="row wrap" style="gap:4px;margin-bottom:11px">
        <span class="cap">检索词</span>
        ${d.terms.slice(0, 10).map(t=>`<span class="tag">${t}</span>`).join('')}
        <span class="sp"></span>
        <span class="t-xs t-dim" style="font-weight:700">从本机语料词表里切的，切不出来的词说明这台机器没沾过</span>
      </div>

      <div class="cap" style="margin:10px 0 5px">① 本机已经有的页（${d.wiki.length}）</div>
      ${d.wiki.length ? d.wiki.map(w=>`
        <div class="gap-item" style="cursor:pointer" data-wbwiki="${w.slug}">
          <div class="gt">
            <span class="tag ${w.docs > 20 ? 'gold' : w.docs ? '' : 'rose'}">${w.docs} 份材料</span>
            ${w.stance ? `<span class="tag ${w.stance==='bullish'?'cyan':''}">${w.stance}</span>` : ''}
            <span><b>${esc(w.title)}</b> <span class="t-dim">${w.slug}</span></span></div>
          <div class="why">命中 ${w.hit.join('、')} · 缺口 ${w.gaps} 条 · 最近材料 ${w.fresh} 天前</div>
        </div>`).join('')
        : empty('一页都没对上 —— <b>这本身就是结论</b>：这块是本机的空白，得从建页开始。')}

      <div class="cap" style="margin:12px 0 5px">② 已记录的分歧（${d.gaps.length}）· 研究该切进去的地方</div>
      ${d.gaps.length ? d.gaps.map(g=>`
        <div class="gap-item">
          <div class="gt"><span class="tag ${g.type === '🔴' ? 'rose' : 'gold'}">${g.type_name || ''}</span>
            <span class="tag">把握 ${g.conviction || '—'}</span>
            <span class="t-dim">${g.as_of || ''} · ${g.slug}</span></div>
          <div class="why"><b>${esc(g.title)}</b></div>
          ${g.first_hand ? `<div class="why t-cyan">一手 · ${esc(g.first_hand)}</div>` : ''}
          ${g.market_view ? `<div class="why">市场 · ${esc(g.market_view)}</div>` : ''}
          ${g.investment ? `<div class="why">怎么用 · ${g.investment}</div>` : ''}
        </div>`).join('') : empty('没有对得上的分歧记录。')}

      <div class="cap" style="margin:12px 0 5px">③ 已有信念（${d.beliefs.length}）· 有人已经在赌了吗</div>
      ${d.beliefs.length ? d.beliefs.map(b=>`
        <div class="gap-item">
          <div class="gt"><span class="tag">${b.section || ''}</span>
            <span class="tag ${(b.against||0) >= (b.evidence||0) ? 'rose' : ''}">证据 ${esc(b.evidence)} · 反方 ${b.against}</span>
            ${b.stale ? '<span class="tag rose">🥶 已陈旧</span>' : ''}</div>
          <div class="why">${esc(b.title)}</div>
          <div class="why t-dim">${b.id}${b.gap ? ' · 来源 ' + b.gap : ''}</div>
        </div>`).join('') : empty('账本里还没人对这件事立过信念 —— 那这条投稿本身就该变成第一条。')}

      <div class="cap" style="margin:12px 0 5px">④ 手上的料（${d.docs_total} 份，最新 ${d.docs_latest || '—'}）</div>
      ${d.docs.length ? d.docs.slice(0, 8).map(x=>`
        <div class="gap-item"><div class="why">
          <span class="tag ${x.grade === 'A' ? 'gold' : ''}">${x.grade || '?'}</span>
          <span class="t-dim">${x.date} · ${x.type}</span><br>${x.title}</div></div>`).join('')
        : empty('本机一份沾边的材料都没有。先弄料，再谈研究。')}

      <div class="cap" style="margin:12px 0 5px">⑤ 该问什么 · 锚点「${iq.anchor || '—'}」</div>
      ${layers.length ? layers.map(l=>`
        <div class="gap-item">
          <div class="gt"><span class="tag gold">${l.layer}</span></div>
          ${(l.qs || []).slice(0, 3).map(x=>`<div class="why">· ${x.q || x}</div>`).join('')}
        </div>`).join('')
        : empty('本机纪要里没有这个话题的问答可蒸馏 —— 说明这块还没人系统问过。')}
      <div class="t-xs t-dim" style="font-weight:700;margin-top:4px">
        问题是从真实纪要问答里蒸馏的，不是问题模板。</div>

      <div class="cap" style="margin:12px 0 5px">⑥ 下一步</div>
      ${d.next.map(n=>`
        <div class="gap-item"><div class="why" style="color:var(--ink)">
          <b>${n.do}</b><br><code>${n.how}</code><br>
          <span class="t-dim">${n.why}</span></div></div>`).join('')}

      <div class="cap" style="margin:12px 0 5px">⑦ 派给谁</div>
      ${(d.who || []).length ? `<div class="row wrap" style="gap:5px">
          ${d.who.map(w=>`<span class="tag cyan" title="${w.style} · 命中 ${w.hit.join('、')}">${w.n}</span>`).join('')}
        </div>` : empty(d.who_note || '没有对口的。')}

      <div class="row" style="gap:6px;margin-top:13px">
        ${d.wiki.length ? `<button class="px-btn on dotted" data-wbwiki="${d.wiki[0].slug}">📖 打开 ${d.wiki[0].slug}</button>` : ''}
        ${d.id ? `<button class="px-btn ghost" id="wbDone">✓ 这条办完了</button>` : ''}
      </div>
      <div class="t-xs t-dim" style="font-weight:700;margin-top:9px;line-height:1.7">
        工作台只负责把料摆齐，<b>不替你下判断</b>。要真做这个研究，按上面⑥的命令在本地跑。</div>
    </div>`;
  $('#mClose2').onclick = closeModal;
  $$('[data-wbwiki]').forEach(b=> b.onclick = ()=>{
    closeModal();
    if(typeof openWikiPage === 'function') openWikiPage(b.dataset.wbwiki);
  });
  const dn = $('#wbDone');
  if(dn) dn.onclick = async ()=>{
    await fetch(BRIDGE + '/api/sub_status?key=' + encodeURIComponent(VAULT.key), {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({id: d.id, status:'done'})}).catch(()=>{});
    closeModal(); await loadPipeline(true); drawKanban();
    toast('已从选题队列移出');
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
    t.sub ? `${t.date} · 老板投稿 · 点开进工作台`
    : t.evidence != null ? `证据 ${t.evidence} · 反方 ${t.against}${t.last_evidence ? ' · ' + t.last_evidence : ''}`
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
  /* 老板自己投的选题 → 进研究工作台，那里才有「下一步该干嘛」 */
  if(t.sub) return openWorkbench(t.id);
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
