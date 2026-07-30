/* ricciflow — 组件: 知识库 KNOWLEDGE ATLAS
   加载方式: 传统 <script> 顺序加载（零构建、file:// 可直开）。
   模块间通过顶层声明共享（var/function 提升到全局作用域）。 */

/* ==========================================================================
   SECTION 14 — 知识库 ATLAS
   MAP 与 GRAPH 共用同一份节点模型，避免两个视图讲两个故事。
   字段：docs 篇数 / conf 来源置信 0-1 / fresh 最近一篇距今天数 / edges 依赖
   ========================================================================== */
/* 这里以前写死了 60 个假节点（ATLAS_RAW）。已删。
   节点现在全部来自 ~/knowledge 的 125 页行业 wiki，走公开层端点 /api/wiki，
   访客不用钥匙也看得到真图谱；只有 wiki 原文与缺口一手证据需要钥匙。 */

/* 真实 wiki 的 parent_sector 有二十来个大类，写死 6 个域会让新域拿不到颜色、
   覆盖度按 0 个节点算出 NaN。所以域列表与配色都从当前节点集推导。 */
function atlasDomains(){
  const seen = [];
  DATA.atlas.forEach(n=>{ if(!seen.includes(n.domain)) seen.push(n.domain); });
  return seen;
}
const DOMAIN_PALETTE = ['#57bfb4','#7fa8dd','#e9b23c','#ef86ad','#e8535a','#7a8a5e',
                        '#9b7fd4','#d98b4a','#4fa3a0','#c05fa0','#6f9f5a','#b07a5e'];
function domainHex(d){
  if(DOMAIN_HEX[d]) return DOMAIN_HEX[d];
  let h = 0; for(const ch of String(d)) h = (h * 31 + ch.charCodeAt(0)) & 0xffff;
  return DOMAIN_PALETTE[h % DOMAIN_PALETTE.length];
}
const DOMAIN_COLOR = {'半导体':'var(--teal)','AI算力':'var(--sky)','新能源':'var(--mustard)',
  '消费':'var(--pink)','医药':'var(--coral)','军工':'#7a8a5e'};
const DOMAIN_HEX = {'半导体':'#57bfb4','AI算力':'#7fa8dd','新能源':'#e9b23c',
  '消费':'#ef86ad','医药':'#e8535a','军工':'#7a8a5e'};

/* 节点集由 applyRealAtlas()（real.js）从真实 wiki 灌进来。开局为空。 */
DATA.atlas = [];
function inDegree(id){ return DATA.atlas.filter(n=> n.edges.includes(id)).length; }

let ATLAS_LAYER = 'all';       /* all | raw | validated */
let ATLAS_VIEW = 'map';        /* map | graph */
let ATLAS_DIM  = 'industry';   /* industry | company | conf | fresh */
let ATLAS_CO   = '';

/* 按公司维度：由 applyRealAtlas() 从个股 wiki 的 belongs_to 反查填充 */
const COMPANY_MAP = {};

function plotClass(n){
  if(n.docs === 0) return 'fog';
  if(n.docs >= 5 && n.fresh < 90) return 'rich';
  return 'mid';
}
function nodeColor(n){
  if(ATLAS_DIM === 'industry') return domainHex(n.domain);
  if(ATLAS_DIM === 'company'){
    const names = COMPANY_MAP[ATLAS_CO] || [];
    return names.includes(n.name) ? '#e9b23c' : '#cfc4b6';
  }
  if(ATLAS_DIM === 'conf'){
    if(n.docs === 0) return '#6f6a86';
    return n.conf >= .8 ? '#e9b23c' : n.conf >= .55 ? '#57bfb4' : '#9b8574';
  }
  /* fresh */
  if(n.docs === 0) return '#6f6a86';
  return n.fresh <= 30 ? '#57bfb4' : n.fresh <= 90 ? '#e9b23c' : '#e8535a';
}

