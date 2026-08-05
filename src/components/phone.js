/* ricciflow — 老板的手机
   三个 tab：通知推送 / 公司群 / 老板圈（其他私募老板私信）。
   HUD 常驻入口，未读角标。 */

/* 手机里的东西也不许拍脑袋写。
   通知 = 本次会话真实发生的事（DATA.events）+ 日报里的真实待办；
   公司群 = 各研究员真实 doctrine 原话与最近一期结论；
   老板圈 = 待接线，将由真实公开发言驱动（P5），现在空着而不是编。 */
DATA.phone = {unread: 0};

let PHONE_TAB = 'news';
let PHONE_THREAD = null;

function phoneBadge(){
  const b = $('#phoneBadge');
  if(b) b.style.display = DATA.phone.unread > 0 ? 'grid' : 'none';
  if(b) b.textContent = DATA.phone.unread;
}

function openPhone(){
  DATA.phone.unread = 0;
  const ph = $('#phone');
  ph.classList.add('open');
  walkPause(true);
  renderPhone();
  phoneBadge();
}
function closePhone(){
  $('#phone').classList.remove('open');
  if(!PANEL_OPEN) walkPause(false);
}

function renderPhone(){
  const body = $('#phoneBody');
  $$('#phoneTabs .ph-tab').forEach(t=> t.classList.toggle('on', t.dataset.pt === PHONE_TAB));
  if(PHONE_TAB === 'news'){
    body.innerHTML = (DATA.events || []).length
      ? DATA.events.map(n=>`
          <div class="ph-msg">
            <div class="ph-meta"><span class="tag">${DAILY_TAG[n.k] ? DAILY_TAG[n.k][1] : n.k}</span>
              <span class="t-dim">${n.t}</span></div>${n.txt}</div>`).join('')
      : `<div class="ph-msg"><div class="ph-meta"><span class="tag">空</span></div>
          本次会话还没发生什么。搬运资料、抽到线索、触发任务会推到这里。<br>
          <span class="t-dim">这里不预置推送。</span></div>`;
  } else if(PHONE_TAB === 'todo'){
    // 老板日报 = 等你拍板的事 + 待办 + 日程，从研究台搬来
    body.innerHTML = phoneTodoHTML();
    $$('#phoneBody [data-goto]').forEach(b=> b.onclick = ()=>{
      closePhone(); openComponent(b.dataset.goto);
    });
  } else if(PHONE_TAB === 'group'){
    body.innerHTML = phoneGroupHTML();
  } else {
    body.innerHTML = `
      <div class="ph-msg">
        <div class="ph-meta"><span class="tag rose">待接线</span></div>
        老板圈以前是三段写死的假私信。已删。<br>
        <span class="t-dim">接线后这里放的是真实人物（化名）近期公开发言的引述卡，
        每条带日期和出处，点得开原文。素材由本地例程搜集，网站只呈现。</span></div>`;
  }
}

/* 「今天」tab = 最新一天的留痕 + 当天待办。
   手机只看最新一天，翻历史去档案室 —— 两边不重复。 */
