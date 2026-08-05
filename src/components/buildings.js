/* ricciflow — 三楼资料库浏览器 + 保险库（老板钥匙）+ 机房
   真实模式：kb-bridge (127.0.0.1:8331) 接本地 knowledge，老板钥匙鉴权
   演示模式：桥不在线时用 mock 数据，保安照样拦客人 */

const BLDG = {
  campus:{n:'X 公司产业园 · 纪要库', color:'sky',   desc:'专家纪要 · 公司交流 · 调研记录'},
  broker:{n:'券商大楼 · 研报库',     color:'coral', desc:'卖方研报 · 点评 · 策略会材料'},
  media: {n:'媒体大楼 · 新闻公告库', color:'mustard', desc:'公告 · 财联社 · 海外媒体'},
  archive:{n:'待分拣仓库',           color:'ink',   desc:'楼宇归属待打标的存量'}
};
const BRIDGE = (location.hostname === '127.0.0.1' || location.hostname === 'localhost' || location.protocol === 'file:')
  ? 'http://127.0.0.1:8331' : '/kbapi';
/* 钥匙每天一换。存的时候连日期一起存，跨天自动作废 ——
   不然浏览器里那把昨天的会一直躺着，每次刷新都去撞一次桥的失败计数。 */
function _todayStr(){
  /* 手算，不靠 toLocaleDateString 的 locale —— 不同运行环境给的格式不一样，
     一旦格式变了就会天天把有效钥匙判成过期。 */
  const d = new Date();
  const p2 = n=> String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
}
function _loadKey(){
  const k = localStorage.getItem('rf_boss_key') || '';
  const d = localStorage.getItem('rf_boss_key_day') || '';
  if(k && d !== _todayStr()){
    localStorage.removeItem('rf_boss_key');
    localStorage.removeItem('rf_boss_key_day');
    return '';
  }
  return k;
}
let VAULT = { key: _loadKey(), live: false, checked: false, expired: false };

async function vaultProbe(){
  try {
    // 验钥打真正的鉴权端点(200=有效)。以前靠 /api/health 回显 auth 布尔 ——
    // 那等于给所有人白送验钥 oracle, 已从桥上拆掉。
    const r = await fetch(BRIDGE + '/api/carried?key=' + encodeURIComponent(VAULT.key), {signal: AbortSignal.timeout(1500)});
    VAULT.live = r.ok;
    return r.ok ? { ok: true } : null;
  } catch(e){ VAULT.live = false; return null; }
}
function vaultUnlocked(){ return !!VAULT.key; }

/* ---------- 保险库转盘 ---------- */
function openVault(onOk){
  let buf = '';
  openModal(`
    <div class="win-bar" style="background:var(--ink)"><span>机密保险库 · 输入老板钥匙</span>
      <span class="dots" id="mClose" style="cursor:pointer">_ □ ×</span></div>
    <div style="padding:14px;text-align:center">
      <div class="vault-dial" id="vaultDial"><i></i></div>
      <div class="vault-display" id="vaultDisp"></div>
      <div class="vault-pad">
        ${[1,2,3,4,5,6,7,8,9,'C',0,'⏎'].map(k=>`<button class="vault-key" data-vk="${k}">${k}</button>`).join('')}
      </div>
      <div class="t-xs t-dim" style="font-weight:700;margin-top:9px;line-height:1.8" id="vaultHint">
        <b>密码每天一换</b>，只能在这台机器的终端上拿：<br>
        <code>python3.11 bridge/bosskey.py</code><br>
        本地零点自动换新（凌晨 4 点前旧的还收）。派生密钥只在本机，不进 git、不上公网。<br>
        <span class="t-rose">连错 5 次封 IP 15 分钟。</span></div>
    </div>`);
  $('#mClose').onclick = closeModal;
  const disp = ()=> $('#vaultDisp').textContent =
    (buf + '—'.repeat(Math.max(0, 10 - buf.length))).split('').join(' ');
  $$('.vault-key').forEach(b=> b.onclick = async ()=>{
    const k = b.dataset.vk;
    const dial = $('#vaultDial');
    dial.style.transform = `rotate(${(buf.length + 1) * 60}deg)`;
    if(k === 'C'){ buf = ''; disp(); return; }
    if(k === '⏎'){
      if(buf.length < 4) return toast('钥匙至少 4 位');
      VAULT.key = buf;
      localStorage.setItem('rf_boss_key', buf);
      localStorage.setItem('rf_boss_key_day', _todayStr());
      $('#vaultHint').innerHTML = '验证中…';
      const h = await vaultProbe();
      closeModal();
      if(VAULT.live){
        toast('🔓 保险库开了 · 真实知识库已接通（' + h.docs + ' 份文档）');
        /* 钥匙一插，研究员名册与薪资也一并换成真账 */
        if(typeof loadReal === 'function') loadReal(true).then(ok=>{
          if(ok) toast('研究员名册已换成实盘账本（' + REAL.roster.n + ' 名）');
          else if(REAL.err) toast('名册没接上：' + REAL.err);
          if(ok && PANEL_OPEN && RENDER[PANEL_OPEN]) RENDER[PANEL_OPEN]();
        });
      } else if(h && !h.auth){
        VAULT.key = ''; localStorage.removeItem('rf_boss_key');
        localStorage.removeItem('rf_boss_key_day');
        toast('钥匙不对。密码每天一换，去终端跑 python3.11 bridge/bosskey.py 拿今天的');
        return;
      } else {
        toast('🔓 演示模式解锁（本地桥未运行，看的是样例数据）');
      }
      if(onOk) onOk();
      return;
    }
    if(buf.length < 10){ buf += k; disp(); }
  });
  disp();
}

