/* ricciflow — 组件: 数据源机架 SOURCE RACK
   加载方式: 传统 <script> 顺序加载（零构建、file:// 可直开）。
   模块间通过顶层声明共享（var/function 提升到全局作用域）。 */

/* ==========================================================================
   SECTION 12 — 屏1 数据源机架
   ========================================================================== */
let SRC_TAB = 'all';

function srcCount(){ return DATA.sources.filter(s=>s.on).length; }

function freshIcon(d){
  if(d <= 1) return '<span class="t-gold">时效 新</span>';
  if(d <= 7) return '<span class="t-cyan">时效 '+d+'d</span>';
  if(d <= 30) return '<span class="t-dim">时效 '+d+'d</span>';
  return '<span class="t-rose">时效 '+d+'d 陈</span>';
}

RENDER.sources = function(){
  const scr = $('#scr-sources');
  scr.innerHTML = `
    <div class="screen-head">
      <h1>SOURCE RACK</h1>
      <span class="sub">数据源机架 · 插上卡带就通电</span>
      <div class="tools">
        <button class="px-btn" data-preset="semi">▸ 半导体全家桶</button>
        <button class="px-btn" data-preset="ashare">▸ A股日频最小集</button>
        <button class="px-btn" data-preset="all">▸ 全部拉满</button>
        <button class="px-btn ghost danger" data-preset="none">✕ 全拔</button>
      </div>
    </div>
    <div class="rack">
      ${win('SOURCE RACK','<div class="row wrap" style="margin-bottom:11px" id="srcTabs"></div><div id="cartZone"></div>',
            {color:'teal', sub:'16 个源 · 点卡带配置'})}
      <div class="col">
        ${win('取数优先级链',
          `<div class="prio-chain" id="prioChain"></div>
           <div class="t-xs t-dim" style="margin-top:8px;line-height:1.6">
             冲突时以左侧为准，可拖动重排。<br>同一个事实有多个源时，这条链决定听谁的。
           </div>`, {color:'mustard'})}
        ${win('机架状态','<div id="rackStat"></div>',{color:'sky'})}
        ${win('LOCK · 受限源',
          `<div class="t-xs" style="line-height:1.75">
             带 <span class="tag rose">LOCK</span> 的是付费 / 受限源。可以入库、可以内部引用，
             <b class="t-rose">但外发内容里永不出现源名</b>。<br>
             <span class="t-dim">这条是硬编码，配置面板里关不掉。</span>
           </div>`, {color:'coral'})}
      </div>
    </div>

    <div class="grid" style="grid-template-columns:1fr 1fr" id="srcBottom">
      ${win('今日入流时间轴',
        `<div id="inflowChart" style="display:flex;align-items:flex-end;gap:2px;height:80px"></div>
         <div class="row t-xs t-dim" style="margin-top:5px;font-weight:700">
           <span>00</span><span class="sp"></span><span>09</span><span class="sp"></span>
           <span>15</span><span class="sp"></span><span>23</span>
         </div>`, {color:'sky', sub:'峰值 15:00 盘后公告 · 23:00 nightly'})}
      ${win('最近入库','<div id="recentList"></div>',{color:'pink', sub:'写入即打 provenance'})}
    </div>`;

  /* 分组 tab（全部 = 一屏看完 16 张卡带） */
  const tabs = $('#srcTabs');
  const allOn = DATA.sources.filter(s=>s.on).length;
  const ball = el('button','px-btn' + (SRC_TAB==='all'?' on':''), `全部 <span class="t-xs">${allOn}/${DATA.sources.length}</span>`);
  ball.onclick = ()=>{ SRC_TAB='all'; RENDER.sources(); };
  tabs.appendChild(ball);
  DATA.groups.forEach(g=>{
    const n = DATA.sources.filter(s=>s.g===g.k).length;
    const onN = DATA.sources.filter(s=>s.g===g.k && s.on).length;
    const b = el('button','px-btn' + (SRC_TAB===g.k?' on':''), `${g.n} <span class="t-xs">${onN}/${n}</span>`);
    b.onclick = ()=>{ SRC_TAB = g.k; RENDER.sources(); };
    tabs.appendChild(b);
  });

  drawCarts();
  drawPrio();
  drawRackStat();
  drawInflow();
  drawRecent();

  $$('[data-preset]').forEach(b=> b.onclick = ()=> applyPreset(b.dataset.preset));
};

function drawInflow(){
  const box = $('#inflowChart'); if(!box) return;
  const max = Math.max(...DATA.inflow);
  box.innerHTML = '';
  DATA.inflow.forEach((v,h)=>{
    const col = el('div');
    col.style.cssText = `flex:1;height:${Math.max(4, v/max*80)}px;
      background:${h===15?'var(--mustard)':h>=22?'var(--coral)':'var(--sky)'};
      box-shadow:inset 0 0 0 2px var(--ink);
      background-image:repeating-linear-gradient(0deg,transparent 0 4px,rgba(63,43,35,.28) 4px 6px)`;
    col.title = `${String(h).padStart(2,'0')}:00 — ${v} 条`;
    box.appendChild(col);
  });
}

