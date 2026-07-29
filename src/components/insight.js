/* ricciflow — INSIGHT 灵感流（真实实时）
   接 kb-bridge /api/insight → search_alpha 机构搜索热度突破点检测
   每天只取 3 个刚萌芽的新兴主题。桥不在线才回落，且明确标注。 */

let INSIGHT_CACHE = null;
let INSIGHT_AT = 0;

async function insightFetch(force){
  const now = Date.now();
  if(INSIGHT_CACHE && !force && now - INSIGHT_AT < 6 * 3600 * 1000) return INSIGHT_CACHE;
  try {
    const r = await fetch(BRIDGE + '/api/insight?n=3', {signal: AbortSignal.timeout(6000)});
    const j = await r.json();
    if(j.ok && j.items && j.items.length){
      INSIGHT_CACHE = {live:true, ...j}; INSIGHT_AT = now;
      return INSIGHT_CACHE;
    }
  } catch(e){}
  /* 回落：明确标注非实时 */
  INSIGHT_CACHE = {live:false, source:'演示占位（本地桥未运行）', items:[
    {theme:'（示例）AI光模块', score:66, hook:'跑起 kb-bridge 就是真实的 search_alpha 突破点', why:'启动本地桥后此处显示每日实时萌芽热点', smart_money:false, maturity:''},
  ]};
  INSIGHT_AT = now;
  return INSIGHT_CACHE;
}

async function renderInsightFeed(mount){
  const box = mount || $('#ideaFeed'); if(!box) return;
  box.innerHTML = '<div class="t-dim" style="font-weight:700;padding:8px">扫描机构搜索热度…</div>';
  const d = await insightFetch();
  box.innerHTML = `
    <div class="row" style="margin-bottom:7px">
      <span class="tag ${d.live?'cyan':'rose'}">${d.live?'🟢 实时':'演示'}</span>
      <span class="t-xs t-dim" style="font-weight:700">${d.source || ''}</span>
      <span class="sp"></span>
      <button class="px-btn sm ghost" id="insightRefresh">↻</button></div>` +
    d.items.map((it, i)=>`
      <div class="gap-item" style="margin-bottom:7px">
        <div class="gt">
          <span class="tag gold">#${i+1} 萌芽</span>
          <b style="flex:1">${it.theme}</b>
          ${it.smart_money?'<span class="tag cyan" title="聪明分析师同步在搜">🧠</span>':''}
          ${it.score?`<span class="tag">突破 ${it.score}</span>`:''}
        </div>
        <div class="why" style="color:var(--ink)">${it.hook || ''}</div>
        ${it.why?`<div class="t-xs t-dim" style="font-weight:700;line-height:1.6;margin:3px 0 5px">为什么现在看：${it.why}</div>`:''}
        <div class="row" style="gap:4px">
          <button class="px-btn sm" data-ins-go="${it.theme}">▸ 立课题研究</button>
          <button class="px-btn sm ghost" data-ins-ask="${it.theme}">? 怎么问</button>
          <button class="px-btn sm ghost" data-ins-clue="${it.theme}">≡ 存线索</button>
        </div>
      </div>`).join('') +
    `<div class="t-xs t-dim" style="font-weight:700;line-height:1.6;margin-top:4px">
       ${d.live?'突破点=机构搜索热度刚从沉寂里抬头，正是萌芽期。每天最多 3 个，不贪多。':''}</div>`;
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
