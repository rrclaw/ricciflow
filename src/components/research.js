/* ricciflow — 组件: 研究台 THE OFFICE DESK
   灵感流 + 投稿箱 + 六阶段流水线 + 票工作台（金样例×2）。
   全链路：灵感 → 初筛 → 快研 → 深研 → 决策 → 跟踪 */

/* ==========================================================================
   数据
   ========================================================================== */
DATA.ideas = [
  {id:'i1', src:'search_alpha', hook:'「液冷」机构搜索量周环比 +340%，搜索机构数 12 → 41', heat:5},
  {id:'i2', src:'SemiAnalysis', hook:'新帖：HBM4 良率爬坡比指引慢，三家原厂分化加剧', heat:4},
  {id:'i3', src:'Reddit r/hardware', hook:'热帖：二手 H100 租赁价一个月内第三次上调', heat:3},
  {id:'i4', src:'TMT Breakout', hook:'热词榜：「玻璃基板」进前十，环比新增讨论 217 条', heat:3},
  {id:'i5', src:'财联社关键词', hook:'「涨价函」今日出现 9 次，集中在铜箔/树脂', heat:4}
];

const STAGES = ['灵感','初筛','快研','深研','决策','跟踪'];

DATA.tickets = [
  {id:'t_lc',  title:'液冷渗透率拐点', stage:0, days:0, prov:'search_alpha',
   recipe:{src:['SemiAnalysis','巨潮'], res:['tech'], mode:'快研'}},
  {id:'t_gb',  title:'玻璃基板替代 ABF', stage:0, days:1, prov:'TMT Breakout',
   recipe:{src:['SemiAnalysis'], res:['tech','serenity'], mode:'快研'}},
  {id:'t_cu',  title:'铜箔涨价函密度', stage:1, days:1, prov:'财联社关键词',
   recipe:{src:['财联社','filing-keyword'], res:['growth'], mode:'快研'}},
  {id:'t_h100',title:'H100 租赁价三连涨', stage:1, days:2, prov:'Reddit',
   recipe:{src:['web'], res:['quant'], mode:'快研'}},
  {id:'t_ppa', title:'某 CSP 东南亚电力 PPA（投稿）', stage:1, days:0, prov:'老板投稿',
   recipe:{src:['高临','web'], res:['tech','macro'], mode:'交叉验证'}},
  {id:'t_ssd', title:'企业级 SSD 排产回暖', stage:2, days:3, prov:'晨会',
   recipe:{src:['TrendForce','进门财经'], res:['tech','growth'], mode:'快研'}},
  {id:'t_mem', title:'存储涨价外溢设备与材料', stage:3, days:6, prov:'晨会', golden:'deep',
   recipe:{src:['巨潮','SemiAnalysis','高临','stock_data'], res:['serenity','tech','oldmoney'], scene:'反路演', mode:'深研'}},
  {id:'t_gpu', title:'国产 GPU 流片节奏', stage:4, days:9, prov:'饭局线索',
   recipe:{src:['高临','巨潮'], res:['serenity','quant'], mode:'深研'}},
  {id:'t_dc',  title:'北美数据中心外溢北欧', stage:5, days:14, prov:'深度报告', golden:'track',
   recipe:{src:['web','SemiAnalysis'], res:['tech','macro'], mode:'跟踪'}}
];
DATA.clues = [];        /* 线索池 */
DATA.rejects = [];      /* 弃票堆 */