RENDER.atlas = function(){
  const scr = $('#scr-atlas');
  if(!DATA.atlas.length){
    scr.innerHTML = `
      <div class="screen-head"><h1>KNOWLEDGE ATLAS</h1>
        <span class="sub">节点来自本机 125 页行业 wiki</span></div>
      ${win('图谱还没加载', `<div class="t-sm" style="font-weight:700;line-height:1.9">
          ${typeof REAL !== 'undefined' && REAL.pubErr
            ? '连不上本地桥：<span class="t-rose">' + REAL.pubErr + '</span><br>先跑 <code>python3.11 bridge/kb_bridge.py</code>。'
            : '正在读 ~/knowledge…'}</div>
        <div class="t-xs t-dim" style="font-weight:700;margin-top:8px">
          这里不会用写死的假节点占位。图谱要么是真的，要么空着。</div>`, {color:'ink'})}`;
    if(typeof loadPublic === 'function' && !REAL.pub)
      loadPublic().then(ok=>{ if(ok && PANEL_OPEN === 'atlas') RENDER.atlas(); });
    return;
  }
  const gaps = DATA.atlas.filter(n=> n.docs === 0 || (n.docs <= 2 && n.fresh > 120))
    .map(n=> ({n, score: inDegree(n.id)*10 + (n.docs===0?8:3)}))
    .sort((a,b)=> b.score - a.score).slice(0,7);

  scr.innerHTML = `
    <div class="screen-head">
      <h1>KNOWLEDGE ATLAS</h1>
      <span class="sub">${typeof REAL !== 'undefined' && REAL.kb
        ? `本机 ~/knowledge 真图谱 · ${REAL.kb.n_industry} 页行业 + ${REAL.kb.n_stock} 页个股`
        : '知识库 · 有点有边，亮的是有货，灰的是黑洞'}</span>
      <div class="tools">
        ${typeof REAL !== 'undefined' && REAL.kb
          ? `<span class="tag cyan" title="节点=行业 wiki 页；docs=sources.jsonl 标到它头上的原始材料份数；fresh=最近一份距今天数">实盘知识库 · ${REAL.kb.as_of}</span>`
          : '<span class="tag">公开层 · 真图谱</span>'}
        <button class="px-btn ${ATLAS_VIEW==='map'?'on':''}" data-view="map">▦ MAP</button>
        <button class="px-btn ${ATLAS_VIEW==='graph'?'on':''}" data-view="graph">◈ GRAPH</button>
      </div>
    </div>

    ${win('切换维度', `<div class="row wrap">
        <button class="px-btn sm ${ATLAS_DIM==='industry'?'on':''}" data-dim="industry">按行业</button>
        <button class="px-btn sm ${ATLAS_DIM==='company'?'on':''}" data-dim="company">按公司</button>
        <button class="px-btn sm ${ATLAS_DIM==='conf'?'on':''}" data-dim="conf">按来源置信度</button>
        <button class="px-btn sm ${ATLAS_DIM==='fresh'?'on':''}" data-dim="fresh">按时效性</button>
        ${ATLAS_DIM==='company' ? `<span class="sp" style="max-width:20px"></span>
          ${Object.keys(COMPANY_MAP).map(c=>`<button class="px-btn sm ${ATLAS_CO===c?'on':''}" data-co="${c}">${c}</button>`).join('')}` : ''}
        <span class="cap" style="margin-left:10px">图层</span>
        <button class="px-btn sm ${ATLAS_LAYER==='all'?'on':''}" data-layer="all">全部</button>
        <button class="px-btn sm ${ATLAS_LAYER==='raw'?'on':''}" data-layer="raw">只看原始</button>
        <button class="px-btn sm ${ATLAS_LAYER==='validated'?'on':''}" data-layer="validated">只看沉淀 ⚑</button>
        <button class="px-btn sm" id="btnVaultRoom">🔐 机房 · 内部资料库</button>
        <span class="sp"></span>
        <span class="t-xs t-dim" style="font-weight:700">${DATA.atlas.length} 节点 · ${DATA.atlas.filter(n=>n.docs===0).length} 黑洞 · ⚑${DATA.atlas.reduce((a,n)=>a+(n.validated||0),0)} 条沉淀</span>
      </div>
      <div class="legend" id="atlasLegend"></div>`, {color:'ink'})}

    <div class="atlas">
      ${win(ATLAS_VIEW==='map' ? 'MAP · 产业大陆' : 'GRAPH · 依赖网络',
        ATLAS_VIEW==='map'
          ? '<div class="atlas-stage" id="atlasStage"></div>'
          : '<canvas id="graphCanvas"></canvas>',
        {color:'sky', sub: ATLAS_VIEW==='map' ? '悬停看详情 · 灰块=没有材料' : '拖不动，它自己会稳定', bodyStyle:'padding:6px'})}
      <div class="col">
        ${win('缺口清单', `<div class="t-xs t-dim" style="margin-bottom:8px;line-height:1.6;font-weight:700">
            按「被依赖数 × 缺失程度」排序。<br>知识图谱不只是给你看的，它生产任务。</div>
          <div id="gapList"></div>`, {color:'coral'})}
        ${win('覆盖度', '<div id="coverList"></div>', {color:'mustard'})}
      </div>
    </div>`;

  $$('[data-view]').forEach(b=> b.onclick = ()=>{ ATLAS_VIEW = b.dataset.view; RENDER.atlas(); });
  $$('[data-dim]').forEach(b=> b.onclick = ()=>{ ATLAS_DIM = b.dataset.dim; RENDER.atlas(); });
  $$('[data-co]').forEach(b=> b.onclick = ()=>{ ATLAS_CO = b.dataset.co; RENDER.atlas(); });
  $$('[data-layer]').forEach(b=> b.onclick = ()=>{ ATLAS_LAYER = b.dataset.layer; RENDER.atlas(); });
  const vr = $('#btnVaultRoom'); if(vr) vr.onclick = ()=> openVaultRoom();

  drawLegend();
  drawGaps(gaps);
  drawCoverage();
  if(ATLAS_VIEW === 'map') drawMap(); else drawGraph();
};

