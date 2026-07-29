/* ricciflow — 组件: 场景 WAR ROOM
   加载方式: 传统 <script> 顺序加载（零构建、file:// 可直开）。
   模块间通过顶层声明共享（var/function 提升到全局作用域）。 */

/* ==========================================================================
   SECTION 15 — 战情室 WAR ROOM
   三个场景真跑：晨会（6 阶段）/ 反路演（论文血条）/ 同行饭局（可信度过滤）。
   另外 5 个只出流程图 + 参与人。
   ========================================================================== */
DATA.scenes = [
  {id:'morning', n:'晨会', ico:'晨', color:'mustard', run:true,
   cast:['serenity','tech','macro','consume','growth','oldmoney','quant','risk'],
   dur:'~6 min', out:'今日 3 条主线 + 观察名单',
   flow:['取数','分派','并行研究','交叉辩论','风控过闸','出纪要']},
  {id:'anti', n:'反路演', ico:'反', color:'coral', run:true,
   cast:['serenity','tech','quant','oldmoney','macro','risk'],
   dur:'~4 min', out:'论文存活 / 被证伪',
   flow:['立论','轮流攻击','血条结算','裁定']},
  {id:'dinner', n:'同行饭局', ico:'局', color:'pink', run:true,
   cast:['tech','growth','consume'], guests:2,
   dur:'~3 min', out:'碎信息 → 待验证线索',
   flow:['入席','碎信息','可信度过滤','进线索池']},
  {id:'weekly', n:'周会', ico:'周', color:'teal', run:false,
   cast:['tech','macro','quant'], dur:'~20 min', out:'周度配置矩阵',
   flow:['回顾上周假设','三人各出一版权重','冲突项投票','冻结本周快照']},
  {id:'review', n:'晚间复盘', ico:'盘', color:'sky', run:false,
   cast:['serenity','tech','macro','consume','growth','oldmoney','quant','risk'],
   dur:'~8 min', out:'归因 + 明日预案',
   flow:['取当日行情','逐笔归因','对照晨会结论','标记打脸项','写明日预案']},
  {id:'deep', n:'深度报告', ico:'深', color:'ink', run:false,
   cast:['tech','risk'], dur:'~2 h', out:'九阶段深度稿',
   flow:['立题','取数','九阶段拆解','监工检查表','终检闸']},
  {id:'strategy', n:'策略会', ico:'策', color:'teal', run:false,
   cast:['macro','quant','oldmoney'], dur:'~30 min', out:'季度大势判断',
   flow:['宏观定调','情景分档','各情景配置','下车信号']},
  {id:'field', n:'产业一线调研', ico:'研', color:'mustard', run:false,
   cast:['tech','consume'], dur:'~1 day', out:'一手 evidence 入库',
   flow:['定访谈提纲','约访','纪要结构化','抽标量事实','写进 wiki']}
];

/* 晨会：每个人的观点便签 */
const MORNING_NOTES = {
  serenity:{k:'bull', t:'窄口在光刻胶', b:'KrF 只有两家过验证，扩产 18 个月。涨价传不传得到不重要，绕不开才重要。', s:'高临 · 专家访谈'},
  tech:    {k:'bear', t:'二阶导已掉头', b:'DDR5 现货周涨 3.1%，但涨幅的加速度连续两周收窄。真正在加速的是 HBM4 良率。', s:'SemiAnalysis'},
  macro:   {k:'', t:'是供给不是需求', b:'社融偏弱、利率没动。这轮涨价是供给收缩，不能按需求复苏定价。', s:'akshare · 社融'},
  consume: {k:'bear', t:'渠道在被动补库', b:'模组厂提价后渠道库存反而涨，是怕断供不是真需求。终端还没感知。', s:'久谦 · 渠道'},
  growth:  {k:'bull', t:'材料小盘斜率最陡', b:'近 10 日材料端小盘涨幅斜率是全市场最陡的一档，量能同步放大。', s:'stock_data'},
  oldmoney:{k:'bear', t:'赚的钱没变成分红', b:'现金流是改善了，但资本开支同步扩张，分红被摊薄。周期股不分红我不参与。', s:'巨潮 · 中报预告'},
  quant:   {k:'', t:'因子显著但期限短', b:'涨价主题因子近 60 日 IC 0.07，t=2.3，过阈值。信号有效期约 3 周。', s:'factor / search_alpha'}
};

