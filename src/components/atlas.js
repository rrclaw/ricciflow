/* ricciflow — 组件: 知识库 KNOWLEDGE ATLAS
   加载方式: 传统 <script> 顺序加载（零构建、file:// 可直开）。
   模块间通过顶层声明共享（var/function 提升到全局作用域）。 */

/* ==========================================================================
   SECTION 14 — 知识库 ATLAS
   MAP 与 GRAPH 共用同一份节点模型，避免两个视图讲两个故事。
   字段：docs 篇数 / conf 来源置信 0-1 / fresh 最近一篇距今天数 / edges 依赖
   ========================================================================== */
/* [名称, 环节层, docs, conf, freshDays, 主要来源] */
const ATLAS_RAW = {
  '半导体':[
    ['光刻机','设备',6,.75,12,['SemiAnalysis','巨潮资讯公告']],
    ['刻蚀机','设备',9,.85,4,['高临 Third Bridge','巨潮资讯公告']],
    ['薄膜沉积','设备',7,.8,9,['高临 Third Bridge']],
    ['量测设备','设备',2,.5,96,['进门财经']],
    ['混合键合','设备',1,.6,152,['SemiAnalysis']],
    ['减薄机','设备',0,0,999,[]],
    ['光刻胶','材料',3,.9,210,['SemiAnalysis','高临 Third Bridge']],
    ['电子特气','材料',8,.8,6,['TrendForce','巨潮资讯公告']],
    ['CMP 抛光液','材料',4,.7,38,['进门财经']],
    ['大硅片','材料',11,.75,3,['巨潮资讯公告','akshare']],
    ['靶材','材料',5,.65,44,['进门财经']],
    ['掩膜版','材料',0,0,999,[]],
    ['湿电子化学品','材料',2,.55,120,['知识星球']],
    ['EDA 工具','设计',3,.7,61,['SemiAnalysis']],
    ['IP 核','设计',1,.5,188,['Substack 精选']],
    ['封测','制造',9,.7,5,['巨潮资讯公告','财联社电报']]],
  'AI算力':[
    ['HBM','存储',14,.9,1,['SemiAnalysis','TrendForce']],
    ['先进封装 CoWoS','封装',10,.85,3,['SemiAnalysis','高临 Third Bridge']],
    ['光模块 800G','互联',12,.8,2,['巨潮资讯公告','进门财经']],
    ['铜连接','互联',3,.6,55,['SemiAnalysis']],
    ['交换芯片','网络',5,.7,21,['SemiAnalysis']],
    ['液冷','散热',8,.75,7,['巨潮资讯公告']],
    ['服务器电源','供电',4,.6,33,['进门财经']],
    ['PCB 高多层','基材',9,.8,4,['巨潮资讯公告','TrendForce']],
    ['GPU','算力',13,.85,1,['SemiAnalysis','Substack 精选']],
    ['自研 ASIC','算力',6,.7,11,['SemiAnalysis']],
    ['电力供给','基建',2,.5,140,['财联社电报']],
    ['IDC 上架率','基建',1,.45,175,['知识星球']]],
  '新能源':[
    ['磷酸铁锂','正极',7,.7,8,['巨潮资讯公告']],
    ['三元前驱体','正极',4,.65,29,['进门财经']],
    ['隔膜','辅材',6,.7,14,['巨潮资讯公告']],
    ['电解液','辅材',5,.65,17,['进门财经']],
    ['六氟磷酸锂','辅材',3,.6,48,['TrendForce']],
    ['固态电池','技术',9,.6,2,['财联社电报','知识星球']],
    ['硅碳负极','负极',4,.7,25,['高临 Third Bridge']],
    ['光伏银浆','光伏',2,.55,88,['进门财经']],
    ['HJT 电池','光伏',3,.5,66,['知识星球']],
    ['逆变器','光伏',5,.7,19,['巨潮资讯公告']],
    ['风电主轴','风电',1,.5,196,['进门财经']],
    ['储能 PCS','储能',6,.7,10,['巨潮资讯公告']]],
  '消费':[
    ['白酒渠道库存','白酒',3,.8,26,['久谦中台']],
    ['啤酒吨价','啤酒',1,.7,182,['久谦中台']],
    ['原奶价格','乳品',2,.6,71,['进门财经']],
    ['调味品动销','调味',0,0,999,[]],
    ['宠物食品','新消费',1,.5,133,['知识星球']],
    ['医美耗材','新消费',2,.6,94,['久谦中台']],
    ['免税客单','出行',0,0,999,[]],
    ['快递单价','物流',3,.65,41,['巨潮资讯公告']]],
  '医药':[
    ['CXO 订单','外包',2,.7,58,['高临 Third Bridge']],
    ['GLP-1','创新药',3,.75,22,['Substack 精选']],
    ['创新药出海','创新药',1,.6,164,['进门财经']],
    ['医疗设备招标','设备',1,.55,118,['财联社电报']],
    ['血制品','生物制品',0,0,999,[]],
    ['IVD 集采','诊断',0,0,999,[]],
    ['中药提价','中药',1,.5,205,['进门财经']],
    ['疫苗批签发','生物制品',0,0,999,[]]],
  '军工':[
    ['军用连接器','元件',2,.6,77,['进门财经']],
    ['碳纤维','材料',3,.65,52,['巨潮资讯公告']],
    ['高温合金','材料',4,.7,31,['高临 Third Bridge']],
    ['惯导','分系统',1,.55,151,['进门财经']],
    ['雷达 T/R 组件','分系统',2,.6,86,['进门财经']],
    ['卫星互联网','总体',5,.6,13,['财联社电报']],
    ['无人机','总体',6,.65,9,['财联社电报','巨潮资讯公告']],
    ['军工电子元器件','元件',3,.6,63,['巨潮资讯公告']]]
};