/* 金样例1：深研对话剧本（有 LLM key 时可切实时，见 provider.js） */
DATA.chatScript = [
  {q:'当前 KrF 光刻胶国产验证到哪一步了？月产能多少？',
   a:'两家过了主流产线验证：A 家 12 款胶过验证、月产能约 25 吨；B 家 8 款、月产能 15 吨。合计占国内需求约 6%。<br>关键点：<b>验证过 ≠ 放量</b>，从验证到上量平均还要 2-3 个季度爬坡。',
   srcs:['高临·剥名','巨潮公告'], node:'光刻胶'},
  {q:'Q3 排产环比变化？谁的稼动率在爬？',
   a:'成熟制程稼动率 Q2 末 84% → 7 月 92%（一手排产表，饭局线索已交叉验证）。存储原厂对上游材料的拉货动作 7 月中旬开始，<b>传导顺序：硅片 → 电子特气 → 光刻胶</b>，光刻胶最晚但弹性最大。',
   srcs:['出差调研','TrendForce'], node:'电子特气'},
  {q:'涨价 10% 对该环节净利弹性多大？',
   a:'A 家光刻胶业务占营收 34%，毛利率 41%。假设涨价 10% 全落毛利：净利弹性约 +18%。但注意——<b>国产替代逻辑下他们大概率不敢涨价</b>，抢份额优先。涨价的钱更可能被日系原厂赚走。',
   srcs:['stock_data','年报'], node:'光刻胶'},
  {q:'什么信号出现说明这个逻辑死了？',
   a:'三个下车信号，按杀伤力排序：<br>① 二供验证公告迟于 9 月（扩散逻辑证伪）<br>② 存储现货价连续两周涨幅 &lt;2%（源头熄火）<br>③ A 家中报经营现金流为负（验证放量是纸面故事）<br>建议把 ①③ 挂进跟踪，② 已在晨会跟踪列表里。',
   srcs:['反路演结论'], node:'光刻胶'}
];

DATA.askChains = [
  {layer:'现状层', qs:['当前 KrF 光刻胶国产验证到哪一步了？月产能多少？','行业当前产能利用率和库存水位？']},
  {layer:'边际层', qs:['Q3 排产环比变化？谁的稼动率在爬？','最近一个月订单/价格发生了什么边际变化？']},
  {layer:'弹性层', qs:['涨价 10% 对该环节净利弹性多大？','如果需求超预期 20%，谁的产能弹性最大？']},
  {layer:'证伪层', qs:['什么信号出现说明这个逻辑死了？','当前股价隐含了多少预期？哪些数据能证伪共识？']}
];