/* 交叉关系：conflict 必须带「桥」——什么数据出来能判谁对 */
const MORNING_LINKS = [
  {a:'tech', b:'growth', type:'conflict',
   bridge:'看下周 DXI 存储现货指数周涨幅：若回落到 <2%，科技研究员对（加速度已死）；若维持 >3%，成长股研究员对（斜率还在）。'},
  {a:'serenity', b:'oldmoney', type:'conflict',
   bridge:'看中报现金流量表：经营现金流净额转正、且资本开支同比 <30%，则 Serenity 对（窄口能变现）；否则老登对（赚的钱进了产能）。'},
  {a:'macro', b:'consume', type:'agree'},
  {a:'serenity', b:'growth', type:'agree'},
  {a:'macro', b:'quant', type:'agree'}
];

const GATES = [
  {k:'单票集中度', pass:true,  note:'最大单票 13% < 上限 15%'},
  {k:'亏钱效应',   pass:true,  note:'昨日跌停 9 家，未触发扩散阈值 20 家'},
  {k:'组合回撤',   pass:false, note:'近 20 日回撤 -11.4%，超过 -10% 闸值'}
];

/* 反路演：攻击序列 */
const ANTI_THESIS = {
  by:'serenity',
  title:'光刻胶窄口论文',
  body:'KrF 光刻胶国产验证只有两家过，扩产周期 18 个月，下游 7 个环节绕不开。窄口 + 长周期 = 定价权。',
  hp:100
};
const ANTI_ATTACKS = [
  {by:'tech',    dmg:18, txt:'验证过了不等于放量。你这两家去年合计出货量占比不到 6%，产能爬坡曲线你算过吗？'},
  {by:'quant',   dmg:12, txt:'我把「窄口」做成因子回测了，近 3 年 IC 0.02、t=0.9。不显著。你这是叙事不是因子。'},
  {by:'oldmoney',dmg:22, txt:'窄口能不能变成现金？这两家过去五年经营现金流有三年为负，全砸进产线了。定价权没进股东口袋。'},
  {by:'macro',   dmg:9,  txt:'国产替代是政策变量，不是周期变量。政策节奏一变，你 18 个月的窗口假设就作废。'},
  {by:'risk',    dmg:19, txt:'流动性闸：这两家日均成交额 2.1 亿，我的仓位建不进去也出不来。论文再对也执行不了。'}
];

/* 同行饭局：碎信息 + 可信度 */
const DINNER_GOSSIP = [
  {who:'guest', txt:'听说某模组厂 8 月起再提价一轮，幅度两位数。', cred:2, note:'转述的转述，没有对得上的时间点'},
  {who:'tech',  txt:'我看到的排产表：Q3 晶圆代工成熟制程稼动率回到 92%。', cred:3, note:'一手排产数据，且能和公开产能数据对上'},
  {who:'guest', txt:'有个朋友说某大厂在偷偷囤晶圆，囤了半年量。', cred:1, note:'孤证 + 情绪化措辞，典型饭局噪声'},
  {who:'growth',txt:'上周材料板块的融资余额单周增了 14%。', cred:3, note:'公开数据可复核'},
  {who:'consume',txt:'渠道那边跟我说，涨价通知发了但实际执行打折。', cred:2, note:'方向有价值，但需要第二个渠道交叉'}
];

/* ---- 场景运行状态机（支持暂停 / 跳过动画 / 重跑） ---- */
const SCENE = {id:null, running:false, paused:false, skip:false, seats:{}, notes:{}};
let SCENES_TODAY = 0;

function wait(ms){
  return new Promise(async resolve=>{
    if(SCENE.skip){ resolve(); return; }
    const t0 = Date.now();
    while(Date.now() - t0 < ms){
      if(SCENE.skip) break;
      await sleep(Math.min(40, ms));
      while(SCENE.paused && !SCENE.skip) await sleep(80);
    }
    resolve();
  });
}

function log(html, cls){
  const lane = $('#logLane'); if(!lane) return;
  lane.insertAdjacentHTML('beforeend', `<div class="logline ${cls||''}">${html}</div>`);
  lane.scrollTop = lane.scrollHeight;
}
function setStep(i){
  $$('#stepBar .st').forEach((s,k)=>{
    s.classList.toggle('on', k === i);
    s.classList.toggle('done', k < i);
  });
}

