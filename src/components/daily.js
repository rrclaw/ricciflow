/* ricciflow — 组件: 老板日报（咖啡机）
   聚合五类等老板拍板的事：跟踪日报 / 缺口 / 考核警报 / 拦截记录 / 外出情报 / 挖角 offer。
   research.js 右栏与本组件同源（renderDailyItems）。 */

DATA.daily = [
  {k:'offer', hot:true, t:'08:02', txt:'挖角 offer：城堡量化给 量化研究员 开价 3.2× 薪资，48h 内答复', act:'处理'},
  {k:'track', t:'08:00', txt:'跟踪日报 · 数据中心外溢北欧：纽约禁批 50MW+ / Boden 拿地 210 英亩 ~180MW / Skien 打桩', act:'看全文'},
  {k:'gap',   t:'07:40', txt:'缺口提醒：光刻胶仍是知识库黑洞，深研票被它卡住', act:'去补'},
  {k:'review',t:'07:30', txt:'考核警报：消费研究员连续 2 季末位，进入 PIP 观察期', act:'看考核'},
  {k:'block', t:'昨日',  txt:'拦截记录：1 次追高冲动被原则闸拦下（冷静间隔 4 分钟）', act:'看记录'},
  {k:'intel', t:'昨日',  txt:'外出情报：成长股研究员从同行饭局带回 2 条 ★★★ 线索', act:'看线索'}
];

function pushDaily(k, txt){
  DATA.daily.unshift({k, t:'刚刚', txt, act:'看'});
  if(PANEL_OPEN === 'daily') RENDER.daily();
  const rail = $('#dailyRail');
  if(rail) drawDailyRail();
  /* 重要事件 → 系统通知（notify.js） */
  if(typeof notifyBoss === 'function' && (k === 'offer' || k === 'block'))
    notifyBoss('里奇流资本', txt);
}

const DAILY_TAG = {offer:['rose','挖角'], track:['cyan','跟踪'], gap:['rose','缺口'],
  review:['gold','考核'], block:['gold','拦截'], intel:['cyan','情报'], sink:['gold','沉淀']};

function renderDailyItems(compact){
  return DATA.daily.slice(0, compact ? 6 : 99).map((d,i)=>`
    <div class="gap-item" ${d.hot?'style="box-shadow:inset 0 0 0 2px var(--coral), inset 0 0 0 4px var(--ink)"':''}>
      <div class="why" style="color:var(--ink);font-size:10px">
        <span class="tag ${DAILY_TAG[d.k]?.[0]||''}">${DAILY_TAG[d.k]?.[1]||d.k}</span>
        <span class="t-dim">${d.t}</span><br>${d.txt}</div>
      ${d.k==='offer' ? `<div class="row" style="gap:4px">
          <button class="px-btn sm" data-of="keep">加薪挽留 +40%</button>
          <button class="px-btn sm ghost" data-of="let">放走</button>
          <button class="px-btn sm ghost" data-of="counter">反谈</button></div>`
        : `<button class="px-btn sm ghost" data-dact="${i}">▸ ${d.act}</button>`}
    </div>`).join('');
}

function bindDailyItems(root){
  $$('[data-of]', root).forEach(b=> b.onclick = ()=> resolveOffer(b.dataset.of));
  $$('[data-dact]', root).forEach(b=> b.onclick = ()=>{
    const d = DATA.daily[+b.dataset.dact];
    const jump = {track:'research', gap:'atlas', review:'desk', block:'trading', intel:'research'};
    if(jump[d.k]) openComponent(jump[d.k]); else toast('已读');
  });
}

function resolveOffer(choice){
  const q = DATA.researchers.find(r=>r.id==='quant');
  const offer = DATA.daily.find(d=>d.k==='offer');
  if(!offer) return;
  DATA.daily = DATA.daily.filter(d=>d!==offer);
  if(choice === 'keep'){
    q.salaryUp = true;
    pushDaily('review', '已加薪挽留量化研究员（成本 +40%）。他撤回了辞呈，附赠一句「早该如此」');
    toast('挽留成功，工资条哭了');
  } else if(choice === 'let'){
    q.gone = true;
    pushDaily('review', '量化研究员已跳槽城堡量化。名册移入「前员工」。走前把因子库文档补完了，体面');
    toast('放走了。江湖再见');
  } else {
    const kept = true;  /* demo 固定成功，避免演示翻车 */
    q.counterOffered = true;
    pushDaily('review', '反谈成功：量化研究员留下（薪资 +15% + 模拟仓额度翻倍）。城堡量化 HR 表示遗憾');
    toast('反谈成功');
  }
  if(PANEL_OPEN === 'daily') RENDER.daily();
  if($('#dailyRail')) drawDailyRail();
}

RENDER.daily = function(){
  const root = $('#scr-daily');
  root.innerHTML = `
    <div class="screen-head">
      <h1>老板日报 · DAILY BRIEF</h1>
      <span class="sub">咖啡机旁的一页纸 —— 只放需要你拍板或该你知道的</span>
    </div>
    <div style="display:grid;grid-template-columns:1fr 300px;gap:12px;align-items:start">
      ${win('待办与情报流', renderDailyItems(false), {color:'pink', sub:'按紧急度排序'})}
      <div class="col">
        ${win('推送渠道', `
          <div class="t-xs" style="font-weight:700;line-height:1.9">
            重要事件除了进日报，还能推到：</div>
          <div id="notifyChannels"></div>`, {color:'sky', sub:'在「系统」里配置'})}
        ${win('今日跟踪摘要', `<div class="minutes" style="font-size:10px">
          <h4>数据中心外溢 · ${$('#tbDate').textContent}</h4>
          ${DATA.tracking.routes.map(r=>`<div class="sec"><span class="k">${r.k}</span> ${r.intel[0].txt}</div>`).join('')}
        </div>`, {color:'teal', sub:'与跟踪票同源'})}
      </div>
    </div>`;
  bindDailyItems(root);
  if(typeof renderChannelChips === 'function') renderChannelChips($('#notifyChannels'));
};