function phoneTodoHTML(){
  if(typeof realAuthed !== 'function' || !realAuthed())
    return `<div class="ph-msg"><div class="ph-meta"><span class="tag rose">上锁</span></div>
      待办读的是真实账本（审阅队列 / 待入库 / 停职名单），要老板钥匙。</div>`;
  const B = (typeof BRIEF !== 'undefined') ? BRIEF.data : null;
  if(!B){
    if(typeof loadBriefing === 'function')
      loadBriefing().then(ok=>{ if(ok && PHONE_TAB === 'todo') renderPhone(); });
    return '<div class="ph-msg">正在读日报…</div>';
  }
  const rq = B.review_queue || {}, pi = B.pending_ingest || {}, kf = B.kb_freshness || {},
        sp = B.suspended || {}, rb = B.riskboard || {};
  const rows = [];
  (rb.alerts || []).forEach(a=> rows.push(['风险', 'rose', a.txt, 'trading']));
  if(kf.ok && (kf.stale_days ?? 0) > 2)
    rows.push(['断档', 'rose', `入库断档 ${kf.stale_days} 天（最新 ${kf.latest}）`, 'rack']);
  Object.entries(rq.buckets || {}).forEach(([k, n])=> rows.push(['审阅', 'gold', `${k} ${n} 条`, 'research']));
  if(pi.pending) rows.push(['入库', 'gold', `待入库 ${pi.pending} 条`, 'research']);
  (sp.rows || []).forEach(x=> rows.push(['人事', 'gold', `${x.n} · ${x.label}`, 'desk']));
  const A = (typeof ARCH !== 'undefined') ? ARCH.day : null;
  if(!A && typeof loadArchive === 'function')
    loadArchive().then(ok=>{ if(ok && PHONE_TAB === 'todo') renderPhone(); });
  const head = A ? `
    <div class="ph-msg" style="background:var(--cream2)">
      <b>${A.date}${A.is_today ? '（今天）' : ''}</b> · ${A.n_who} 人写了 ${A.n_files} 份<br>
      <span class="t-dim">${A.who.slice(0, 6).map(w=> w.who + '×' + w.files.length).join('　')}</span>
      <div style="margin-top:5px"><button class="px-btn sm ghost" data-goto="archive">▸ 翻历史（档案室）</button></div>
    </div>` : '<div class="ph-msg">正在读最新一天的留痕…</div>';
  if(!rows.length) return head + '<div class="ph-msg">今天没有待办。</div>';
  return head + rows.map(([tag, cls, txt, to])=>`
    <div class="ph-msg hot">
      <div class="ph-meta"><span class="tag ${cls}">${tag}</span></div>${txt}
      <div style="margin-top:5px"><button class="px-btn sm ghost" data-goto="${to}">▸ 去处理</button></div>
    </div>`).join('');
}

/* 公司群 = 每位研究员自己 doctrine 里的原话 + 最近一期结论。真话，虚构的群。 */
function phoneGroupHTML(){
  if(typeof REAL === 'undefined' || !REAL.on)
    return `<div class="ph-msg"><div class="ph-meta"><span class="tag rose">上锁</span></div>
      群里说的每句话都是各策略 doctrine 原文与最近一期结论，要老板钥匙。</div>`;
  const rs = (REAL.roster && REAL.roster.researchers) || [];
  return `<div class="ph-msg" style="background:var(--cream2)">
      <b>真实观点 · 化名的群</b><br>
      <span class="t-dim">每句话都引自该策略自己的 doctrine 文件或最近一期报告，不是我替它说的。</span></div>` +
    rs.filter(r=> r.status.code !== 'fired').slice(0, 10).map(r=>{
      const p = r.picks || {};
      const line = (p.picks && p.picks.length)
        ? `这期拿了 ${p.picks.length} 只，头号 ${p.picks[0].name || p.picks[0].ticker}`
        : (p.note ? '这期空仓：' + String(p.note).slice(0, 60) : '这期没有选股腿');
      return `<div class="ph-msg">
        <div class="ph-meta"><b>${r.n}</b>
          <span class="tag ${REAL_STATUS_TAG[r.status.code] || ''}">${r.status.label}</span>
          <span class="t-dim">${r.report.date || ''}</span></div>
        ${r.motto}<br><span class="t-dim">${line}</span>
        <div class="t-xs t-dim" style="margin-top:3px">引自 ${r.src}</div></div>`;
    }).join('');
}

/* 手机壳 DOM（一次性注入） */
(function initPhone(){
  document.body.insertAdjacentHTML('beforeend', `
    <div class="phone" id="phone">
      <div class="ph-frame">
        <div class="ph-status"><span id="phClock"></span><span>里奇流 5G · 100%</span>
          <span class="dots" id="phClose" style="cursor:pointer">×</span></div>
        <div class="ph-tabs" id="phoneTabs">
          <button class="ph-tab on" data-pt="news">通知</button>
          <button class="ph-tab" data-pt="todo">今天</button>
          <button class="ph-tab" data-pt="group">公司群</button>
          <button class="ph-tab" data-pt="bosses">老板圈</button>
        </div>
        <div class="ph-body" id="phoneBody"></div>
      </div>
    </div>`);
  $('#phClose').onclick = closePhone;
  $$('#phoneTabs .ph-tab').forEach(t=> t.onclick = ()=>{
    PHONE_TAB = t.dataset.pt; PHONE_THREAD = null; renderPhone();
  });
  const tick = ()=>{ const d = new Date();
    const el2 = $('#phClock');
    if(el2) el2.textContent = String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0'); };
  tick(); setInterval(tick, 20000);
})();