RENDER.war = function(){
  const scr = $('#scr-war');
  scr.innerHTML = `
    <div class="screen-head">
      <h1>WAR ROOM</h1>
      <span class="sub">场景 · 不同的会派不同的人、走不同的流程</span>
      <span class="tools t-xs t-dim" style="font-weight:700">带 ▶ 的三个能真跑完整流程</span>
    </div>
    <div class="doors" id="doorGrid"></div>`;
  const g = $('#doorGrid');
  DATA.scenes.forEach(s=>{
    const cast = s.cast.map(id=> DATA.researchers.find(r=>r.id===id)).filter(Boolean);
    const body = `<div class="dbody">
        <div class="avstack">
          ${cast.map(r=> avatarHTML(r.sp,'s3')).join('')}
          ${s.guests ? Array(s.guests).fill(0).map(()=>avatarHTML('guest','s3')).join('') : ''}
        </div>
        <div class="t-xs" style="line-height:1.6;font-weight:700">产出：${s.out}</div>
        <div class="flowmap">${s.flow.map((f,i)=>
          (i?'<span class="flowarw">▸</span>':'') + `<span class="flownode">${f}</span>`).join('')}</div>
        <div class="dmeta"><span>${cast.length + (s.guests||0)} 人参与</span><span>${s.dur}</span></div>
        <button class="px-btn sm ${s.run?'on dotted':''}" style="width:100%;margin-top:8px" data-scene="${s.id}">
          ${s.run ? '▶ 开会' : '□ 仅流程图（demo 未实现）'}
        </button>
      </div>`;
    g.insertAdjacentHTML('beforeend', win(s.ico + ' · ' + s.n, body, {color:s.color, cls:'door', sub:s.dur}));
  });
  $$('[data-scene]').forEach(b=> b.onclick = ()=>{
    const s = DATA.scenes.find(x=>x.id === b.dataset.scene);
    if(s.run) openScene(s); else toast('这个场景在 demo 里只出流程图。要真跑再说。');
  });
};

function toast(msg){
  const t = el('div','', msg);
  t.style.cssText = `position:fixed;left:50%;bottom:34px;transform:translateX(-50%);z-index:9500;
    background:var(--ink);color:var(--cream);padding:8px 14px;font-size:11px;font-weight:700`;
  document.body.appendChild(t);
  setTimeout(()=> t.remove(), 2200);
}

function openScene(s){
  SCENE.id = s.id; SCENE.paused = false; SCENE.skip = false; SCENE.seats = {}; SCENE.notes = {};
  const scr = $('#scr-war');
  scr.innerHTML = `
    <div class="screen-head">
      <h1>${s.n}</h1>
      <span class="sub">${s.out}</span>
      <div class="tools">
        <button class="px-btn" id="btnPause">⏸ 暂停</button>
        <button class="px-btn" id="btnSkip">⏭ 跳过动画</button>
        <button class="px-btn" id="btnRerun">↺ 重跑</button>
        <button class="px-btn ghost" id="btnBack">← 回大厅</button>
      </div>
    </div>
    <div class="stage-wrap">
      ${win(s.ico + ' · ' + s.n + ' 现场', '<div class="stage" id="stage"><svg id="stageSvg"></svg></div>',
            {color:s.color, sub:'像素小人正在开会', bodyStyle:'padding:6px'})}
      <div class="col">
        ${win('流程', `<div class="steps" id="stepBar">${s.flow.map(f=>`<span class="st">${f}</span>`).join('')}</div>
          <div class="loglane" id="logLane"></div>`, {color:'ink'})}
        <div id="outPane"></div>
      </div>
    </div>`;
  $('#btnBack').onclick = ()=>{ SCENE.skip = true; SCENE.running = false; RENDER.war(); };
  $('#btnPause').onclick = ()=>{
    SCENE.paused = !SCENE.paused;
    $('#btnPause').textContent = SCENE.paused ? '▶ 继续' : '⏸ 暂停';
    $('#btnPause').classList.toggle('on', SCENE.paused);
  };
  $('#btnSkip').onclick = ()=>{ SCENE.skip = true; };
  $('#btnRerun').onclick = ()=> openScene(s);

  if(s.id === 'morning') runMorning();
  else if(s.id === 'anti') runAnti();
  else runDinner();
}