function drawLegend(){
  const box = $('#atlasLegend'); if(!box) return;
  const sets = {
    industry: atlasDomains().map(d=>[domainHex(d), d]),
    company:  [['#e9b23c','该公司证据链上'],['#cfc4b6','无关节点']],
    conf:     [['#e9b23c','专家一手'],['#57bfb4','卖方 / 公开披露'],['#9b8574','网络二手（只做灰点）'],['#6f6a86','无材料']],
    fresh:    [['#57bfb4','≤30 天'],['#e9b23c','30-90 天'],['#e8535a','>90 天 已陈旧'],['#6f6a86','无材料']]
  };
  box.innerHTML = sets[ATLAS_DIM].map(([c,t])=>`<span><i style="background:${c}"></i>${t}</span>`).join('');
}

function drawMap(){
  const stage = $('#atlasStage'); if(!stage) return;
  stage.innerHTML = '';
  /* 三列两排，按舞台实宽铺开，别在右边留一大块空地 */
  const stageW = stage.clientWidth || 900;
  const colW = Math.max(184, Math.floor((stageW - 24) / 3));
  /* 真实模式下域有二十来个，节点少的排后面，免得一堆只有一页的域占满第一屏。
     域数一多就切流式布局，绝对定位那套只在原来那 6 个写死的域下排得开。 */
  const order = atlasDomains()
    .map(d=> [d, DATA.atlas.filter(n=> n.domain === d).length])
    .sort((a, b)=> b[1] - a[1]).map(x=> x[0]);
  const flow = order.length > 6;
  stage.classList.toggle('flow', flow);
  order.forEach((dom, idx)=>{
    const c = el('div','continent');
    if(!flow){
      c.style.left = (10 + (idx % 3) * colW) + 'px';
      c.style.top  = (8 + Math.floor(idx / 3) * 246) + 'px';
    }
    const list = DATA.atlas.filter(n=>n.domain===dom);
    const have = list.filter(n=>n.docs>0).length;
    c.innerHTML = `<div class="cname" style="background:${domainHex(dom)};color:${dom==='新能源'?'var(--ink)':'#fff'}">${dom} ${have}/${list.length}</div>`;
    const plots = el('div','plots');
    if(flow){
      /* 大陆按节点数开列：TMT 有 68 个点，跟只有 2 个点的域用同样列宽会拉成一根面条 */
      const cols = Math.max(3, Math.min(8, Math.ceil(Math.sqrt(list.length))));
      plots.style.gridTemplateColumns = `repeat(${cols},34px)`;
      plots.style.maxWidth = 'none';
    }
    list.forEach(n=>{
      const p = el('div','plot ' + plotClass(n) + (n.fresh > 180 && n.docs > 0 ? ' stale' : ''));
      if(ATLAS_LAYER === 'raw' && n.validated) p.style.opacity = .25;
      if(ATLAS_LAYER === 'validated' && !n.validated) p.style.opacity = .18;
      /* 楼高 = 篇数，楼宽 = 置信度，窗户 = 像素点阵 */
      const h = n.docs === 0 ? 0 : clamp(5 + n.docs*2.2, 7, 27);
      const w = n.docs === 0 ? 0 : Math.round(clamp(9 + n.conf*10, 9, 19));
      p.innerHTML = n.docs === 0
        ? '<span class="q">?</span>'
        : `<i class="bld" style="height:${h}px;width:${w}px;background:${nodeColor(n)};
             background-image:repeating-linear-gradient(0deg,transparent 0 3px,rgba(63,43,35,.34) 3px 5px),
                              repeating-linear-gradient(90deg,transparent 0 3px,rgba(63,43,35,.34) 3px 5px)"></i>` +
          (n.validated ? `<span class="gold-flag" title="沉淀 ${n.validated} 条">⚑</span>` : '');
      p.onmousemove = e=> showTip(atlasTip(n), e);
      p.onmouseleave = hideTip;
      p.onclick = ()=> openNodeDrawer(n);
      plots.appendChild(p);
    });
    c.appendChild(plots);
    stage.appendChild(c);
  });
}