function drawRecent(){
  const box = $('#recentList'); if(!box) return;
  box.innerHTML = DATA.recent.map(r=>`
    <div style="border-bottom:2px dotted rgba(63,43,35,.28);padding:4px 0;font-size:10px;line-height:1.6">
      <span class="t-dim">${r.t}</span>
      <span class="tag ${r.conf>=5?'gold':r.conf>=4?'cyan':''}">${r.src}</span>
      <div style="margin-top:2px">${r.txt}</div>
    </div>`).join('');
}

function drawCarts(){
  const zone = $('#cartZone'); if(!zone) return;
  zone.innerHTML = '';
  const groups = SRC_TAB === 'all' ? DATA.groups : DATA.groups.filter(g=> g.k === SRC_TAB);
  groups.forEach(g=>{
    const list = DATA.sources.filter(s=> s.g === g.k);
    zone.appendChild(el('div','grp-head',
      `<span class="cap">${g.tag}</span><span class="t-xs t-dim" style="font-weight:700">${g.n}</span>
       <span class="sp"></span><span class="t-xs t-dim" style="font-weight:700">${list.filter(s=>s.on).length}/${list.length} 已插</span>`));
    const grid = el('div','cart-grid');
    grid.style.marginBottom = '18px';
    list.forEach(s=> grid.appendChild(makeCart(s)));
    zone.appendChild(grid);
  });
}

function makeCart(s){
  const c = el('div','px-panel cart' + (s.on ? ' lit' : ' dead'));
  c.dataset.id = s.id;
  c.innerHTML = `
      <div class="cart-top">
        <div>
          <div class="nm">${s.n} ${s.locked?'<span class="tag rose">LOCK</span>':''}${s.live?'<span class="tag cyan">🟢实时</span>':''}${s.auth&&s.auth.includes('待接入')||s.t==='待接入'?'<span class="tag">待接入</span>':''}</div>
          <div class="t-xs t-dim">${s.t} · ${s.freq}</div>
        </div>
        <i class="led"></i>
      </div>
      <div class="stars">${stars(s.conf)} <span class="t-xs t-dim">置信</span></div>
      <div class="slotpins"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
      <div class="meta">
        <span>${freshIcon(s.fresh)}</span>
        <span>今日 <b class="t-gold">${s.today}</b> 条</span>
      </div>
      `;
  c.onclick = ()=> openSourceDrawer(s.id);
  return c;
}

function drawPrio(){
  const box = $('#prioChain'); if(!box) return;
  box.innerHTML = '';
  DATA.prio.forEach((p,i)=>{
    if(i) box.appendChild(el('span','arw','▶'));
    const l = el('div','lnk', p);
    l.draggable = true;
    l.dataset.i = i;
    l.ondragstart = e=>{ e.dataTransfer.setData('text/plain', i); l.classList.add('drag'); };
    l.ondragend = ()=> l.classList.remove('drag');
    l.ondragover = e=> e.preventDefault();
    l.ondrop = e=>{
      e.preventDefault();
      const from = +e.dataTransfer.getData('text/plain');
      const item = DATA.prio.splice(from,1)[0];
      DATA.prio.splice(i,0,item);
      drawPrio();
    };
    box.appendChild(l);
  });
}

function drawRackStat(){
  const box = $('#rackStat'); if(!box) return;
  const on = DATA.sources.filter(s=>s.on);
  const todayTotal = on.reduce((a,s)=>a+s.today,0);
  const paid = on.filter(s=>s.locked).length;
  const avgConf = on.length ? (on.reduce((a,s)=>a+s.conf,0)/on.length).toFixed(1) : '0.0';
  box.innerHTML = `
    <div class="row" style="justify-content:space-between"><span class="t-xs t-dim">已插卡带</span><b>${on.length} / ${DATA.sources.length}</b></div>
    <div class="px-bar" style="margin:5px 0 9px"><i style="width:${on.length/DATA.sources.length*100}%"></i></div>
    <div class="row" style="justify-content:space-between"><span class="t-xs t-dim">今日入流</span><b class="t-gold">${todayTotal.toLocaleString()} 条</b></div>
    <div class="row" style="justify-content:space-between"><span class="t-xs t-dim">平均置信</span><b>${avgConf} / 5.0</b></div>
    <div class="row" style="justify-content:space-between"><span class="t-xs t-dim">受限源</span><b class="t-rose">${paid} 个</b></div>`;
  syncTopbar();
}