/* 座位坐标：3 上 / 2 侧 / 3 下 */
function seatPositions(n){
  const stage = $('#stage');
  const W = stage.clientWidth, cx = W/2;
  const top = [[cx-250,8],[cx-84,8],[cx+82,8]];
  const side = [[cx-336,178],[cx+170,178]];
  const bot = [[cx-250,348],[cx-84,348],[cx+82,348]];
  const all = [top[0],top[1],top[2],side[0],side[1],bot[0],bot[1],bot[2]];
  return all.slice(0,n).map(p=> [clamp(p[0], 6, W-140), p[1]]);
}

function addSeat(r, x, y, opt){
  opt = opt || {};
  const stage = $('#stage');
  const s = el('div','seat walk');
  s.style.left = x + 'px'; s.style.top = y + 'px';
  s.style.width = '132px';
  s.id = 'seat-' + r.id;
  s.innerHTML = `<div class="av">${avatarHTML(r.sp,'s4')}</div>
    <div class="who">${r.n}</div>
    ${opt.bar === false ? '' : `<div class="px-bar thin teal" style="margin-top:4px"><i id="pb-${r.id}"></i></div>`}`;
  stage.appendChild(s);
  SCENE.seats[r.id] = s;
  return s;
}

function bubble(rid, txt){
  const s = SCENE.seats[rid]; if(!s) return;
  const old = $('.bubble', s); if(old) old.remove();
  s.insertAdjacentHTML('afterbegin', `<span class="bubble">${txt}</span>`);
}
function clearBubble(rid){
  const s = SCENE.seats[rid]; if(!s) return;
  const b = $('.bubble', s); if(b) b.remove();
}

async function flyPacket(toX, toY, n){
  const stage = $('#stage');
  for(let i=0;i<n;i++){
    const p = el('div','pkt');
    p.style.left = '4px';
    p.style.top = (30 + rnd()*380) + 'px';
    stage.appendChild(p);
    const steps = 14;
    const sx = 4, sy = parseFloat(p.style.top);
    (async ()=>{
      for(let k=1;k<=steps;k++){
        if(SCENE.skip) break;
        p.style.left = Math.round(sx + (toX-sx)*k/steps) + 'px';
        p.style.top  = Math.round(sy + (toY-sy)*k/steps) + 'px';
        await sleep(22);
      }
      p.remove();
    })();
    await wait(70);
  }
}