/* 金样例2：跟踪自动拆解（rr 原话例子：只说跟踪主题，AI 自动拆四路） */
DATA.tracking = {
  ticket:'t_dc', thesis:'美国本土数据中心建设受阻 → 产能外溢北欧',
  routes:[
    {k:'跟踪抗议', on:true, intel:[
      {t:'07-24', txt:'纽约州法案通过：50MW 以上新建数据中心禁批', cred:3},
      {t:'07-18', txt:'弗吉尼亚 Loudoun 县听证会第 3 次延期', cred:3}]},
    {k:'跟踪政策', on:true, intel:[
      {t:'07-26', txt:'瑞典北部电价补贴法案进入二读', cred:2},
      {t:'07-15', txt:'挪威主权基金表态支持数据基建投资', cred:2}]},
    {k:'跟踪拿地', on:true, intel:[
      {t:'07-27', txt:'某 CSP 于瑞典 Boden 市政府拿地 210 英亩 / 约 $4,200 万 / 对应 ~180MW', cred:3},
      {t:'07-20', txt:'芬兰 Oulu 两宗工业用地挂牌，买家疑似云厂商壳公司', cred:1}]},
    {k:'跟踪建设', on:true, intel:[
      {t:'07-25', txt:'挪威 Skien 园区打桩启动', cred:3},
      {t:'07-22', txt:'丹麦电网公司公告新增并网申请 2 起', cred:3}]}
  ]
};

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
    <div style="display:grid;grid-template-columns:300px 1fr;gap:12px;align-items:start">
      <div class="col">
        ${win('灵感流', '<div id="ideaFeed" style="max-height:46vh;overflow-y:auto"></div>', {color:'mustard', sub:'今天世界在聊什么'})}
        ${win('投稿箱', `
          <div class="field"><label>类型</label>
            <div class="opts" id="subType">
              <div class="opt on" data-v="小段子">小段子</div>
              <div class="opt" data-v="待验证观点">待验证观点</div>
              <div class="opt" data-v="高质量报告">高质量报告</div>
            </div></div>
          <textarea class="inp" id="subText" rows="3" style="resize:none">听说某 CSP 在东南亚偷偷谈了 3 个电力 PPA</textarea>
          <div class="field" style="margin-top:8px"><label>派给谁交叉验证</label>
            <div class="opts" id="subWho">
              ${DATA.researchers.filter(r=>!r.veto).map((r,i)=>
                `<div class="opt ${i<2?'on':''}" data-v="${r.id}">${r.n}</div>`).join('')}
            </div></div>
          <button class="px-btn on dotted" id="subGo" style="width:100%;margin-top:6px">▸ 投进流水线</button>`,
          {color:'pink', sub:'老板的小道消息也是生产资料'})}
      </div>
      <div>${win('流水线', '<div id="kanban"></div>', {color:'teal', sub:'点票卡进工作台 · 金框 = 完整样例'})}</div>
    </div>`;
  if(typeof renderInsightFeed === 'function') renderInsightFeed($('#ideaFeed'));
  else drawIdeas();
  drawKanban();
  bindSubmit();
};

function drawIdeas(){
  const box = $('#ideaFeed'); if(!box) return;
  box.innerHTML = '';
  DATA.ideas.forEach(idea=>{
    box.appendChild(el('div','gap-item', `
      <div class="gt"><span class="tag ${idea.heat>=4?'gold':''}">${idea.src}</span></div>
      <div class="why" style="font-size:10px;color:var(--ink)">${idea.hook}</div>
      <div class="row" style="gap:4px">
        <button class="px-btn sm" data-idea-go="${idea.id}">▸ 开研究</button>
        <button class="px-btn sm ghost" data-idea-keep="${idea.id}">≡ 存线索</button>
        <button class="px-btn sm ghost danger" data-idea-drop="${idea.id}">✕</button>
      </div>`));
  });
  $$('[data-idea-go]').forEach(b=> b.onclick = ()=>{
    const idea = DATA.ideas.find(i=>i.id===b.dataset.ideaGo);
    DATA.tickets.push({id:'t'+Date.now(), title:idea.hook.slice(0, 14)+'…', stage:0, days:0,
      prov:idea.src, recipe:{src:['web'], res:['tech'], mode:'快研'}});
    DATA.ideas = DATA.ideas.filter(i=>i!==idea);
    drawIdeas(); drawKanban(); toast('已开票：进「灵感」列');
  });
  $$('[data-idea-keep]').forEach(b=> b.onclick = ()=>{
    const idea = DATA.ideas.find(i=>i.id===b.dataset.ideaKeep);
    DATA.clues.push(idea); DATA.ideas = DATA.ideas.filter(i=>i!==idea);
    drawIdeas(); toast('已存入线索池（' + DATA.clues.length + '）');
  });
  $$('[data-idea-drop]').forEach(b=> b.onclick = ()=>{
    DATA.ideas = DATA.ideas.filter(i=>i.id!==b.dataset.ideaDrop); drawIdeas();
  });
}

function bindSubmit(){
  $$('#subType .opt').forEach(o=> o.onclick = ()=>{
    $$('#subType .opt').forEach(x=>x.classList.toggle('on', x===o)); });
  $$('#subWho .opt').forEach(o=> o.onclick = ()=> o.classList.toggle('on'));
  $('#subGo').onclick = ()=>{
    const type = $('#subType .opt.on').dataset.v;
    const text = $('#subText').value.trim();
    if(!text) return toast('空投稿不收');
    const who = $$('#subWho .opt.on').map(o=>o.dataset.v);
    DATA.tickets.push({id:'t'+Date.now(), title:`${text.slice(0,13)}…（投稿）`, stage:1, days:0,
      prov:'老板投稿·'+type, recipe:{src:['web','高临'], res:who, mode:'交叉验证'}});
    who.forEach(id=> dispatchTask(id, '交叉验证：' + text.slice(0,10)));
    drawKanban(); toast(`已进「初筛」，派给 ${who.length} 人交叉验证`);
  };
}

function drawKanban(){
  const kb = $('#kanban'); if(!kb) return;
  kb.innerHTML = '';
  kb.style.cssText = 'display:grid;grid-template-columns:repeat(6,1fr);gap:8px';
  STAGES.forEach((st, si)=>{
    const col = el('div');
    col.innerHTML = `<div class="cap" style="border-bottom:3px solid var(--ink);padding-bottom:3px;margin-bottom:7px">
      ${st} <span class="t-dim">${DATA.tickets.filter(t=>t.stage===si).length}</span></div>`;
    DATA.tickets.filter(t=>t.stage===si).forEach(t=>{
      const card = el('div','gap-item' , `
        <div style="font-size:10px;font-weight:700;line-height:1.4;${t.golden?'color:#b8791b':''}">${t.golden?'★ ':''}${t.title}</div>
        <div class="why">${t.prov} · ${t.days}d · ${(t.recipe.res||[]).length}人</div>
        ${si===1 ? `<div class="row" style="gap:3px">
            <button class="px-btn sm" data-tri-go="${t.id}">值得</button>
            <button class="px-btn sm ghost" data-tri-watch="${t.id}">观察</button>
            <button class="px-btn sm ghost danger" data-tri-kill="${t.id}">毙</button>
          </div>` : ''}`);
      if(t.golden) card.style.cssText += ';box-shadow:inset 0 0 0 2px var(--mustard), inset 0 0 0 4px var(--ink)';
      card.style.cursor = 'pointer';
      card.onclick = e=>{
        if(e.target.dataset.triGo || e.target.dataset.triWatch || e.target.dataset.triKill) return;
        if(t.golden){ RESEARCH_VIEW = 'ticket:' + t.id; RENDER.research(); }
        else toast('骨架票：完整工作台看两张 ★ 金样例');
      };
      col.appendChild(card);
    });
    if(si === 1 && DATA.rejects.length)
      col.appendChild(el('div','t-xs t-dim',
        `弃票堆 ${DATA.rejects.length}：${DATA.rejects.map(r=>r.title).join('、')}`));
    kb.appendChild(col);
  });
  $$('[data-tri-go]').forEach(b=> b.onclick = ()=>{ tk(b.dataset.triGo).stage = 2; drawKanban(); toast('→ 快研'); });
  $$('[data-tri-watch]').forEach(b=> b.onclick = ()=>{
    const t = tk(b.dataset.triWatch); DATA.clues.push({src:t.prov, hook:t.title});
    DATA.tickets = DATA.tickets.filter(x=>x!==t); drawKanban(); toast('→ 线索池'); });
  $$('[data-tri-kill]').forEach(b=> b.onclick = ()=>{
    const t = tk(b.dataset.triKill); DATA.rejects.push(t);
    DATA.tickets = DATA.tickets.filter(x=>x!==t); drawKanban(); toast('已毙，进弃票堆'); });
}
function tk(id){ return DATA.tickets.find(t=>t.id===id); }

/* 老板日报已搬到手机（phone.js），研究台不再展示 */
function drawDailyRail(){ /* moved to phone */ }

/* ==========================================================================
   票工作台
   ========================================================================== */
function renderTicketBench(id){
  const t = tk(id);
  const root = $('#scr-research');
  if(!t){ RESEARCH_VIEW='board'; return RENDER.research(); }
  const head = `
    <div class="screen-head">
      <h1>★ ${t.title}</h1>
      <span class="sub">${STAGES[t.stage]}阶段 · 停留 ${t.days} 天 · 来源 ${t.prov}</span>
      <div class="tools"><button class="px-btn ghost" id="benchBack">← 回流水线</button></div>
    </div>
    ${win('配方 · 这个课题用什么打', `
      <div class="row wrap" style="font-size:10px;font-weight:700">
        <span class="cap">数据源</span>
        ${['巨潮','SemiAnalysis','高临','stock_data','TrendForce','web'].map(s=>
          `<span class="chip ${ (t.recipe.src||[]).includes(s)?'on':''}" data-rc-src="${s}">${s}</span>`).join('')}
        <span class="cap" style="margin-left:10px">研究员</span>
        ${DATA.researchers.filter(r=>!r.veto).map(r=>
          `<span class="chip ${(t.recipe.res||[]).includes(r.id)?'on':''}" data-rc-res="${r.id}">${r.n}</span>`).join('')}
        <span class="cap" style="margin-left:10px">风格</span>
        <span class="chip ${t.recipe.mode==='快研'?'on':''}" data-rc-mode="快研">快研</span>
        <span class="chip ${t.recipe.mode==='深研'?'on':''}" data-rc-mode="深研">深研</span>
        <span class="chip ${t.recipe.mode==='跟踪'?'on':''}" data-rc-mode="跟踪">跟踪</span>
      </div>`, {color:'ink'})}`;

  root.innerHTML = head + (t.golden === 'deep' ? benchDeepHTML() : benchTrackHTML());
  $('#benchBack').onclick = ()=>{ RESEARCH_VIEW = 'board'; RENDER.research(); };
  $$('[data-rc-src],[data-rc-res],[data-rc-mode]').forEach(c=> c.onclick = ()=>{
    c.classList.toggle('on'); toast('配方已调整（demo 内仅记录）'); });
  if(t.golden === 'deep') bindBenchDeep(); else bindBenchTrack();
}

/* ---------- 金样例 1：深研对话 ---------- */
let CHAT_STEP = 0;
function benchDeepHTML(){
  return `
  <div style="display:grid;grid-template-columns:1fr 300px;gap:12px;align-items:start;margin-top:12px">
    ${win('研究对话框', `
      <div id="chatLog" style="min-height:300px;max-height:430px;overflow-y:auto"></div>
      <div class="row" style="margin-top:9px">
        <input class="inp" id="chatInput" placeholder="问点什么，或点右侧追问建议…" style="flex:1">
        <button class="px-btn on" id="chatSend">发问</button>
      </div>
      <div class="t-xs t-dim" style="margin-top:5px;font-weight:700" id="chatModeLine">
        剧本模式 · 在「系统」里配 API key 可切实时模式</div>`,
      {color:'mustard', sub:'AI 帮你快速过一遍，深挖靠多轮追问'})}
    <div class="col">
      ${win('追问建议', `<button class="px-btn on dotted" id="openInqBtn" style="width:100%;margin-bottom:8px">🔍 提问台 · 从真实纪要蒸馏专业追问</button>` + DATA.askChains.map(c=>`
        <div class="cap" style="margin:4px 0 4px">${c.layer}</div>
        ${c.qs.map(q=>`<button class="px-btn sm" style="width:100%;text-align:left;margin-bottom:4px;white-space:normal" data-ask="${q}">▸ ${q}</button>`).join('')}`).join('') +
        `<div class="t-xs t-dim" style="margin-top:6px;font-weight:700">提问链模板 · 投产后从 AceCamp 纪要采集真实问题库</div>`,
        {color:'sky', sub:'不会问？照这个问'})}
      ${win('缺料提示', `
        <div class="gap-item"><div class="gt"><span class="tag rose">缺</span> 一线专家验证 ×2</div>
          <div class="why">光刻胶产能爬坡实际进度，公开材料只有口径</div>
          <div class="row" style="gap:4px">
            <button class="px-btn sm" data-lack="高临">约高临</button>
            <button class="px-btn sm" data-lack="久谦">约久谦</button></div></div>
        <div class="gap-item"><div class="gt"><span class="tag rose">缺</span> 公司 IR 口径</div>
          <div class="why">二供验证时间表，董秘只在调研里松口</div>
          <button class="px-btn sm" data-lack="调研">列入出差调研</button></div>`,
        {color:'coral', sub:'看板主动告诉你缺什么'})}
    </div>
  </div>`;
}

function bindBenchDeep(){
  CHAT_STEP = 0;
  playChatRound(null, true);   /* 开场先放第一轮 */
  $('#chatSend').onclick = ()=> playChatRound($('#chatInput').value.trim() || null);
  $('#chatInput').onkeydown = e=>{ if(e.key === 'Enter') $('#chatSend').click(); };
  $$('[data-ask]').forEach(b=> b.onclick = ()=>{
    $('#chatInput').value = b.dataset.ask; playChatRound(b.dataset.ask); });
  const oib = $('#openInqBtn');
  if(oib) oib.onclick = ()=>{ const t = tk(RESEARCH_VIEW.slice(7)); openInquiry(t ? t.title : '存储涨价外溢设备与材料'); };
  $$('[data-lack]').forEach(b=> b.onclick = ()=>{
    b.classList.add('on'); b.textContent = '✓ 已约 · 待回流';
    pushDaily('gap', `深研票缺料：已约 ${b.dataset.lack}（光刻胶验证进度）`);
    toast('已挂账：回流后自动进对话上下文'); });
}

async function playChatRound(userQ, isBoot){
  const log = $('#chatLog'); if(!log) return;
  if(CHAT_STEP >= DATA.chatScript.length && !window.LLM_LIVE){
    log.insertAdjacentHTML('beforeend',
      `<div class="t-xs t-dim" style="font-weight:700;margin:6px 0">剧本演完了。配 API key 切实时模式可继续深挖。</div>`);
    return;
  }
  const round = DATA.chatScript[Math.min(CHAT_STEP, DATA.chatScript.length-1)];
  const q = userQ || round.q;
  if(!isBoot || userQ){ /* boot 时用剧本第一问 */ }
  log.insertAdjacentHTML('beforeend',
    `<div style="text-align:right;margin:7px 0"><span style="background:var(--teal);color:#fff;
      padding:5px 9px;font-size:11px;font-weight:700;display:inline-block;max-width:80%;text-align:left;
      box-shadow:inset 0 0 0 2px var(--ink)">${q}</span></div>`);
  const inp = $('#chatInput'); if(inp) inp.value = '';
  /* 实时模式钩子：provider.js 就位且有 key 时走真 LLM */
  let answerHTML, srcs, node;
  if(window.LLM_LIVE && typeof llmAsk === 'function'){
    const holder = el('div','saybox',''); holder.style.margin = '7px 0'; log.appendChild(holder);
    holder.innerHTML = '<span class="t-dim">实时模式思考中…</span>';
    try {
      const tkt = tk(RESEARCH_VIEW.slice(7));
      const leadR = tkt && tkt.recipe.res && tkt.recipe.res[0];
      const txt = await (typeof llmAskFor === 'function' && leadR
        ? llmAskFor(leadR, q, '你是里奇流资本的投研 AI。课题：存储涨价外溢设备与材料。用中文简答，给要点。')
        : llmAsk(q, '你是里奇流资本的投研 AI。课题：存储涨价外溢设备与材料。用中文简答，给要点。'));
      holder.innerHTML = txt.replace(/\n/g,'<br>') + '<div class="t-xs t-dim" style="margin-top:5px;font-weight:700">来源：实时 LLM（未经数据源核验，谨慎采信）</div>';
    } catch(err){
      holder.innerHTML = '<span class="t-rose">实时调用失败：' + err.message + '。回落剧本。</span>';
      window.LLM_LIVE = false;
    }
    log.scrollTop = log.scrollHeight;
    CHAT_STEP++;
    return;
  }
  answerHTML = round.a; srcs = round.srcs; node = round.node;
  const holder = el('div','saybox',''); holder.style.margin = '7px 0';
  log.appendChild(holder);
  await sleep(200);
  holder.innerHTML = answerHTML +
    `<div class="row" style="margin-top:7px">
      ${srcs.map(s=>`<span class="tag cyan">${s}</span>`).join('')}
      <span class="sp"></span>
      <button class="px-btn sm" data-sink="${node}|${CHAT_STEP}">◈ 打标沉淀</button>
    </div>`;
  log.scrollTop = log.scrollHeight;
  $$('[data-sink]', holder).forEach(b=> b.onclick = ()=> sinkConclusion(b));
  CHAT_STEP++;
}