function openSourceDrawer(id){
  const s = DATA.sources.find(x=>x.id===id);
  openDrawer(`
    <div class="win-bar" style="background:${s.locked?'var(--coral)':'var(--teal)'}">
      <span>${s.n}</span><span class="dots" id="dwClose" style="cursor:pointer">_ □ ×</span>
    </div>
    <div style="padding:11px">
    <div class="t-xs t-dim" style="margin-bottom:8px;font-weight:700">${s.t} · ${s.freq} · ${s.locked?'LOCK · 受限源':'开放源'}</div>
    <div class="t-sm" style="line-height:1.7;margin-bottom:12px">${s.note}</div>

    <div class="field">
      <label>插槽</label>
      <div class="opts">
        <div class="opt ${s.on?'on':''}" data-act="plug" data-v="1">▣ 已插上</div>
        <div class="opt ${!s.on?'on':''}" data-act="plug" data-v="0">□ 已拔下</div>
      </div>
    </div>
    <div class="field">
      <label>认证方式</label>
      <div class="opts">
        ${['无','Cookie','API Key','MCP endpoint'].map(a=>`<div class="opt ${s.auth===a?'on':''}" data-act="auth" data-v="${a}">${a}</div>`).join('')}
      </div>
    </div>
    <div class="field">
      <label>拉取频率</label>
      <div class="opts">
        ${['实时推流','2h 轮询','盘后','日频','按需'].map(a=>`<div class="opt ${s.freq===a?'on':''}" data-act="freq" data-v="${a}">${a}</div>`).join('')}
      </div>
    </div>
    <div class="field">
      <label>入库桶</label>
      <div class="opts">
        ${['research_assets','personal_assets','code_assets','art_assets','—'].map(a=>`<div class="opt ${s.bucket===a?'on':''}" data-act="bucket" data-v="${a}">${a}</div>`).join('')}
      </div>
    </div>
    <div class="field">
      <label>置信度（决定它在冲突里的话语权）</label>
      <div class="opts">
        ${[1,2,3,4,5].map(a=>`<div class="opt ${s.conf===a?'on':''}" data-act="conf" data-v="${a}">${a}★</div>`).join('')}
      </div>
    </div>
    <hr class="hr" style="margin:13px 0 11px">
    <button class="px-btn on dotted" id="btnTest" style="width:100%;margin-bottom:9px">▶ 测试连接</button>
    <div class="console" id="testLog">// 等待测试…</div>
    ${s.locked ? '<div class="bridge" style="margin-top:11px">LOCK · 该源为受限源。可入库、可内部引用；<b>外发管线会自动剥离源名</b>，此行为不可配置。</div>' : ''}
    </div>
  `);
  $('#dwClose').onclick = closeDrawer;
  $$('#drawer .opt').forEach(o=> o.onclick = ()=>{
    const act = o.dataset.act, v = o.dataset.v;
    if(act === 'plug') s.on = v === '1';
    else if(act === 'conf') s.conf = +v;
    else s[act] = v;
    RENDER.sources();        /* 重画卡带 + tab 计数 */
    openSourceDrawer(id);    /* 抽屉保持打开 */
  });
  $('#btnTest').onclick = ()=> runSourceTest(s);
}

async function runSourceTest(s){
  const log = $('#testLog'); if(!log) return;
  const btn = $('#btnTest'); btn.disabled = true;
  log.innerHTML = '';
  const lines = [
    ['握手 ' + (s.auth === '无' ? '(免认证)' : '(' + s.auth + ')') + '…', ' ✓'],
    ['拉取样本 3 条…', ' ✓'],
    [s.bucket === '—' ? '校验字段 schema…' : '写入 ' + s.bucket + '…', ' ✓']
  ];
  for(const [txt, ok] of lines){
    await typeInto(log, '\n> ' + txt, 11);
    await sleep(210);
    log.innerHTML += '<span class="ok">' + ok + '</span>';
  }
  if(s.conf <= 2){
    await typeInto(log, '\n! ', 11);
    log.innerHTML += '<span class="er">置信 ' + s.conf + '★ — 已标记灰点，需二次交叉才可引用</span>';
  }
  await sleep(160);
  s.on = true;
  drawCarts(); drawRackStat();
  const card = $(`.cart[data-id="${s.id}"]`);
  if(card){ card.classList.add('flash'); setTimeout(()=>card.classList.remove('flash'), 500); }
  btn.disabled = false;
}

async function applyPreset(k){
  if(k === 'none'){
    DATA.sources.forEach(s=> s.on = false);
    drawCarts(); drawRackStat(); return;
  }
  const ids = DATA.presets[k].ids;
  DATA.sources.forEach(s=> s.on = false);
  drawCarts(); drawRackStat();
  /* 依次通电，制造机架上电的连锁感 */
  for(const id of ids){
    const s = DATA.sources.find(x=>x.id===id);
    s.on = true;
    const card = $(`.cart[data-id="${id}"]`);
    if(card){
      card.classList.remove('dead'); card.classList.add('lit','flash');
      setTimeout(()=>card.classList.remove('flash'), 380);
    }
    drawRackStat();
    await sleep(60);
  }
  drawCarts(); drawRackStat();
}

function syncTopbar(){
  $('#tbSrc').textContent = srcCount() + '/' + DATA.sources.length;
}