/* ---------- 场景 A：晨会 ---------- */
async function runMorning(){
  SCENE.running = true;
  const stage = $('#stage');
  const cast = DATA.scenes.find(s=>s.id==='morning').cast.map(id=> DATA.researchers.find(r=>r.id===id));
  const W = stage.clientWidth, H = 520;
  stage.style.minHeight = H + 'px';

  /* 阶段 1 取数 */
  setStep(0);
  stage.insertAdjacentHTML('beforeend',
    `<div class="table-top" id="tableTop"><div>
      <div class="cap">今日议题</div>
      <b style="font-size:11px;line-height:1.4;display:block;margin-top:4px">${DATA.topic}</b>
      <div class="t-xs t-dim" style="margin-top:5px;font-weight:700" id="tableSub">正在取数…</div>
    </div></div>`);
  log('<b>08:20</b> 开始取数，只用已插上的 ' + srcCount() + ' 个源');
  await wait(300);
  const feeds = [['财联社电报',47],['巨潮资讯公告',12],['filing-keyword 精筛',9],
                 ['SemiAnalysis',1],['TrendForce',2],['KB 命中',8]];
  for(const [nm,c] of feeds){
    log(`拉取 <b>${nm}</b> — ${c} 条`);
    await flyPacket(W/2, H/2, Math.min(4, c));
    await wait(90);
  }
  log('去重后 <b>62</b> 条进入议题池，KB 补充 8 篇底稿', 'hi');
  const sub = $('#tableSub'); if(sub) sub.textContent = '素材已就位 · 62 条';

  /* 阶段 2 分派 */
  setStep(1);
  await wait(240);
  log('<b>08:23</b> 按方法论分派，8 人到场（含风控官）');
  const pos = seatPositions(cast.length);
  for(let i=0;i<cast.length;i++){
    addSeat(cast[i], pos[i][0], pos[i][1]);
    bubble(cast[i].id, '思考中…');
    await wait(110);
  }

  /* 阶段 3 并行研究 */
  setStep(2);
  log('<b>08:24</b> 并行研究中，进度各不相同（真实系统里就是并行 agent）');
  const speeds = cast.map((r,i)=> 30 + (i*7) % 26);
  let prog = cast.map(()=>0);
  let done = 0;
  await new Promise(resolve=>{
    const timer = setInterval(async ()=>{
      if(SCENE.paused && !SCENE.skip) return;
      let allDone = true;
      cast.forEach((r,i)=>{
        if(prog[i] >= 100) return;
        allDone = false;
        prog[i] = Math.min(100, prog[i] + speeds[i]/8 + (SCENE.skip ? 100 : 0));
        const bar = $('#pb-' + r.id);
        if(bar) bar.style.width = prog[i] + '%';
        if(prog[i] >= 100){
          done++;
          clearBubble(r.id);
          const note = MORNING_NOTES[r.id];
          if(note){
            SCENE.seats[r.id].insertAdjacentHTML('beforeend',
              `<div class="note ${note.k}" style="position:static;width:132px;margin-top:5px">
                 <b>${note.t}</b>${note.b}<span class="src">— ${note.s}</span></div>`);
            log(`<b>${r.n}</b> 出观点：${note.t}`);
          } else {
            SCENE.seats[r.id].insertAdjacentHTML('beforeend',
              `<div class="note" style="position:static;width:132px;margin-top:5px">
                 <b>等待过闸</b>三道闸都要过完才发言。<span class="src">— 风控官</span></div>`);
          }
        }
      });
      if(allDone){ clearInterval(timer); resolve(); }
    }, 90);
  });

  /* 阶段 4 交叉辩论 */
  setStep(3);
  await wait(200);
  log('<b>08:29</b> 交叉比对：<b>2 处冲突</b>、3 处同向', 'hi');
  drawLinks(MORNING_LINKS);
  await wait(300);
  renderClashList();

  /* 阶段 5 风控过闸 */
  setStep(4);
  await wait(260);
  log('<b>08:31</b> 风控官过闸');
  const gateBox = el('div','gates');
  $('#tableTop').appendChild(gateBox);
  for(const g of GATES){
    gateBox.insertAdjacentHTML('beforeend', `<span class="gate">${g.k} …</span>`);
    await wait(420);
    const last = gateBox.lastElementChild;
    last.className = 'gate ' + (g.pass ? 'pass' : 'fail');
    last.textContent = g.k + (g.pass ? ' ✓' : ' ✗');
    log((g.pass ? '闸通过 ' : '闸未过 ') + `<b>${g.k}</b> — ${g.note}`, g.pass ? '' : 'warn');
  }
  log('回撤闸未过 → <b>今日所有「买入」降级为「观察」</b>', 'warn');

  /* 阶段 6 出纪要 */
  setStep(5);
  await wait(300);
  renderMinutes();
  SCENES_TODAY++; $('#tbScene').textContent = SCENES_TODAY;
  log('<b>08:33</b> 纪要已生成', 'hi');
  SCENE.running = false;
}

function drawLinks(links){
  const svg = $('#stageSvg'); if(!svg) return;
  const stage = $('#stage');
  const sr = stage.getBoundingClientRect();
  svg.innerHTML = '';
  links.forEach((L,i)=>{
    const a = SCENE.seats[L.a], b = SCENE.seats[L.b];
    if(!a || !b) return;
    const ar = a.getBoundingClientRect(), br = b.getBoundingClientRect();
    const x1 = ar.left - sr.left + ar.width/2, y1 = ar.top - sr.top + 22;
    const x2 = br.left - sr.left + br.width/2, y2 = br.top - sr.top + 22;
    const line = document.createElementNS('http://www.w3.org/2000/svg','line');
    line.setAttribute('x1',x1); line.setAttribute('y1',y1);
    line.setAttribute('x2',x2); line.setAttribute('y2',y2);
    line.setAttribute('stroke', L.type==='conflict' ? '#e8535a' : '#e9b23c');
    if(L.type==='conflict'){ line.setAttribute('class','conflict'); line.setAttribute('stroke-dasharray','6 4'); }
    svg.appendChild(line);
    if(L.type === 'conflict'){
      const z = el('div','zap','⚡ 冲突');
      z.style.left = ((x1+x2)/2 - 24) + 'px';
      z.style.top = ((y1+y2)/2 - 9) + 'px';
      z.title = '点开看对撞';
      z.onclick = ()=> showClash(L);
      stage.appendChild(z);
    }
  });
}