function atlasTip(n){
  const dep = inDegree(n.id);
  if(n.docs === 0) return `<b>${n.name}</b> · ${n.domain} / ${n.layer}<br>
    <span style="color:#e8535a">缺口：0 篇材料</span><br>下游有 ${dep} 个节点依赖它<br>
    <span style="opacity:.7">点一下可以派研究员去补</span>`;
  return `<b>${n.name}</b> · ${n.domain} / ${n.layer}<br>
    ${n.docs} 篇 · 最近 ${n.fresh} 天前<br>
    来源：${n.sources.join(' / ')}<br>
    置信 ${(n.conf*100).toFixed(0)}% · 被 ${dep} 个节点依赖`;
}

function openNodeDrawer(n){
  const dep = DATA.atlas.filter(x=> x.edges.includes(n.id));
  const isReal = !!n.slug;
  openDrawer(`
    <div class="win-bar" style="background:${domainHex(n.domain)}">
      <span>${n.name}</span><span class="dots" id="dwClose" style="cursor:pointer">_ □ ×</span>
    </div>
    <div style="padding:12px">
      <div class="row wrap" style="margin-bottom:10px">
        <span class="tag">${n.domain}</span><span class="tag">${n.layer}</span>
        ${n.docs===0?'<span class="tag rose">黑洞 · 0 篇</span>':`<span class="tag gold">${n.docs} 篇</span>`}
        ${n.fresh>180&&n.docs>0?'<span class="tag rose">已陈旧</span>':''}
        ${isReal && n.stance ? `<span class="tag ${n.stance==='bullish'?'cyan':n.stance==='bearish'?'rose':''}">${n.stance}</span>` : ''}
        ${isReal && n.updated ? `<span class="t-xs t-dim" style="font-weight:700">更新于 ${n.updated}</span>` : ''}
      </div>
      ${isReal ? `
      <div class="cap" style="margin-bottom:5px">原始材料层</div>
      <div class="t-sm" style="margin-bottom:11px">
        ${n.docs ? `<b>${n.docs}</b> 份原始材料标到这个行业头上，最近一份 <b>${n.fresh}</b> 天前 ·
          来源置信均值 ${(n.conf*100).toFixed(0)}%`
          : '<span class="t-rose">这一页在，但没有任何原始材料标到它头上 —— 这就是真实缺口</span>'}
      </div>
      <div style="background:${n.gaps?'#fdf3d9':'var(--cream2)'};box-shadow:inset 0 0 0 2px var(--ink);padding:7px 8px;margin-bottom:11px">
        <div class="cap" style="margin-bottom:4px">⚑ 已解析缺口（三方背离账本）</div>
        ${n.gaps
          ? `<div class="t-sm" style="font-weight:700">${n.gaps} 条</div>
             <div class="t-xs t-dim" style="font-weight:700">来自 wiki/_RESOLVED_GAPS.json，一手证据与市场预期不一致的地方</div>`
          : '<div class="t-xs t-dim" style="font-weight:700">这一页还没有被标出过背离</div>'}
      </div>
      <button class="px-btn on dotted" id="btnWikiOpen" style="width:100%;margin-bottom:11px">📖 打开这一页 wiki 原文</button>`
      : `
      <div class="cap" style="margin-bottom:5px">原始材料层</div>
      <div class="t-sm" style="margin-bottom:11px">${n.sources.length?n.sources.map(s=>`<span class="tag cyan" style="margin:0 3px 3px 0">${s}</span>`).join(''):'<span class="t-rose">无</span>'}</div>
      <div style="background:${n.validated?'#fdf3d9':'var(--cream2)'};box-shadow:inset 0 0 0 2px var(--ink);padding:7px 8px;margin-bottom:11px">
        <div class="cap" style="margin-bottom:4px">⚑ 沉淀成果层（老板打标）</div>
        ${n.validated
          ? `<div class="t-sm" style="font-weight:700">${n.validated} 条已验证结论</div>
             <div class="t-xs t-dim" style="font-weight:700">检索加权 ×2 · 与原始层硬隔离，永不混淆</div>`
          : '<div class="t-xs t-dim" style="font-weight:700">空 · 在研究对话框里「打标沉淀」后出现</div>'}
      </div>`}
      <div class="cap" style="margin-bottom:5px">下游依赖它的节点（${dep.length}）</div>
      <div class="t-sm" style="margin-bottom:11px">${dep.length?dep.map(d=>`<span class="tag">${d.name}</span>`).join(' '):'<span class="t-dim">无</span>'}</div>
      <hr class="hr" style="margin:12px 0">
      <div class="cap" style="margin-bottom:6px">派研究员去补</div>
      <div class="row wrap" id="dispatchRow">
        ${DATA.researchers.filter(r=>!r.veto).map(r=>`<button class="px-btn sm" data-r="${r.id}">${r.n}</button>`).join('')}
      </div>
      <div class="t-xs t-dim" style="margin-top:9px;line-height:1.6">
        派单会落进研究员的任务收件箱。真实系统里这会触发一次定向检索 + 入库。
      </div>
    </div>`);
  $('#dwClose').onclick = closeDrawer;
  const wo = $('#btnWikiOpen');
  if(wo) wo.onclick = ()=> openWikiPage(n.slug);
  $$('#dispatchRow [data-r]').forEach(b=> b.onclick = ()=>{
    const r = dispatchTask(b.dataset.r, `补 ${n.name}`);
    b.classList.add('on'); b.textContent = '✓ ' + r.n + ' 已接单';
  });
}