/* ---------- mock 数据（桥不在线时） ---------- */
const BLDG_MOCK = {
  campus: [
    {id:'m1', date:'2026-07-26', title:'AI 大模型及商业化调研（样例）', company:'', broker:'', conf:'B'},
    {id:'m2', date:'2026-07-25', title:'光刻胶产线专家交流纪要（样例）', company:'', broker:'', conf:'A'},
    {id:'m3', date:'2026-07-22', title:'存储原厂渠道调研（样例）', company:'', broker:'', conf:'B'}],
  broker: [
    {id:'m4', date:'2026-07-24', title:'先进封装竞争格局深度（样例）', company:'', broker:'某券商', conf:'B'},
    {id:'m5', date:'2026-07-21', title:'PCB 行业首次覆盖（样例）', company:'', broker:'某外资行', conf:'B'}],
  media: [
    {id:'m6', date:'2026-07-22', title:'某云厂商上调资本开支指引（样例）', company:'', broker:'', conf:'C'},
    {id:'m7', date:'2026-07-19', title:'某光模块公司业绩预告解读（样例）', company:'', broker:'', conf:'B'}],
  archive: [
    {id:'m8', date:'2026-06-11', title:'待分拣存量样例', company:'', broker:'', conf:'C'}]
};
DATA.carried = [];

/* ---------- 楼宇浏览器 ---------- */
async function openBuildingBrowser(b){
  const B = BLDG[b];
  /* 保安：没钥匙 = 客人 */
  if(!vaultUnlocked()){
    openModal(`
      <div class="win-bar" style="background:var(--coral)"><span>${B.n} · 保安亭</span>
        <span class="dots" id="mClose" style="cursor:pointer">_ □ ×</span></div>
      <div class="guard-scene">
        <div class="guard-bars"></div>
        <div class="guard-stripe"></div>
        <div class="guard-stamp">禁止入内</div>
        <div class="guard-figure">
          ${avatarHTML('risk','s6')}
          <div class="guard-say">「站住。资料库是<b>机密重地</b>，
            要<b>里奇流老板本人的钥匙</b>。<br>没有？可以留申请，或报名下一场公开调研。」</div>
        </div>
        <div style="margin-top:4px">${avatarHTML('guest','s3')}
          <span class="t-xs" style="color:#9b93a8;font-weight:700">← 你（此刻的客人身份）</span></div>
        <div class="guard-stripe" style="margin-top:10px"></div>
      </div>
      <div style="padding:12px">
        <div class="row" style="gap:6px">
          <button class="px-btn on dotted" id="grdKey" style="flex:1">🔑 我有钥匙（开保险库）</button>
          <button class="px-btn" id="grdApply">提交查阅申请</button>
          <button class="px-btn ghost" id="grdTour">报名未来调研</button>
        </div>
        <div class="t-xs t-dim" style="font-weight:700;margin-top:8px">
          客人可参观：研究员名册 · 数据源清单 · 财务概况（演示值）。原文属公司机密。</div>
      </div>`);
    toast('哔——保安拦住了你');
    $('#mClose').onclick = closeModal;
    $('#grdKey').onclick = ()=>{ closeModal(); openVault(()=> openBuildingBrowser(b)); };
    $('#grdApply').onclick = ()=>{ closeModal(); toast('申请已登记。老板看到会批（也可能不批）'); };
    $('#grdTour').onclick = ()=>{ closeModal(); pushDaily('intel', '有客人报名了下一场公开调研（' + B.n + '）'); toast('已报名，日报里可查'); };
    return;
  }
  await vaultProbe();
  PANEL_OPEN = 'bldg:' + b;
  $('#panelTitle').textContent = B.n;
  $('#panelBar').style.background = `var(--${B.color === 'ink' ? 'ink' : B.color})`;
  $('#panelBody').innerHTML = `
    <section class="screen active">
      <div class="row wrap" style="margin-bottom:10px">
        <span class="tag ${VAULT.live ? 'cyan' : ''}">${VAULT.live ? '🔓 真实知识库' : '演示数据（本地桥未运行）'}</span>
        <span class="t-xs t-dim" style="font-weight:700">${B.desc}</span>
        <span class="sp"></span>
        <input class="inp" id="bldQ" placeholder="搜标题…" style="max-width:170px">
        <input class="inp" id="bldCo" placeholder="公司/代码…" style="max-width:130px">
        ${b === 'broker' ? '<input class="inp" id="bldBk" placeholder="券商…" style="max-width:110px">' : ''}
        <button class="px-btn sm on" id="bldGo">查</button>
      </div>
      <div id="bldList" class="col" style="gap:0"></div>
      <div class="panel-foot"><span class="demo-mark">${VAULT.live ? '真实原文 · 仅本机可见' : 'DEMO'}</span>
        搬运需指定处理研究员 · 每条可溯源 <span class="sp"></span>里奇流资本</div>
    </section>`;
  $('#panel').classList.add('open'); $('#panelScrim').classList.add('open');
  walkPause(true);
  const go = ()=> bldFetch(b);
  $('#bldGo').onclick = go;
  $('#bldQ').onkeydown = e=>{ if(e.key === 'Enter') go(); };
  go();
}