function renderClashList(){
  const pane = $('#outPane'); if(!pane) return;
  const conflicts = MORNING_LINKS.filter(l=>l.type==='conflict');
  pane.innerHTML = win('分歧', conflicts.map((c,i)=>{
    const A = DATA.researchers.find(r=>r.id===c.a), B = DATA.researchers.find(r=>r.id===c.b);
    return `<button class="px-btn sm" style="width:100%;text-align:left;margin-bottom:6px" data-clash="${i}">
      ⚡ ${A.n} vs ${B.n}</button>`;
  }).join('') + '<div class="t-xs t-dim" style="line-height:1.6;font-weight:700">点开看双方原话对撞。<br>每条冲突都必须给「桥」：什么数据出来能判谁对。</div>',
  {color:'coral'});
  $$('[data-clash]').forEach(b=> b.onclick = ()=> showClash(conflicts[+b.dataset.clash]));
}

function showClash(L){
  const A = DATA.researchers.find(r=>r.id===L.a), B = DATA.researchers.find(r=>r.id===L.b);
  const na = MORNING_NOTES[L.a], nb = MORNING_NOTES[L.b];
  openModal(`
    <div class="win-bar" style="background:var(--coral)"><span>⚡ 观点对撞</span>
      <span class="dots" id="mClose" style="cursor:pointer">_ □ ×</span></div>
    <div style="padding:13px">
      <div class="clash">
        <div class="side">
          <div class="row" style="margin-bottom:6px">${avatarHTML(A.sp,'s3')}<b>${A.n}</b></div>
          <b>${na.t}</b><br>${na.b}
          <div class="t-xs t-dim" style="margin-top:6px;font-weight:700">证据：${na.s}</div>
        </div>
        <div class="vs">VS</div>
        <div class="side">
          <div class="row" style="margin-bottom:6px">${avatarHTML(B.sp,'s3')}<b>${B.n}</b></div>
          <b>${nb.t}</b><br>${nb.b}
          <div class="t-xs t-dim" style="margin-top:6px;font-weight:700">证据：${nb.s}</div>
        </div>
      </div>
      <div class="bridge">桥 · ${L.bridge}</div>
      <div class="t-xs t-dim" style="margin-top:9px;line-height:1.6;font-weight:700">
        没有桥的分歧不许写进纪要 —— 那只是两个人各说各话。
      </div>
    </div>`);
  $('#mClose').onclick = closeModal;
}

function renderMinutes(){
  const pane = $('#outPane'); if(!pane) return;
  pane.insertAdjacentHTML('beforeend', win('会议纪要', `
    <div class="minutes">
      <h4>晨会纪要 · 2026-07-28</h4>
      <div class="sec"><span class="k">主线 1</span> 存储涨价确认，但已进入<b>加速度收敛</b>阶段。跟随可以，追高不行。</div>
      <div class="sec"><span class="k">主线 2</span> 设备/材料端的窄口（光刻胶、混合键合）比涨价本身更值得埋伏，因为绕不开。</div>
      <div class="sec"><span class="k">主线 3</span> 这轮是<b>供给收缩</b>不是需求复苏，别按需求周期给估值。</div>
      <div class="sec"><span class="k">分歧</span> 2 处，均已挂「桥」：DXI 周涨幅、中报现金流量表。</div>
      <div class="sec"><span class="k">风控</span> 回撤闸未过 → 今日<b>所有买入降级为观察</b>。</div>
      <div class="sec"><span class="k">下车信号</span> DXI 连续两周 &lt;2%；或二供验证公告迟于 9 月。</div>
      <div class="sec"><span class="k">溯源</span> 巨潮 12 / SemiAnalysis 1 / 高临 3 / TrendForce 2 / KB 8。<span class="t-dim">受限源已剥名。</span></div>
    </div>
    <button class="px-btn dotted" style="width:100%;margin-top:9px" id="btnPush">▸ 推送到飞书群</button>`,
    {color:'mustard'}));
  $('#btnPush').onclick = ()=> toast('demo 不外发。真实系统这里会走 lark-cli 推到指定群。');
}