const DOMAIN_COLOR = {'半导体':'var(--teal)','AI算力':'var(--sky)','新能源':'var(--mustard)',
  '消费':'var(--pink)','医药':'var(--coral)','军工':'#7a8a5e'};
const DOMAIN_HEX = {'半导体':'#57bfb4','AI算力':'#7fa8dd','新能源':'#e9b23c',
  '消费':'#ef86ad','医药':'#e8535a','军工':'#7a8a5e'};

/* 展平 + 自动生成依赖边：同域按顺序串联，另加若干跨域真实依赖 */
DATA.atlas = [];
Object.keys(ATLAS_RAW).forEach(dom=>{
  ATLAS_RAW[dom].forEach((r,i)=>{
    DATA.atlas.push({id:dom+'_'+i, domain:dom, layer:r[1], name:r[0],
      docs:r[2], conf:r[3], fresh:r[4], sources:r[5], edges:[]});
  });
});
function nodeByName(n){ return DATA.atlas.find(x=>x.name===n); }
Object.keys(ATLAS_RAW).forEach(dom=>{
  const list = DATA.atlas.filter(n=>n.domain===dom);
  list.forEach((n,i)=>{ if(i) n.edges.push(list[i-1].id); });
});
[['光刻胶','光刻机'],['光刻胶','封测'],['光刻胶','大硅片'],['减薄机','混合键合'],
 ['减薄机','封测'],['掩膜版','光刻机'],['HBM','先进封装 CoWoS'],['HBM','大硅片'],
 ['先进封装 CoWoS','混合键合'],['GPU','HBM'],['液冷','电力供给'],['PCB 高多层','铜连接'],
 ['固态电池','硅碳负极'],['储能 PCS','逆变器'],['调味品动销','原奶价格'],
 ['免税客单','快递单价'],['IVD 集采','医疗设备招标'],['血制品','疫苗批签发'],
 ['碳纤维','无人机'],['高温合金','卫星互联网']
].forEach(([a,b])=>{
  const na = nodeByName(a), nb = nodeByName(b);
  if(na && nb && !na.edges.includes(nb.id)) na.edges.push(nb.id);
});

/* 被依赖数：缺口排序用 */
function inDegree(id){ return DATA.atlas.filter(n=> n.edges.includes(id)).length; }

/* 沉淀层种子：原始材料 vs 老板打标验证后的成果，两层硬隔离（需求 8） */
[['光刻胶',2],['HBM',3],['先进封装 CoWoS',2],['电子特气',1],['液冷',1],['白酒渠道库存',1],['固态电池',1]]
  .forEach(([n,v])=>{ const x = nodeByName(n); if(x) x.validated = v; });

let ATLAS_LAYER = 'all';       /* all | raw | validated */
let ATLAS_VIEW = 'map';        /* map | graph */
let ATLAS_DIM  = 'industry';   /* industry | company | conf | fresh */
let ATLAS_CO   = '中芯国际';

const COMPANY_MAP = {
  '中芯国际':['大硅片','刻蚀机','薄膜沉积','光刻胶','电子特气','掩膜版','封测'],
  '北方华创':['刻蚀机','薄膜沉积','量测设备','电子特气','减薄机'],
  '沪硅产业':['大硅片','CMP 抛光液','靶材'],
  '中际旭创':['光模块 800G','铜连接','交换芯片','PCB 高多层'],
  '宁德时代':['磷酸铁锂','隔膜','电解液','六氟磷酸锂','固态电池','硅碳负极'],
  '贵州茅台':['白酒渠道库存','快递单价']
};