async function bldFetch(b){
  const list = $('#bldList'); if(!list) return;
  list.innerHTML = '<div class="t-dim" style="font-weight:700;padding:14px">翻库房中…</div>';
  let docs = [], total = 0;
  if(VAULT.live){
    try {
      const qs = new URLSearchParams({key: VAULT.key, building: b, limit: 50,
        q: $('#bldQ')?.value || '', company: $('#bldCo')?.value || '',
        broker: $('#bldBk')?.value || ''});
      const j = await (await fetch(BRIDGE + '/api/docs?' + qs)).json();
      docs = j.docs; total = j.total;
    } catch(e){ docs = BLDG_MOCK[b]; total = docs.length; }
  } else { docs = BLDG_MOCK[b]; total = docs.length; }
  list.innerHTML = `<div class="cap" style="margin-bottom:6px">共 ${total} 份 · 显示前 ${docs.length}</div>` +
    docs.map(d=>`
      <div class="gap-item" style="margin-bottom:6px">
        <div class="gt" style="cursor:pointer" data-bld-doc="${d.id}">
          <span class="tag">${d.date || '—'}</span>
          <span style="flex:1">${d.title}</span>
          ${d.broker ? `<span class="tag rose">${d.broker}</span>` : ''}
          ${d.company ? `<span class="tag cyan">${d.company}</span>` : ''}
          <span class="tag ${d.conf === 'A' ? 'gold' : ''}">${d.conf || 'C'}</span>
        </div>
        <div class="row" style="gap:4px;margin-top:4px">
          <button class="px-btn sm ghost" data-bld-doc="${d.id}">📄 看原文</button>
          <button class="px-btn sm" data-bld-carry="${d.id}" data-bld-title="${(d.title||'').replace(/"/g,'')}">⇊ 搬运回机房</button>
        </div>
      </div>`).join('');
  $$('#bldList [data-bld-doc]').forEach(el2=> el2.onclick = ()=> bldReadDoc(el2.dataset.bldDoc));
  $$('#bldList [data-bld-carry]').forEach(el2=> el2.onclick = e=>{
    e.stopPropagation(); bldCarry(b, el2.dataset.bldCarry, el2.dataset.bldTitle);
  });
}

async function bldReadDoc(id){
  let d = null;
  if(VAULT.live){
    try { d = await (await fetch(`${BRIDGE}/api/doc/${id}?key=${encodeURIComponent(VAULT.key)}`)).json(); }
    catch(e){}
  }
  if(!d) d = {title:'样例原文', content:'（演示模式：跑起本地 kb-bridge 后，这里显示你知识库里的真实原文。）', building:'demo'};
  openModal(`
    <div class="win-bar" style="background:var(--sky)"><span>${(d.title || '').slice(0, 40)}</span>
      <span class="dots" id="mClose" style="cursor:pointer">_ □ ×</span></div>
    <div style="padding:13px;max-height:70vh;overflow-y:auto">
      <div class="row wrap" style="margin-bottom:8px">
        <span class="tag">${d.date || ''}</span>
        ${d.broker ? `<span class="tag rose">${d.broker}</span>` : ''}
        ${d.company ? `<span class="tag cyan">${d.company}</span>` : ''}
        <span class="tag gold">溯源：${BLDG[d.building]?.n || d.building}</span></div>
      <div class="t-sm" style="line-height:1.85;white-space:pre-wrap">${(d.content || '').slice(0, 12000).replace(/</g,'&lt;')}</div>
      ${(d.content || '').length > 12000 ? '<div class="t-dim t-xs" style="font-weight:700;margin-top:8px">（长文截断显示，机房版可看全文）</div>' : ''}
    </div>`);
  $('#mClose').onclick = closeModal;
}