/* ---------- 场景 B：反路演 ---------- */
async function runAnti(){
  SCENE.running = true;
  const stage = $('#stage');
  stage.style.minHeight = '520px';
  const author = DATA.researchers.find(r=>r.id === ANTI_THESIS.by);
  const attackers = ANTI_ATTACKS.map(a=> DATA.researchers.find(r=>r.id===a.by));

  setStep(0);
  stage.insertAdjacentHTML('beforeend', `
    <div class="table-top" style="width:300px;height:186px" id="tableTop">
      <div>
        <div class="row" style="justify-content:center;margin-bottom:5px">${avatarHTML(author.sp,'s4')}</div>
        <div class="cap">提案人 ${author.n}</div>
        <b style="font-size:11px;display:block;margin:4px 0">${ANTI_THESIS.title}</b>
        <div class="t-xs" style="line-height:1.5;font-weight:700">${ANTI_THESIS.body}</div>
        <div style="margin-top:8px">
          <div class="row t-xs" style="font-weight:700"><span>论文血量</span><span class="sp"></span><span id="hpTxt">100 / 100</span></div>
          <div class="px-bar coral" style="margin-top:3px"><i id="hpBar" style="width:100%"></i></div>
        </div>
      </div>
    </div>`);
  log('<b>立论</b> ' + author.n + '：' + ANTI_THESIS.title);
  await wait(500);

  setStep(1);
  const W = stage.clientWidth;
  const around = [[10,20],[W-152,20],[10,190],[W-152,190],[W/2-66,392]];
  attackers.forEach((r,i)=> addSeat(r, clamp(around[i][0],6,W-140), around[i][1], {bar:false}));
  await wait(300);

  let hp = ANTI_THESIS.hp;
  for(let i=0;i<ANTI_ATTACKS.length;i++){
    const atk = ANTI_ATTACKS[i], r = attackers[i];
    bubble(r.id, '发起攻击');
    SCENE.seats[r.id].classList.add('walk');
    log(`<b>${r.n}</b> 攻击：${atk.txt}`, 'warn');
    await wait(520);
    hp = Math.max(0, hp - atk.dmg);
    $('#hpBar').style.width = hp + '%';
    $('#hpTxt').textContent = hp + ' / 100';
    if(hp <= 30) $('#hpBar').parentElement.className = 'px-bar coral';
    log(`论文扣血 <b>-${atk.dmg}</b> → 剩 ${hp}`, hp <= 30 ? 'warn' : '');
    SCENE.seats[r.id].insertAdjacentHTML('beforeend',
      `<div class="note bear" style="position:static;width:132px;margin-top:5px">
         <b>-${atk.dmg} 血</b>${atk.txt}</div>`);
    clearBubble(r.id);
    SCENE.seats[r.id].classList.remove('walk');
    await wait(260);
  }

  setStep(2);
  await wait(300);
  setStep(3);
  const survived = hp > 0;
  log(survived ? `<b>裁定：论文存活但降级</b>（剩 ${hp} 血）` : '<b>裁定：论文被证伪，出局</b>', 'hi');
  $('#outPane').innerHTML = win('裁定', `
    <div class="minutes">
      <h4>反路演结论</h4>
      <div class="sec"><span class="k">论文</span> ${ANTI_THESIS.title} — <b>${survived?'存活':'证伪出局'}</b>（剩 ${hp}/100）</div>
      <div class="sec"><span class="k">致命伤</span> 老登（现金流没进股东口袋，-22）与风控（流动性建不进仓位，-19）。</div>
      <div class="sec"><span class="k">降级处理</span> 从「重仓候选」降为<b>观察仓 ≤3%</b>，且只在日均成交额回到 5 亿以上才执行。</div>
      <div class="sec"><span class="k">复活条件</span> 二供验证公告落地 + 经营现金流转正，任一满足重开评审。</div>
    </div>
    <div class="bridge">反路演的意义不是把论文打死，是<b>把它的死法先写出来</b>。写不出死法的论文不许上仓位。</div>`,
    {color:'coral'});
  SCENES_TODAY++; $('#tbScene').textContent = SCENES_TODAY;
  SCENE.running = false;
}