function drawGaps(gaps){
  const box = $('#gapList'); if(!box) return;
  box.innerHTML = '';
  gaps.forEach(({n})=>{
    const dep = inDegree(n.id);
    const item = el('div','gap-item', `
      <div class="gt">
        ${n.docs===0?'<span class="tag rose">0 篇</span>':`<span class="tag">${n.docs} 篇 / ${n.fresh}d</span>`}
        <span>${n.name}</span>
      </div>
      <div class="why">${n.domain} · ${n.layer} — ${dep>0?`上游有 ${dep} 个节点依赖它`:'链条末端，暂无下游依赖'}${n.docs>0?'，且最近一篇已经 '+n.fresh+' 天前':''}</div>
      <button class="px-btn sm" data-gap="${n.id}">▸ 派研究员去补</button>`);
    box.appendChild(item);
  });
  $$('[data-gap]').forEach(b=> b.onclick = ()=>{
    const n = DATA.atlas.find(x=>x.id === b.dataset.gap);
    openNodeDrawer(n);
  });
}

function drawCoverage(){
  const box = $('#coverList'); if(!box) return;
  let sum = 0, cnt = 0;
  box.innerHTML = atlasDomains().map(dom=>{
    const list = DATA.atlas.filter(n=>n.domain===dom);
    /* 覆盖度 = 每个节点的「深度 × 时效」取平均。
       只按「有没有材料」算会骗自己：8 个节点各 1 篇陈稿也能算 90%。 */
    const score = list.reduce((a,n)=>{
      if(n.docs === 0) return a;
      const depth = Math.min(1, n.docs / 5);
      const decay = n.fresh <= 30 ? 1 : n.fresh <= 90 ? .7 : n.fresh <= 180 ? .4 : .15;
      return a + depth * decay;
    }, 0);
    const pct = list.length ? Math.round(score / list.length * 100) : 0;
    sum += pct; cnt++;
    return `<div class="cover-meter">
      <span>${dom}</span>
      <span class="px-bar thin"><i style="width:${pct}%;background:${domainHex(dom)}"></i></span>
      <span style="text-align:right">${pct}%</span>
    </div>`;
  }).join('') + `<div class="t-xs t-dim" style="margin-top:7px;line-height:1.6;font-weight:700">
    覆盖度 = 每个节点的「深度 × 时效」取平均。<br>
    只数「有没有材料」会骗自己：8 个节点各 1 篇陈稿也能算 90%。</div>`;
  $('#tbCover').textContent = (cnt ? Math.round(sum / cnt) : 0) + '%';
}