function plotClass(n){
  if(n.docs === 0) return 'fog';
  if(n.docs >= 5 && n.fresh < 90) return 'rich';
  return 'mid';
}
function nodeColor(n){
  if(ATLAS_DIM === 'industry') return DOMAIN_HEX[n.domain];
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
  const gaps = DATA.atlas.filter(n=> n.docs === 0 || (n.docs <= 2 && n.fresh > 120))
    .map(n=> ({n, score: inDegree(n.id)*10 + (n.docs===0?8:3)}))
    .sort((a,b)=> b.score - a.score).slice(0,7);

  scr.innerHTML = `
    <div class="screen-head">
      <h1>KNOWLEDGE ATLAS</h1>
      <span class="sub">知识库 · 有点有边，亮的是有货，灰的是黑洞</span>
      <div class="tools">
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
    industry: Object.keys(DOMAIN_HEX).map(d=>[DOMAIN_HEX[d], d]),
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
  const order = Object.keys(ATLAS_RAW);
  Object.keys(ATLAS_RAW).forEach(dom=>{
    const idx = order.indexOf(dom);
    const c = el('div','continent');
    c.style.left = (10 + (idx % 3) * colW) + 'px';
    c.style.top  = (8 + Math.floor(idx / 3) * 246) + 'px';
    const list = DATA.atlas.filter(n=>n.domain===dom);
    const have = list.filter(n=>n.docs>0).length;
    c.innerHTML = `<div class="cname" style="background:${DOMAIN_HEX[dom]};color:${dom==='新能源'?'var(--ink)':'#fff'}">${dom} ${have}/${list.length}</div>`;
    const plots = el('div','plots');
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
  openDrawer(`
    <div class="win-bar" style="background:${DOMAIN_HEX[n.domain]};${n.domain==='新能源'?'color:var(--ink)':''}">
      <span>${n.name}</span><span class="dots" id="dwClose" style="cursor:pointer">_ □ ×</span>
    </div>
    <div style="padding:12px">
      <div class="row wrap" style="margin-bottom:10px">
        <span class="tag">${n.domain}</span><span class="tag">${n.layer}</span>
        ${n.docs===0?'<span class="tag rose">黑洞 · 0 篇</span>':`<span class="tag gold">${n.docs} 篇</span>`}
        ${n.fresh>180&&n.docs>0?'<span class="tag rose">已陈旧</span>':''}
      </div>
      <div class="cap" style="margin-bottom:5px">原始材料层</div>
      <div class="t-sm" style="margin-bottom:11px">${n.sources.length?n.sources.map(s=>`<span class="tag cyan" style="margin:0 3px 3px 0">${s}</span>`).join(''):'<span class="t-rose">无</span>'}</div>
      <div style="background:${n.validated?'#fdf3d9':'var(--cream2)'};box-shadow:inset 0 0 0 2px var(--ink);padding:7px 8px;margin-bottom:11px">
        <div class="cap" style="margin-bottom:4px">⚑ 沉淀成果层（老板打标）</div>
        ${n.validated
          ? `<div class="t-sm" style="font-weight:700">${n.validated} 条已验证结论</div>
             <div class="t-xs t-dim" style="font-weight:700">检索加权 ×2 · 与原始层硬隔离，永不混淆</div>`
          : '<div class="t-xs t-dim" style="font-weight:700">空 · 在研究对话框里「打标沉淀」后出现</div>'}
      </div>
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
  box.innerHTML = Object.keys(ATLAS_RAW).map(dom=>{
    const list = DATA.atlas.filter(n=>n.domain===dom);
    /* 覆盖度 = 每个节点的「深度 × 时效」取平均。
       只按「有没有材料」算会骗自己：8 个节点各 1 篇陈稿也能算 90%。 */
    const score = list.reduce((a,n)=>{
      if(n.docs === 0) return a;
      const depth = Math.min(1, n.docs / 5);
      const decay = n.fresh <= 30 ? 1 : n.fresh <= 90 ? .7 : n.fresh <= 180 ? .4 : .15;
      return a + depth * decay;
    }, 0);
    const pct = Math.round(score / list.length * 100);
    sum += pct; cnt++;
    return `<div class="cover-meter">
      <span>${dom}</span>
      <span class="px-bar thin"><i style="width:${pct}%;background:${DOMAIN_HEX[dom]}"></i></span>
      <span style="text-align:right">${pct}%</span>
    </div>`;
  }).join('') + `<div class="t-xs t-dim" style="margin-top:7px;line-height:1.6;font-weight:700">
    覆盖度 = 每个节点的「深度 × 时效」取平均。<br>
    只数「有没有材料」会骗自己：8 个节点各 1 篇陈稿也能算 90%。</div>`;
  $('#tbCover').textContent = Math.round(sum/cnt) + '%';
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

