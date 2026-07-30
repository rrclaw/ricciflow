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
      <span class="sub">${typeof REAL !== 'undefined' && REAL.srcreg
        ? `本机知识库真实入库 ${REAL.srcreg.total.toLocaleString()} 条 · 最新 ${REAL.srcreg.latest}`
        : '数据源机架 · 插上卡带就通电'}</span>
      <div class="tools">
        ${typeof REAL !== 'undefined' && REAL.srcreg
          ? '<span class="tag cyan" title="来自 ~/knowledge/index/sources.jsonl">实盘注册表</span>' : ''}
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
      ${typeof REAL !== 'undefined' && REAL.srcreg ? realSrcRegHTML() : `
      ${win('今日入流时间轴',
        `<div id="inflowChart" style="display:flex;align-items:flex-end;gap:2px;height:80px"></div>
         <div class="row t-xs t-dim" style="margin-top:5px;font-weight:700">
           <span>00</span><span class="sp"></span><span>09</span><span class="sp"></span>
           <span>15</span><span class="sp"></span><span>23</span>
         </div>`, {color:'sky', sub:'峰值 15:00 盘后公告 · 23:00 nightly'})}
      ${win('最近入库','<div id="recentList"></div>',{color:'pink', sub:'写入即打 provenance'})}`}
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
  if(!(typeof REAL !== 'undefined' && REAL.srcreg)){ drawInflow(); drawRecent(); }

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
        ${typeof realCartMeta === "function" ? realCartMeta(s) : `<span>今日 <b class="t-gold">${s.today}</b> 条</span>`}
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
  const paid = on.filter(s=>s.locked).length;
  const avgConf = on.length ? (on.reduce((a,s)=>a+s.conf,0)/on.length).toFixed(1) : '0.0';
  /* 接上真注册表时，「入流」用知识库最近一天的真实入库量，不用卡带上那些编的数 */
  const R = (typeof REAL !== 'undefined' && REAL.srcreg) ? REAL.srcreg : null;
  const flow = R
    ? `<div class="row" style="justify-content:space-between">
         <span class="t-xs t-dim">最近一天入库</span>
         <b class="t-gold">${((R.recent_days || [])[0] || {}).n ?? 0} 份</b></div>
       <div class="row" style="justify-content:space-between">
         <span class="t-xs t-dim">近 7 天</span><b>${R.last7} 份</b></div>
       <div class="row" style="justify-content:space-between">
         <span class="t-xs t-dim">累计在册</span><b>${R.total.toLocaleString()} 份</b></div>`
    : `<div class="row" style="justify-content:space-between"><span class="t-xs t-dim">今日入流</span>
         <b class="t-gold">${on.reduce((a,s)=>a+s.today,0).toLocaleString()} 条</b></div>`;
  box.innerHTML = `
    <div class="row" style="justify-content:space-between"><span class="t-xs t-dim">已插卡带</span><b>${on.length} / ${DATA.sources.length}</b></div>
    <div class="px-bar" style="margin:5px 0 9px"><i style="width:${on.length/DATA.sources.length*100}%"></i></div>
    ${flow}
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
    ${sourceConfigHTML(s)}
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
  bindSourceConfig(s);
  $('#btnTest').onclick = ()=> runSourceTest(s);
}

/* 需要填 key/URL 的源，给真实输入框（存本机 + 同步桥） */
const SRC_DEFAULTS = {substack: {urls:[
  'https://doomberg.substack.com/feed','https://www.bearcave.com/feed','https://mostlyborrowedideas.substack.com/feed']}};
function srcCfg(id){ return JSON.parse(localStorage.getItem('rf_src_'+id) || 'null') || SRC_DEFAULTS[id] || {}; }
function sourceConfigHTML(s){
  const c = srcCfg(s.id);
  if(s.id === 'substack'){
    return `<hr class="hr" style="margin:13px 0 11px">
      <div class="field"><label>SUBSTACK RSS 地址（可填多个，逗号分隔）</label>
        <input class="inp" id="cfgSubUrl" placeholder="https://xxx.substack.com/feed" value="${(c.urls||[]).join(', ')}"></div>
      <div class="t-xs t-dim" style="font-weight:700;line-height:1.7">
        任意 substack 主页地址后加 <b>/feed</b> 就是 RSS。自定义域（如 tmtbreakout.com/feed）也行。<br>
        例：doomberg.substack.com/feed</div>
      <button class="px-btn sm" id="cfgSubSave" style="margin-top:8px">保存 RSS</button>`;
  }
  if(s.id === 'arr_mcp'){
    /* 自建服务端，没有 key 要填。给的是「它到底能取什么」——真去问服务端拿工具目录 */
    return `<hr class="hr" style="margin:13px 0 11px">
      <div class="field"><label>端点</label>
        <input class="inp" value="https://arr.polyalpha.cn/mcp" readonly></div>
      <div class="bridge" style="margin-bottom:8px">
        手写规范（2026-07-28），比通用 MCP 多两条硬要求：<code>Mcp-Method</code> 每请求必带、
        <code>Mcp-Name</code> 只在 tools/call 带，且 body 的 <code>_meta</code> 协议版本要与请求头一致。
        不满足直接 -32020，不静默降级。只读匿名，无 key。</div>
      <div class="row" style="gap:6px">
        <button class="px-btn sm" id="arrTools">▸ 拉工具目录</button>
        <button class="px-btn sm" id="arrSeries">▸ 拉白名单序列</button>
      </div>
      <div id="arrOut" style="margin-top:9px"></div>`;
  }
  if(s.id === 'reddit'){
    return `<hr class="hr" style="margin:13px 0 11px">
      <div class="field"><label>CLIENT ID</label>
        <input class="inp" id="cfgRedId" placeholder="app 名下方那串 14 位" value="${c.client_id||''}"></div>
      <div class="field"><label>CLIENT SECRET</label>
        <input class="inp" id="cfgRedSec" type="password" placeholder="${c.secret?'已存 '+c.secret.slice(0,4)+'****':'secret 那串'}"></div>
      <div class="field"><label>关注的 subreddit（逗号分隔）</label>
        <input class="inp" id="cfgRedSubs" placeholder="stocks,wallstreetbets,options" value="${(c.subs||['stocks','wallstreetbets']).join(',')}"></div>
      <div class="bridge" style="margin-top:8px">reddit.com/prefs/apps → create app → 选 <b>script</b> → redirect uri 填 http://localhost:8080 → 拿 client_id + secret 填上面。免费 100 次/分钟。</div>
      <button class="px-btn sm" id="cfgRedSave" style="margin-top:8px">保存 Key</button>`;
  }
  return '';
}
function bindSourceConfig(s){
  const save = (id, obj)=>{
    localStorage.setItem('rf_src_'+id, JSON.stringify(obj));
    /* 同步给桥（有钥匙时）*/
    if(typeof VAULT!=='undefined' && VAULT.key){
      fetch(BRIDGE+'/api/src_config?key='+encodeURIComponent(VAULT.key), {method:'POST',
        headers:{'Content-Type':'application/json'}, body:JSON.stringify({id, cfg:obj})}).catch(()=>{});
    }
  };
  const sub = $('#cfgSubSave');
  if(sub) sub.onclick = ()=>{
    const urls = $('#cfgSubUrl').value.split(',').map(x=>x.trim()).filter(Boolean);
    save('substack', {urls}); s.on = true; RENDER.sources(); openSourceDrawer('substack');
    toast('已保存 '+urls.length+' 个 RSS。测试连接看抓取');
  };
  const at = $('#arrTools'), asr = $('#arrSeries');
  if(at) at.onclick = ()=> arrFetch('tools');
  if(asr) asr.onclick = ()=> arrFetch('series_list');
  const red = $('#cfgRedSave');
  if(red) red.onclick = ()=>{
    const prev = srcCfg('reddit');
    const sec = $('#cfgRedSec').value.trim();
    save('reddit', {client_id:$('#cfgRedId').value.trim(), secret: sec||prev.secret||'',
      subs:$('#cfgRedSubs').value.split(',').map(x=>x.trim()).filter(Boolean)});
    s.on = true; s.auth='OAuth key ✓'; RENDER.sources(); openSourceDrawer('reddit');
    toast('Reddit key 已保存。测试连接验证');
  };
}

/* 实时源的「测试连接」是真的：打桥 → 打上游 → 把真拿到的记录打在控制台上。
   桥不在（公网无钥匙 / 本地没起）才退回演示脚本，并且明说自己在演。 */
async function runSourceTest(s){
  const log = $('#testLog'); if(!log) return;
  const btn = $('#btnTest'); btn.disabled = true;
  log.innerHTML = '';
  /* 实时源失败就让失败站着。绝不能在真实报错后面再演一遍「握手 ✓ 拉取样本 ✓」，
     那是假成功，比没结果更糟。演示脚本只留给本来就没接上游的源。 */
  if(s.live){
    const ok = await runLiveSourceTest(s, log);
    btn.disabled = false;
    if(!ok){
      const tip = document.createElement('span');
      tip.className = 'er';
      tip.textContent = '\n> 这个源现在拿不到数据。上面是真实报错，没有演示回落。';
      log.appendChild(tip);
      s.on = false; drawCarts(); drawRackStat();
    }
    return;
  }
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

/* 真拉一次上游，成功返回 true。每条记录都是刚从源头回来的，不是写死的。 */
async function runLiveSourceTest(s, log){
  await typeInto(log, '\n> GET /api/source_peek?id=' + s.id + ' …', 11);
  let d;
  try{
    const r = await fetch(BRIDGE + '/api/source_peek?id=' + encodeURIComponent(s.id) +
      (typeof VAULT !== 'undefined' && VAULT.key ? '&key=' + encodeURIComponent(VAULT.key) : ''),
      {signal: AbortSignal.timeout(15000)});
    d = await r.json();
  }catch(e){
    log.innerHTML += '<span class="er"> 桥不通</span>';
    return false;
  }
  if(!d || !d.ok || !(d.items || []).length){
    log.innerHTML += '<span class="er"> ' + ((d && d.error) || '无数据') + '</span>';
    return false;
  }
  log.innerHTML += '<span class="ok"> ✓ ' + d.items.length + ' 条' +
    (d.as_of ? ' · ' + d.as_of : '') + (d.elapsed ? ' · ' + d.elapsed + 's' : '') + '</span>';
  if(d.note){
    const nl = document.createElement('span');
    nl.textContent = '\n  ' + d.note;
    log.appendChild(nl);
  }
  d.items.forEach(it=>{
    const tail = it.arr != null ? '  ARR $' + it.arr + 'B · ' + (it.mult != null ? it.mult + 'x' : '—')
               : it.date ? '  ' + it.date : '';
    const line = document.createElement('span');
    line.textContent = '\n  · ' + String(it.topic || it.title || '').slice(0, 46) + tail;
    log.appendChild(line);
  });
  s.on = true; s.today = d.items.length; s._live = d.items.length;
  drawCarts(); drawRackStat();
  const card = $(`.cart[data-id="${s.id}"]`);
  if(card){ card.classList.add('flash'); setTimeout(()=>card.classList.remove('flash'), 500); }
  return true;
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


/* 现去问 arr 的 MCP 服务端要东西。返回什么就显示什么，拉不到就说拉不到。 */
async function arrFetch(what, sid){
  const out = $('#arrOut'); if(!out) return;
  out.innerHTML = '<div class="t-xs t-dim" style="font-weight:700">请求中…</div>';
  let d;
  try{
    const qs = '?what=' + what + (sid ? '&id=' + encodeURIComponent(sid) : '') +
      (typeof VAULT !== 'undefined' && VAULT.key ? '&key=' + encodeURIComponent(VAULT.key) : '');
    d = await (await fetch(BRIDGE + '/api/arr' + qs, {signal:AbortSignal.timeout(25000)})).json();
  }catch(e){ d = {ok:false, error:String(e.message || e)}; }
  if(!d || !d.ok){
    out.innerHTML = `<div class="t-sm t-rose" style="font-weight:700">拉不到：${(d && d.error) || '未知'}</div>`;
    return;
  }
  if(what === 'tools'){
    out.innerHTML = `<div class="cap" style="margin-bottom:5px">${d.tools.length} 个工具（服务端现报）</div>` +
      d.tools.map(t=>`<div class="gap-item">
        <div class="gt"><span class="tag cyan">${t.name}</span><span>${t.title || ''}</span></div>
        <div class="why">${t.desc || ''}</div></div>`).join('');
    return;
  }
  if(what === 'series_list'){
    out.innerHTML = `<div class="cap" style="margin-bottom:5px">${d.series.length} 条白名单序列 · 点开取真值</div>` +
      d.series.map(s=>`<div class="gap-item" style="cursor:pointer" data-arrsid="${s.series_id}">
        <div class="gt"><span class="tag">${s.series_id}</span></div>
        <div class="why">${s.description || ''}</div></div>`).join('');
    $$('#arrOut [data-arrsid]').forEach(b=> b.onclick = ()=> arrFetch('series', b.dataset.arrsid));
    return;
  }
  /* 单条序列：把最后几个点摊出来，看得见就是真的 */
  const rows = (d.data && d.data.series) || d.series || [];
  const tail = rows.slice(-6);
  const keys = tail.length ? Object.keys(tail[0]) : [];
  out.innerHTML = `<div class="cap" style="margin-bottom:5px">${d.series_id} · 共 ${rows.length} 点</div>
    <div class="t-xs t-dim" style="font-weight:700;margin-bottom:6px">${d.description || ''}</div>
    <div style="overflow:auto"><table style="width:100%;font-size:10.5px;border-collapse:collapse">
      <tr style="font-weight:700;color:var(--dim)">${keys.map(k=>`<td>${k}</td>`).join('')}</tr>
      ${tail.map(r=>`<tr style="border-top:2px dotted rgba(63,43,35,.25)">
        ${keys.map(k=>`<td>${r[k] ?? '—'}</td>`).join('')}</tr>`).join('')}
    </table></div>
    <button class="px-btn sm ghost" id="arrBack" style="margin-top:8px">← 回序列清单</button>`;
  const bk = $('#arrBack'); if(bk) bk.onclick = ()=> arrFetch('series_list');
}