function bldCarry(b, id, title){
  const rs = DATA.researchers.filter(r=> !r.veto && !r.gone);
  openModal(`
    <div class="win-bar" style="background:var(--mustard);color:var(--ink)"><span>搬运回机房 · 指定处理研究员</span>
      <span class="dots" id="mClose" style="cursor:pointer">_ □ ×</span></div>
    <div style="padding:13px">
      <div class="t-sm" style="font-weight:700;margin-bottom:9px">「${title.slice(0, 40)}」</div>
      <div class="t-xs t-dim" style="font-weight:700;margin-bottom:7px">谁来打标整理？（processed_by 强制记名，进他的个人履历）</div>
      <div class="row wrap" style="gap:5px">
        ${rs.map(r=>`<button class="px-btn sm" data-cby="${r.id}">${r.n}</button>`).join('')}
      </div>
    </div>`);
  $('#mClose').onclick = closeModal;
  $$('#modalBox [data-cby]').forEach(btn=> btn.onclick = async ()=>{
    const by = btn.dataset.cby;
    const r = DATA.researchers.find(x=> x.id === by);
    let ok = false;
    if(VAULT.live){
      try {
        const j = await (await fetch(BRIDGE + '/api/carry?key=' + encodeURIComponent(VAULT.key), {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({id, by})})).json();
        ok = j.ok;
      } catch(e){}
    }
    DATA.carried.unshift({title, building:b, by:r.n, t:new Date().toISOString().slice(0,10)});
    dispatchTask(by, '打标整理：' + title.slice(0, 10));
    closeModal();
    toast((ok ? '已登记（真实 carried.jsonl）' : '已登记（演示）') + ' · ' + r.n + ' 接单');
    pushDaily('sink', `搬运：「${title.slice(0, 16)}…」← ${BLDG[b].n}，${r.n} 打标整理中`);
  });
}

/* ---------- 机房（知识库抽屉入口） ---------- */
async function openVaultRoom(){
  if(!vaultUnlocked()) return openVault(()=> openVaultRoom());
  await vaultProbe();
  let rows = DATA.carried;
  if(VAULT.live){
    try {
      const j = await (await fetch(BRIDGE + '/api/carried?key=' + encodeURIComponent(VAULT.key))).json();
      rows = j.rows.map(r=> ({title:r.title, building:r.building, by:r.processed_by || '', t:r.carried_at})).reverse()
        .concat(DATA.carried);
    } catch(e){}
  }
  openModal(`
    <div class="win-bar" style="background:var(--ink)"><span>机房 · 内部资料库（机密）</span>
      <span class="dots" id="mClose" style="cursor:pointer">_ □ ×</span></div>
    <div style="padding:13px;max-height:70vh;overflow-y:auto">
      <div class="row" style="margin-bottom:9px">
        <span class="tag ${VAULT.live ? 'cyan' : ''}">${VAULT.live ? '🔓 真实登记簿' : '演示'}</span>
        <span class="t-xs t-dim" style="font-weight:700">每条双溯源：raw 出处大楼 + 处理研究员</span></div>
      ${rows.length ? rows.map(r=>`
        <div class="gap-item"><div class="why" style="color:var(--ink)">
          <b>${r.title.slice(0, 44)}</b><br>
          <span class="tag">${BLDG[r.building]?.n.split(' ')[0] || r.building}</span>
          <span class="tag ${r.by ? 'cyan' : ''}">${r.by ? '处理：' + r.by : '早期内部资料 · 未记名'}</span>
          <span class="t-dim">${r.t || ''}</span></div></div>`).join('')
        : '<div class="t-dim" style="font-weight:700">还没搬运过。去三栋楼里逛逛</div>'}
      <div class="bridge" style="margin-top:9px">存量 wiki 与既有整理 = 「早期内部资料」不记名；
      今日起新搬运强制记名 processed_by。客人永远看不到这个房间。</div>
    </div>`);
  $('#mClose').onclick = closeModal;
}