function sinkConclusion(btn){
  const [node] = btn.dataset.sink.split('|');
  openModal(`
    <div class="win-bar" style="background:var(--mustard);color:var(--ink)">
      <span>打标沉淀 · 入知识库沉淀层</span><span class="dots" id="mClose" style="cursor:pointer">_ □ ×</span></div>
    <div style="padding:13px">
      <div class="field"><label>关联节点</label><div class="tag gold">${node}</div></div>
      <div class="field"><label>置信</label>
        <div class="opts"><div class="opt" data-c="观察">观察</div><div class="opt on" data-c="可用">可用</div>
        <div class="opt" data-c="核心依据">核心依据</div></div></div>
      <div class="t-xs t-dim" style="font-weight:700;line-height:1.7;margin-bottom:10px">
        沉淀 ≠ 收藏。沉淀层的结论会插金旗、参与后续检索加权，<br>并且和原始数据源硬隔离——这是需求 8。</div>
      <button class="px-btn on dotted" id="sinkOK" style="width:100%">◈ 确认沉淀</button>
    </div>`);
  $('#mClose').onclick = closeModal;
  $$('#modalBox [data-c]').forEach(o=> o.onclick = ()=>{
    $$('#modalBox [data-c]').forEach(x=>x.classList.toggle('on', x===o)); });
  $('#sinkOK').onclick = ()=>{
    const n = DATA.atlas.find(x=>x.name === node);
    if(n) n.validated = (n.validated || 0) + 1;
    btn.classList.add('on'); btn.textContent = '✓ 已沉淀';
    btn.onclick = null;
    pushDaily('sink', `沉淀 +1：「${node}」新增已验证结论（来自深研票）`);
    closeModal(); toast(`已入沉淀层：${node} 插金旗`);
  };
}