/* ---------- 场景 C：同行饭局 ---------- */
async function runDinner(){
  SCENE.running = true;
  resetSeed();
  const stage = $('#stage');
  stage.style.minHeight = '520px';
  const scene = DATA.scenes.find(s=>s.id==='dinner');
  const cast = scene.cast.map(id=> DATA.researchers.find(r=>r.id===id));

  setStep(0);
  stage.insertAdjacentHTML('beforeend',
    `<div class="table-top round" id="tableTop"><div>
      <div class="cap">圆桌</div>
      <b style="font-size:11px;display:block;margin-top:4px">同行饭局</b>
      <div class="t-xs t-dim" style="margin-top:6px;line-height:1.5;font-weight:700">
        默认所有信息不可信<br>只有能交叉复核的才留下
      </div></div></div>
     <div class="bin" id="bin">噪声桶 · 0</div>`);
  const W = stage.clientWidth, H = 520, cx = W/2, cy = H/2;
  const ring = [[cx-260,cy-140],[cx+140,cy-140],[cx-260,cy+70],[cx+140,cy+70],[cx-60,cy-210]];
  const people = cast.concat([{id:'g1',n:'某券商朋友',sp:'guest'},{id:'g2',n:'某供应链朋友',sp:'guest'}]);
  for(let i=0;i<people.length;i++){
    addSeat(people[i], clamp(ring[i%5][0] + (i>=5?90:0), 6, W-140), ring[i%5][1] + (i>=5?60:0), {bar:false});
    await wait(120);
  }
  log('<b>入席</b> 3 位同事 + 2 位外部朋友');

  setStep(1);
  await wait(300);
  let trash = 0, keep = [];
  for(let i=0;i<DINNER_GOSSIP.length;i++){
    const g = DINNER_GOSSIP[i];
    const seatId = g.who === 'guest' ? (i%2 ? 'g2':'g1') : g.who;
    const seat = SCENE.seats[seatId];
    const bx = seat ? parseFloat(seat.style.left) : cx;
    const by = seat ? parseFloat(seat.style.top) + 78 : cy;
    stage.insertAdjacentHTML('beforeend',
      `<div class="gossip" id="gs-${i}" style="left:${clamp(bx-20,6,W-190)}px;top:${by}px">
         ${g.txt}<span class="cred">${'★'.repeat(g.cred)}${'☆'.repeat(3-g.cred)} 可信度</span></div>`);
    log(`<b>${seatId.startsWith('g')?'外部朋友':DATA.researchers.find(r=>r.id===seatId).n}</b>：${g.txt}`);
    await wait(600);
  }

  setStep(2);
  await wait(300);
  log('<b>可信度过滤</b> — 只有 ★★★ 能进线索池，其余全进噪声桶', 'hi');
  for(let i=0;i<DINNER_GOSSIP.length;i++){
    const g = DINNER_GOSSIP[i];
    const node = $('#gs-' + i);
    if(g.cred >= 3){ node.classList.add('keep'); keep.push(g); log(`保留：${g.note}`); }
    else { node.classList.add('trash'); trash++; $('#bin').textContent = '噪声桶 · ' + trash; log(`丢弃：${g.note}`, 'warn'); }
    await wait(420);
  }

  setStep(3);
  await wait(200);
  $('#outPane').innerHTML = win('待验证线索池', `
    <div class="minutes">
      <h4>饭局产出 · ${keep.length} 条进池</h4>
      ${keep.map(k=>`<div class="sec"><span class="k">线索</span> ${k.txt}<br>
        <span class="t-dim">留下的理由：${k.note}</span></div>`).join('')}
      <div class="sec"><span class="k">丢弃</span> ${trash} 条（孤证 / 转述的转述 / 情绪化措辞）</div>
    </div>
    <div class="bridge">饭局信息<b>默认不可信</b>。它的价值是给你指方向，不是给你下结论。
    进池 ≠ 入库：还要跑一次交叉复核才允许写进知识库。</div>`, {color:'pink'});
  log('<b>' + keep.length + '</b> 条进待验证线索池，<b>' + trash + '</b> 条丢弃', 'hi');
  SCENES_TODAY++; $('#tbScene').textContent = SCENES_TODAY;
  SCENE.running = false;
}

