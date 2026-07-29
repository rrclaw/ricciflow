/* ricciflow — INSIGHT 灵感流（真实实时）
   接 kb-bridge /api/insight → search_alpha 机构搜索热度突破点检测
   每天只取 3 个刚萌芽的新兴主题。桥不在线才回落，且明确标注。 */

let INSIGHT_CACHE = null;
let INSIGHT_AT = 0;

async function insightFetch(force){
  const now = Date.now();
  if(INSIGHT_CACHE && !force && now - INSIGHT_AT < 6 * 3600 * 1000) return INSIGHT_CACHE;
  try {
    const r = await fetch(BRIDGE + '/api/insight?n=3', {signal: AbortSignal.timeout(13000)});
    const j = await r.json();
    if(j.ok && j.items && j.items.length){
      INSIGHT_CACHE = {live:true, ...j}; INSIGHT_AT = now;
      return INSIGHT_CACHE;
    }
  } catch(e){}
  /* 回落：明确标注非实时 */
  INSIGHT_CACHE = {live:false, source:'演示占位（本地桥未运行）', items:[
    {theme:'（示例）超节点', ratio:2.6, count:45, fresh:false, hook:'跑起 kb-bridge 就是真实的机构周环比热搜', why:'启动本地桥后此处显示本周涨最快/新起的机构热点'},
  ]};
  INSIGHT_AT = now;
  return INSIGHT_CACHE;
}

async function renderInsightFeed(mount){
  const box = mount || $('#ideaFeed'); if(!box) return;
  box.innerHTML = '<div class="t-dim" style="font-weight:700;padding:8px">扫描机构搜索热度…</div>';
  const d = await insightFetch();
  const methodAll = d.live
    ? `热搜=机构搜索关键词周环比（本周 vs 上周），取涨最快 + 本周新起。🔥数=热度分级。数据截至 ${d.as_of||''}。实时源 aihot/polymarket 接入中。`
    : '本地桥未运行，显示演示占位。跑起 kb-bridge 即为真实机构热搜。';
  box.innerHTML = `
    <div class="row" style="margin-bottom:7px">
      <span class="tag ${d.live?'cyan':'rose'}">${d.live?'🟢 实时':'演示'}</span>
      ${infoDot(methodAll)}
      <span class="sp"></span>
      <button class="px-btn sm ghost" id="insightRefresh">↻</button></div>` +
    d.items.map((it, i)=>`
      <div class="gap-item" style="margin-bottom:7px">
        <div class="gt">
          <b style="flex:1;font-size:13px">${it.theme}</b>
          <span title="热度">${'🔥'.repeat(it.heat||1)}</span>
          ${infoDot(it.method || '')}
        </div>
        ${it.topic?`<div class="why" style="color:var(--dim)">引子：${it.topic}</div>`:''}
        ${it.src?`<div class="t-xs" style="color:var(--dim);font-weight:700;margin-top:2px">源：${it.src}${it.vol?' · $'+it.vol+'M':''}</div>`:''}
        <div class="row" style="gap:4px;margin-top:4px">
          <button class="px-btn sm" data-ins-go="${it.theme}">▸ 立课题</button>
          <button class="px-btn sm ghost" data-ins-ask="${it.theme}">? 怎么问</button>
          <button class="px-btn sm ghost" data-ins-clue="${it.theme}">≡ 存线索</button>
        </div>
      </div>`).join('');
  const rf = $('#insightRefresh'); if(rf) rf.onclick = async ()=>{ await insightFetch(true); renderInsightFeed(mount); };
  $$('[data-ins-go]').forEach(b=> b.onclick = ()=>{
    DATA.tickets.push({id:'t'+Date.now(), title:b.dataset.insGo, stage:0, days:0,
      prov:'灵感·search_alpha', recipe:{src:['SemiAnalysis','高临'], res:['tech'], mode:'快研'}});
    toast('已开票：' + b.dataset.insGo + ' → 进「灵感」列');
    if(typeof drawKanban === 'function') drawKanban();
  });
  $$('[data-ins-ask]').forEach(b=> b.onclick = ()=> openInquiry(b.dataset.insAsk));
  $$('[data-ins-clue]').forEach(b=> b.onclick = ()=>{
    DATA.clues.push({src:'search_alpha', hook:b.dataset.insClue});
    toast('已存线索池');
  });
}