/* ---------- 金样例 2：跟踪拆解 ---------- */
function benchTrackHTML(){
  const T = DATA.tracking;
  return `
  <div style="display:grid;grid-template-columns:1fr 300px;gap:12px;align-items:start;margin-top:12px">
    ${win('自动拆解的跟踪计划', `
      <div class="t-sm" style="margin-bottom:10px;line-height:1.7">
        论文：<b>${T.thesis}</b><br>
        <span class="t-dim t-xs" style="font-weight:700">你只说了「跟踪这个主题」。四路拆解是 AI 自己给的：抗议、政策、拿地、建设。</span></div>
      <div id="trackRoutes"></div>`,
      {color:'teal', sub:'跟踪反馈是 AI 做得最好的一环'})}
    <div class="col">
      ${win('今日跟踪日报', `<div class="minutes" style="font-size:10px">
        <h4>数据中心外溢 · 日报 ${$('#tbDate').textContent}</h4>
        ${T.routes.map(r=>`<div class="sec"><span class="k">${r.k}</span> ${r.intel[0].txt}</div>`).join('')}
        <div class="sec t-dim">每天 08:00 并入老板日报 / 可推送到通知渠道（系统里配）</div>
      </div>`, {color:'sky', sub:'与老板日报同源'})}
      ${win('信号纪律', `<div class="t-xs" style="font-weight:700;line-height:1.9">
        ★★★ 一手可复核 → 直接采信<br>
        ★★ 方向有价值 → 需第二源交叉<br>
        ★ 孤证 → 只做提示不进结论<br>
        <span class="t-rose">情报同行也看得到：T+2 视为市场共识</span></div>`, {color:'coral'})}
    </div>
  </div>`;
}
function bindBenchTrack(){
  const box = $('#trackRoutes'); if(!box) return;
  box.innerHTML = '';
  DATA.tracking.routes.forEach((r, i)=>{
    box.appendChild(el('div','gap-item', `
      <div class="gt">${r.k}
        <span class="sp"></span>
        <button class="px-btn sm ${r.on?'on':''}" data-rt="${i}">${r.on?'日报 ON':'日报 OFF'}</button></div>
      ${r.intel.map(iv=>`<div class="why" style="color:var(--ink)">
        <span class="t-dim">${iv.t}</span> ${iv.txt}
        <span class="t-gold">${'★'.repeat(iv.cred)}</span></div>`).join('')}`));
  });
  $$('[data-rt]').forEach(b=> b.onclick = ()=>{
    const r = DATA.tracking.routes[+b.dataset.rt];
    r.on = !r.on; bindBenchTrack();
  });
}