/* ---- GRAPH：60 行 Verlet 力导向，画成像素方块 ---- */
let graphRAF = null;
function drawGraph(){
  const cv = $('#graphCanvas'); if(!cv) return;
  if(graphRAF) cancelAnimationFrame(graphRAF);
  const W = cv.clientWidth, H = 452;
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  resetSeed();
  const nodes = DATA.atlas.map((n,i)=>{
    const ang = i / DATA.atlas.length * Math.PI * 2;
    return {n, x: W/2 + Math.cos(ang)*(120 + rnd()*90), y: H/2 + Math.sin(ang)*(90 + rnd()*70), vx:0, vy:0};
  });
  const byId = {}; nodes.forEach(p=> byId[p.n.id] = p);
  const links = [];
  DATA.atlas.forEach(n=> n.edges.forEach(e=>{ if(byId[e]) links.push([byId[n.id], byId[e]]); }));

  let ticks = 0;
  function step(){
    ticks++;
    /* 斥力 */
    for(let i=0;i<nodes.length;i++){
      for(let j=i+1;j<nodes.length;j++){
        const a=nodes[i], b=nodes[j];
        let dx=b.x-a.x, dy=b.y-a.y, d2=dx*dx+dy*dy || .01;
        if(d2 > 26000) continue;
        const f = 900 / d2;
        const d = Math.sqrt(d2);
        const ux=dx/d, uy=dy/d;
        a.vx -= ux*f; a.vy -= uy*f; b.vx += ux*f; b.vy += uy*f;
      }
    }
    /* 引力（边） */
    links.forEach(([a,b])=>{
      const dx=b.x-a.x, dy=b.y-a.y, d=Math.hypot(dx,dy)||.01;
      const f = (d - 54) * .012;
      const ux=dx/d, uy=dy/d;
      a.vx += ux*f; a.vy += uy*f; b.vx -= ux*f; b.vy -= uy*f;
    });
    /* 同域内聚 + 阻尼 + 边界 */
    nodes.forEach(p=>{
      p.vx += (W/2 - p.x) * .0016; p.vy += (H/2 - p.y) * .0016;
      p.vx *= .86; p.vy *= .86;
      p.x = clamp(p.x + p.vx, 16, W-16);
      p.y = clamp(p.y + p.vy, 16, H-16);
    });

    ctx.clearRect(0,0,W,H);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(63,43,35,.26)';
    links.forEach(([a,b])=>{
      ctx.beginPath();
      ctx.moveTo(Math.round(a.x), Math.round(a.y));
      ctx.lineTo(Math.round(b.x), Math.round(b.y));
      ctx.stroke();
    });
    nodes.forEach(p=>{
      const s = p.n.docs === 0 ? 7 : clamp(7 + Math.sqrt(p.n.docs)*3, 8, 20);
      const x = Math.round(p.x - s/2), y = Math.round(p.y - s/2);
      if(ATLAS_LAYER === 'validated' && !p.n.validated) return;
      if(ATLAS_LAYER === 'raw' && p.n.validated){ ctx.globalAlpha = .25; }
      if(p.n.validated){
        ctx.fillStyle = '#e9b23c'; ctx.fillRect(x-4, y-4, s+8, s+8);
      }
      ctx.fillStyle = '#3f2b23';
      ctx.fillRect(x-2, y-2, s+4, s+4);
      ctx.fillStyle = nodeColor(p.n);
      ctx.fillRect(x, y, s, s);
      ctx.globalAlpha = 1;
      if(p.n.docs === 0){
        ctx.fillStyle = '#fff'; ctx.font = 'bold 9px monospace';
        ctx.fillText('?', x + s/2 - 3, y + s/2 + 3);
      }
      if(p.n.docs >= 8){
        ctx.fillStyle = '#3f2b23'; ctx.font = 'bold 9px ui-monospace,monospace';
        ctx.fillText(p.n.name, Math.round(p.x - p.n.name.length*4.5), Math.round(p.y + s/2 + 11));
      }
    });
    if(ticks < 400) graphRAF = requestAnimationFrame(step);
  }
  step();

  /* 悬停查节点 */
  cv.onmousemove = e=>{
    const r = cv.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    const hit = nodes.find(p=> Math.abs(p.x-mx) < 12 && Math.abs(p.y-my) < 12);
    if(hit) showTip(atlasTip(hit.n), e); else hideTip();
  };
  cv.onmouseleave = hideTip;
  cv.onclick = e=>{
    const r = cv.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    const hit = nodes.find(p=> Math.abs(p.x-mx) < 12 && Math.abs(p.y-my) < 12);
    if(hit) openNodeDrawer(hit.n);
  };
}

