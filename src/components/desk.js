/* ricciflow — 组件: 研究员 THE DESK
   加载方式: 传统 <script> 顺序加载（零构建、file:// 可直开）。
   模块间通过顶层声明共享（var/function 提升到全局作用域）。 */

/* ==========================================================================
   SECTION 13 — 研究员
   战绩全部是编的。每张卡都带 DEMO 角标，页脚有免责。
   滑块联动发言是纯查表：不接 LLM，保证每次拖都有反应、且可复现。
   ========================================================================== */
DATA.topic = '存储涨价能不能外溢到设备与材料';

DATA.researchers = [
  {id:'serenity', sp:'serenity', n:'Serenity', proto:'serenity skill · 卡脖子',
   lv:14, xp:72, adopt:61, hit:48, mdd:-19, love:5, adopted:23, rejected:9,
   aggr:8, indep:9, horizon:9,
   factors:['卡脖子度','寡头集中','扩产周期','纯度/良率','地缘替代'],
   motto:'绕不开的地方才有钱赚。',
   say:{
     hi:'涨价能传多远不重要。找绕不开的窄口：KrF 光刻胶只有两家过验证、扩产要 18 个月，这种地方我下重手。',
     mid:'窄口逻辑成立，但只有一家真过了验证，二供还在小试。半仓，等第二家的验证公告。',
     lo:'窄口在，估值已经含了预期。只给观察仓，等被证伪或者等回撤。'}},

  {id:'tech', sp:'tech', n:'科技研究员', proto:'wavehunter + aidemand',
   lv:17, xp:44, adopt:58, hit:52, mdd:-27, love:4, adopted:41, rejected:29,
   aggr:7, indep:6, horizon:4,
   factors:['增速二阶导','边际变化','渗透率曲线','新技术验证','产能利用率'],
   motto:'一阶导人人都会看，钱在二阶导里。',
   say:{
     hi:'看二阶导：DDR5 现货周涨 3.1%，但涨幅的加速度已经掉头。真正在加速的是 HBM4 的良率修复，那才是下一段边际。',
     mid:'一阶导还在上行，二阶导走平。设备端订单要到 Q4 才见反应，先跟不重仓。',
     lo:'最猛的那段边际变化已经过去了。等下一个二阶导拐点再说。'}},

  {id:'macro', sp:'macro', n:'宏观研究员', proto:'summary 宏观段',
   lv:12, xp:88, adopt:44, hit:41, mdd:-12, love:3, adopted:17, rejected:22,
   aggr:3, indep:7, horizon:8,
   factors:['流动性','利率路径','政策脉冲','汇率','社融'],
   motto:'先问是货币现象还是需求现象。',
   say:{
     hi:'流动性在放。这轮涨价本质是货币现象不是需求现象，顺着做，别纠结基本面。',
     mid:'利率没动、社融偏弱。涨价更像供给收缩，别当需求复苏来定价。',
     lo:'货币没配合。单靠涨价撑不起板块级行情，等政策脉冲落地再谈。'}},

  {id:'consume', sp:'consume', n:'消费研究员', proto:'—',
   lv:9, xp:31, adopt:39, hit:37, mdd:-15, love:3, adopted:11, rejected:18,
   aggr:4, indep:5, horizon:6,
   factors:['单店模型','复购率','渠道库存','提价传导','客单价'],
   motto:'涨价传到终端就是杀量，看渠道不看新闻。',
   say:{
     hi:'涨价一定杀量，但这轮终端还没感知。模组厂提价后渠道还在补库，趁传导没到先做一段。',
     mid:'渠道库存在涨，这是被动补库不是真实需求。等一个真实动销数据再判断。',
     lo:'终端价格一动，量就掉。这条链的下游我不碰。'}},

  {id:'growth', sp:'growth', n:'成长股研究员', proto:'goldpool',
   lv:15, xp:19, adopt:67, hit:44, mdd:-34, love:4, adopted:38, rejected:19,
   aggr:9, indep:3, horizon:2,
   factors:['横截面动量','加速度','量能','拥挤度','龙头溢价'],
   motto:'骑加速的那匹，绝不 fade 追高。',
   say:{
     hi:'谁在加速买谁，不做估值判断。这周材料端小盘的斜率最陡，直接上，破位再说。',
     mid:'加速还在，但换手掉下来了。留半仓跟着走，斜率走平就撤。',
     lo:'动量在衰减。这时候进场是接最后一棒，我不做。'}},

  {id:'oldmoney', sp:'oldmoney', n:'老登股研究员', proto:'—',
   lv:21, xp:63, adopt:29, hit:57, mdd:-8, love:4, adopted:14, rejected:31,
   aggr:1, indep:8, horizon:10,
   factors:['股息率','自由现金流','分红连续性','资本开支纪律','回购'],
   motto:'不分红的成长都是叙事。',
   say:{
     hi:'涨价周期里我只看一件事：赚到的钱有没有变成分红。上游资源这轮现金流是真的，股息还能再抬。',
     mid:'现金流改善了，但资本开支同步在扩，分红被摊薄。观望一个季度。',
     lo:'赚的钱全砸回产能里了，股东一分没拿到。这种周期股我不参与。'}},

  {id:'quant', sp:'quant', n:'量化研究员', proto:'factor / search_alpha',
   lv:16, xp:55, adopt:52, hit:50, mdd:-14, love:4, adopted:26, rejected:24,
   aggr:5, indep:9, horizon:7,
   factors:['因子 IC','t 值','换手成本','拥挤度','regime 判别'],
   motto:'t 值不到 1.96 的故事，我一个字都不听。',
   say:{
     hi:'涨价主题因子近 60 日 IC 0.07、t=2.3，显著。信号有效期约 3 周，按信号做，别加主观。',
     mid:'IC 0.03、t=1.4，没过阈值。这个主题目前是叙事不是因子，只做小仓位试探。',
     lo:'因子失效了，且换手成本吃掉全部超额。这条线上我给不出可交易信号。'}},

  {id:'risk', sp:'risk', n:'风控官', proto:'brownsugar 三闸', veto:true,
   lv:19, xp:77, adopt:100, hit:0, mdd:-6, love:5, adopted:52, rejected:0,
   aggr:2, indep:10, horizon:5,
   factors:['最大回撤','单票集中度','赚钱/亏钱效应','流动性','停牌风险'],
   motto:'我不选股，我只决定谁不能上。',
   say:{
     hi:'今天亏钱效应还没扩散，闸放行。但单票上限 15%，谁都别想突破。',
     mid:'集中度已经贴着上限。新仓位可以进，但要先砍掉一个旧的。',
     lo:'亏钱效应在扩散，回撤闸触发。今天所有买入降级为观察，不接受申辩。'}}
];

/* 滑块的另两维通过后缀/前缀叠加，纯查表 */
const HORIZON_TAIL = {
  short:'持有按周算，破位就走。',
  mid:'持有按月算，中途看一次证伪信号。',
  long:'持有按季度算，中途波动不管。'
};
const INDEP_TAG = {
  hi:'（这判断和当前卖方共识相反，我不改。）',
  mid:'（部分机构已经在讲这个逻辑。）',
  lo:'（这也是当前机构共识。）'
};

function sayOf(r){
  const base = r.aggr >= 7 ? r.say.hi : r.aggr >= 4 ? r.say.mid : r.say.lo;
  const tail = r.horizon >= 8 ? HORIZON_TAIL.long : r.horizon >= 4 ? HORIZON_TAIL.mid : HORIZON_TAIL.short;
  const tag  = r.indep >= 8 ? INDEP_TAG.hi : r.indep >= 5 ? INDEP_TAG.mid : INDEP_TAG.lo;
  return `${base} ${tail}<span class="t-dim" style="font-weight:400">${tag}</span>`;
}

function heartsHTML(n){
  let h = '';
  for(let i=0;i<5;i++) h += avatarHTML(i < n ? 'heart' : 'heartOff','s2');
  return h;
}

RENDER.desk = function(){
  const scr = $('#scr-desk');
  scr.innerHTML = `
    <div class="screen-head">
      <h1>THE DESK</h1>
      <span class="sub">研究员 · 拧滑块就换方法论，发言实时变</span>
      <div class="tools">
        <button class="px-btn on dotted" id="btnGacha">⊕ 角色抽卡</button>
        <button class="px-btn" id="btnNewR">＋ 自定义研究员</button>
        <button class="px-btn ghost" id="btnResetR">↺ 恢复默认性格</button>
      </div>
    </div>
    ${win('今日议题', `<div class="row wrap">
        <span class="tag gold">TOPIC</span>
        <b style="font-size:13px">${DATA.topic}</b>
        <span class="sp"></span>
        <span class="t-xs t-dim" style="font-weight:700">下面每个人的发言都是针对这一条议题 · 拖动滑块看他改口</span>
      </div>`, {color:'ink'})}
    <div class="desk" id="deskGrid"></div>`;

  drawDesk();
  $('#btnGacha').onclick = openGacha;
  $('#btnNewR').onclick = openNewResearcher;
  $('#btnResetR').onclick = ()=>{ DATA.researchers.forEach(r=>{
      const d = DEFAULT_PERSONA[r.id]; if(d){ r.aggr=d[0]; r.indep=d[1]; r.horizon=d[2]; }
    }); drawDesk(); };
};

/* ---- V2: 考核 / 模拟仓 / PIP / 外出状态（全部编造值，DEMO 角标） ---- */
DATA.reviews = {
  serenity:{hit:72, contrib:64, disc:88, rank:2, status:'在岗'},
  tech:    {hit:66, contrib:78, disc:70, rank:1, status:'在岗'},
  macro:   {hit:55, contrib:40, disc:82, rank:5, status:'在岗'},
  consume: {hit:38, contrib:22, disc:60, rank:8, pip:true, status:'在岗'},
  growth:  {hit:60, contrib:70, disc:34, rank:4, status:'外出调研'},
  oldmoney:{hit:70, contrib:35, disc:96, rank:3, status:'在岗'},
  quant:   {hit:62, contrib:58, disc:90, rank:6, status:'在岗'},
  risk:    {hit:0,  contrib:0,  disc:100, rank:7, status:'在岗'}
};
function rNavSeries(id){
  let s = 0; for(const ch of id) s = (s * 31 + ch.charCodeAt(0)) & 0x7fffffff;
  const drift = (DATA.reviews[id]?.rank <= 3 ? .003 : DATA.reviews[id]?.pip ? -.002 : .0008);
  let v = 100; const out = [];
  for(let i = 0; i < 30; i++){
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    v = v * (1 + drift + ((s / 0x7fffffff) - .5) * .028);
    out.push(v);
  }
  return out;
}

/* 记住出厂性格，方便一键还原 */
const DEFAULT_PERSONA = {};
DATA.researchers.forEach(r=> DEFAULT_PERSONA[r.id] = [r.aggr, r.indep, r.horizon]);

function drawDesk(){
  const g = $('#deskGrid'); if(!g) return;
  g.innerHTML = '';
  DATA.researchers.filter(r=>!r.gone).forEach(r=> g.insertAdjacentHTML('beforeend', researcherCard(r)));
  const gone = DATA.researchers.filter(r=>r.gone);
  if(gone.length){
    g.insertAdjacentHTML('beforeend', win('前员工档案',
      gone.map(r=>`<div class="row" style="margin-bottom:6px;opacity:.6">${avatarHTML(r.sp,'s3')}
        <div><b>${r.n}</b><div class="t-xs t-dim">${r.id==='quant'?'跳槽城堡量化':'考核淘汰'} · 竞业条款 6 个月</div></div></div>`).join(''),
      {color:'ink', cls:'rcard'}));
  }
  bindDesk();
}

function researcherCard(r){
  const color = r.veto ? 'coral' : r.id==='serenity' ? 'pink' : r.id==='quant' ? 'sky' : 'teal';
  const body = `
    <div class="rhead">
      ${avatarHTML(r.sp,'s4')}
      <div>
        <div class="rname">${r.n} ${rarityBadge(r)}${(typeof rLLMGet === 'function' && rLLMGet(r.id)?.key) ? ' <span class="tag cyan" title="自带专属 LLM">🧠</span>' : ''} ${r.veto?'<span class="tag rose">VETO</span>':''}</div>
        <div class="rproto">${r.proto}</div>
      </div>
      <div class="lv">LV.${r.lv}<br><span class="t-xs t-dim" title="LV = 沉淀资料丰富度">沉淀度</span></div>
    </div>
    <div class="px-bar thin mustard" style="margin-bottom:4px"><i style="width:${r.xp}%"></i></div>

    <div class="row" style="margin:7px 0 0">
      <span class="cap">战绩</span><span class="demo-mark">编造值</span>
      <span class="sp"></span>
      <span class="hearts" title="你采纳了他 ${r.adopted} 次，驳回 ${r.rejected} 次">${heartsHTML(r.love)}</span>
    </div>
    <div class="stat3">
      <div><div class="k">采纳率</div><div class="v">${r.adopt}%</div></div>
      <div><div class="k">${r.veto?'否决数':'命中率'}</div><div class="v">${r.veto? r.adopted : r.hit+'%'}</div></div>
      <div><div class="k">最大回撤</div><div class="v t-rose">${r.mdd}%</div></div>
    </div>

    <div class="sliders" data-r="${r.id}">
      ${sliderRow(r,'aggr','保守','激进')}
      ${sliderRow(r,'indep','随大流','独立')}
      ${sliderRow(r,'horizon','短线','长线')}
    </div>

    <div class="cap" style="margin-bottom:4px">关注因子</div>
    <div class="chips">${r.factors.map((f,i)=>`<span class="chip ${i<3?'on':''}">${f}</span>`).join('')}</div>

    <div class="cap" style="margin:8px 0 6px">对今日议题的发言</div>
    <div class="saybox" id="say-${r.id}">${sayOf(r)}</div>
    <div class="motto">「${r.motto}」</div>
    ${reviewBlock(r)}
    <div class="inbox" id="inbox-${r.id}">
      <span class="cap">任务收件箱</span>
      ${(r.inbox && r.inbox.length)
        ? r.inbox.map(t=>`<span class="taskchip">▸ ${t}</span>`).join('')
        : `<div class="t-xs t-dim" style="margin-top:3px" id="inboxEmpty-${r.id}">空 · 可从知识库缺口派单过来</div>`}
    </div>`;
  return win(r.n, body, {color, cls:'rcard', sub:'LV.'+r.lv});
}

function reviewBlock(r){
  const rv = DATA.reviews[r.id];
  if(!rv) return '';
  if(r.gone) return '<div class="bridge" style="margin-top:8px">已跳槽至城堡量化 · 归档「前员工」</div>';
  const nav = rNavSeries(r.id);
  const last = nav[nav.length-1].toFixed(1);
  const spark = typeof sparkHTML === 'function' && !r.veto
    ? sparkHTML(nav, 250, 34, rv.pip ? 'var(--coral)' : 'var(--teal)') : '';
  return `
  <div style="border-top:3px dashed var(--ink);margin-top:8px;padding-top:7px">
    ${trustBar(r.id)}
    <div class="row" style="margin-top:6px">
      <span class="cap">考核</span><span class="demo-mark">编造值</span>
      <span class="tag ${rv.rank<=3?'gold':''}">#${rv.rank}</span>
      ${rv.pip ? '<span class="tag rose">PIP 观察期</span>' : ''}
      <span class="tag ${rv.status==='外出调研'?'cyan':''}">${rv.status}</span>
      ${r.salaryUp ? '<span class="tag gold">已加薪</span>' : ''}
      <span class="sp"></span>
      ${r.veto ? '' : `<span class="t-xs" style="font-weight:700">模拟仓 ${last}</span>`}
    </div>
    ${r.veto ? '<div class="t-xs t-dim" style="font-weight:700;margin-top:4px">风控官不持仓：他的 KPI 是别人少亏的钱</div>' : `
    <div style="margin:5px 0">${spark}</div>
    <div class="stat3">
      <div><div class="k">命中</div><div class="v">${rv.hit}</div></div>
      <div><div class="k">贡献</div><div class="v">${rv.contrib}</div></div>
      <div><div class="k">纪律</div><div class="v">${rv.disc}</div></div>
    </div>`}
    <div class="row" style="gap:4px">
      ${rv.pip ? `<button class="px-btn sm danger" data-cull="${r.id}">模拟：季度考核</button>` : ''}
      ${!r.veto && rv.status === '在岗' ? `<button class="px-btn sm ghost" data-fieldtrip="${r.id}">派出去调研</button>` : ''}
    </div>
    ${rv.pip ? '<div class="t-xs t-rose" style="font-weight:700;margin-top:4px">连续 2 季末位将触发淘汰评审</div>' : ''}
  </div>`;
}

function sliderRow(r, key, lo, hi){
  return `<div class="sld">
    <span class="lo">${lo}</span>
    <input type="range" min="1" max="10" value="${r[key]}" data-k="${key}">
    <span class="hi">${hi}</span>
  </div>`;
}

function bindDesk(){
  $$('.sliders').forEach(box=>{
    const r = DATA.researchers.find(x=>x.id === box.dataset.r);
    $$('input[type=range]', box).forEach(inp=>{
      inp.oninput = ()=>{
        r[inp.dataset.k] = +inp.value;
        $('#say-' + r.id).innerHTML = sayOf(r);
      };
    });
  });
  $$('.chip').forEach(c=> c.onclick = ()=> c.classList.toggle('on'));
  $$('[data-cull]').forEach(b=> b.onclick = ()=> openCullModal(b.dataset.cull));
  $$('[data-fieldtrip]').forEach(b=> b.onclick = ()=>{
    const r = DATA.researchers.find(x=>x.id === b.dataset.fieldtrip);
    DATA.reviews[r.id].status = '外出调研';
    drawDesk();
    toast(r.n + ' 已出门。情报会回流到老板日报');
    setTimeout(()=>{
      DATA.reviews[r.id].status = '在岗';
      if(typeof pushDaily === 'function')
        pushDaily('intel', `外出情报：${r.n} 带回「某上市公司产线满负荷，Q3 排产比较满」（★★ 需交叉）`);
      if(PANEL_OPEN === 'desk') drawDesk();
    }, 8000);
  });
}

function openCullModal(id){
  const r = DATA.researchers.find(x=>x.id === id);
  openModal(`
    <div class="win-bar" style="background:var(--coral)"><span>季度考核评审 · ${r.n}</span>
      <span class="dots" id="mClose" style="cursor:pointer">_ □ ×</span></div>
    <div style="padding:13px">
      <div class="t-sm" style="line-height:1.8;margin-bottom:10px">
        连续 2 季末位（#8/8）。命中 ${DATA.reviews[id].hit} · 贡献 ${DATA.reviews[id].contrib} · 纪律 ${DATA.reviews[id].disc}。<br>
        <span class="t-dim t-xs" style="font-weight:700">机制说明：淘汰不是惩罚失误，是止损方法论 —— 连他的模拟仓都在持续跑输基准。</span></div>
      <div class="row" style="gap:6px">
        <button class="px-btn sm" data-verdict="keep">保留观察一季</button>
        <button class="px-btn sm" data-verdict="down">降级 · 转数据支持岗</button>
        <button class="px-btn sm danger" data-verdict="out">淘汰出名册</button>
      </div>
    </div>`);
  $('#mClose').onclick = closeModal;
  $$('#modalBox [data-verdict]').forEach(b=> b.onclick = ()=>{
    const v = b.dataset.verdict;
    if(v === 'out'){
      r.gone = true;
      if(typeof pushDaily === 'function') pushDaily('review', `${r.n} 已淘汰出名册（连续 2 季末位）。移入前员工档案`);
      toast('已淘汰。名册见「前员工」');
    } else if(v === 'down'){
      DATA.reviews[id].status = '数据支持岗';
      toast('已降级：不再出观点，只做数据支持');
    } else toast('保留观察一季：下季度还末位就没得谈了');
    closeModal(); drawDesk();
  });
}

/* ---- 自定义研究员 ---- */
let NEW_SP = 'guest';
function openNewResearcher(){
  const keys = ['serenity','tech','macro','consume','growth','oldmoney','quant','risk','guest'];
  openModal(`
    <div class="win-bar" style="background:var(--pink)"><span>新建研究员</span><span class="dots" id="mClose" style="cursor:pointer">_ □ ×</span></div>
    <div style="padding:13px">
      <div class="field"><label>名字</label><input class="inp" id="nrName" placeholder="例：周期研究员" value="周期研究员"></div>
      <div class="field"><label>头像</label>
        <div class="avpick" id="nrAv">${keys.map(k=>`<div class="p ${k===NEW_SP?'on':''}" data-k="${k}">${avatarHTML(k,'s3')}</div>`).join('')}</div>
      </div>
      <div class="field"><label>性格</label>
        <div class="sliders" id="nrSliders">
          <div class="sld"><span class="lo">保守</span><input type="range" min="1" max="10" value="5" data-k="aggr"><span class="hi">激进</span></div>
          <div class="sld"><span class="lo">随大流</span><input type="range" min="1" max="10" value="5" data-k="indep"><span class="hi">独立</span></div>
          <div class="sld"><span class="lo">短线</span><input type="range" min="1" max="10" value="5" data-k="horizon"><span class="hi">长线</span></div>
        </div>
      </div>
      <div class="field"><label>关注因子（逗号分隔）</label>
        <input class="inp" id="nrFactors" value="产能周期,库存天数,价差,开工率"></div>
      <div class="field"><label>口头禅</label>
        <input class="inp" id="nrMotto" value="周期的顶是产能给的，不是价格给的。"></div>
      <div class="field"><label>对今日议题的发言（会按性格滑块自动改口）</label>
        <input class="inp" id="nrSay" value="涨价看的是产能弹性：这轮上游没扩产，价差还能撑两个季度。"></div>
      <div class="row" style="margin-top:12px">
        <button class="px-btn on dotted" id="nrOK" style="flex:1">OK · 入职</button>
        <button class="px-btn ghost" id="nrCancel">取消</button>
      </div>
    </div>`);
  $('#mClose').onclick = closeModal;
  $('#nrCancel').onclick = closeModal;
  $$('#nrAv .p').forEach(p=> p.onclick = ()=>{
    NEW_SP = p.dataset.k;
    $$('#nrAv .p').forEach(x=> x.classList.toggle('on', x === p));
  });
  $('#nrOK').onclick = ()=>{
    const g = {};
    $$('#nrSliders input').forEach(i=> g[i.dataset.k] = +i.value);
    const base = $('#nrSay').value;
    const r = {
      id:'custom' + Date.now(), sp:NEW_SP, n:$('#nrName').value || '无名研究员', proto:'自定义',
      lv:1, xp:0, adopt:0, hit:0, mdd:0, love:1, adopted:0, rejected:0,
      aggr:g.aggr, indep:g.indep, horizon:g.horizon,
      factors:$('#nrFactors').value.split(/[,，]/).map(s=>s.trim()).filter(Boolean),
      motto:$('#nrMotto').value,
      say:{ hi:base + ' 这个位置我敢重仓。', mid:base + ' 先做半仓看验证。', lo:base + ' 但我只给观察仓。' }
    };
    DEFAULT_PERSONA[r.id] = [r.aggr, r.indep, r.horizon];
    DATA.researchers.push(r);
    closeModal(); drawDesk();
  };
}

/* 从知识库缺口派单过来的任务，落在研究员的收件箱 */
function dispatchTask(researcherId, text){
  const r = DATA.researchers.find(x=>x.id===researcherId) || DATA.researchers[1];
  r.inbox = r.inbox || [];
  r.inbox.push(text);
  const box = $('#inbox-' + r.id);
  if(box){
    const empty = $('#inboxEmpty-' + r.id); if(empty) empty.remove();
    box.insertAdjacentHTML('beforeend', `<span class="taskchip">▸ ${text}</span>`);
  }
  return r;
}


/* ==========================================================================
   个人工作看板（走到工位按 E 触发）
   模拟组合 / 历史报告 / 性格现调 / 收件箱 / 派遣
   ========================================================================== */
DATA.reports = {
  serenity: [
    {t:'07-24', title:'光刻胶窄口论文（反路演后降级版）', score:82, tag:'深研'},
    {t:'07-11', title:'混合键合：被低估的窄口候选', score:76, tag:'快研'},
    {t:'06-28', title:'电子特气寡头格局：验证周期即护城河', score:88, tag:'深研'}],
  tech: [
    {t:'07-27', title:'存储涨价二阶导监测（周更 #6）', score:79, tag:'跟踪'},
    {t:'07-18', title:'HBM4 良率爬坡分化：三家原厂拆解', score:85, tag:'深研'},
    {t:'07-02', title:'液冷渗透率：从可选到必选的拐点估计', score:73, tag:'快研'}],
  quant: [
    {t:'07-25', title:'涨价主题因子 IC 衰减监测', score:81, tag:'跟踪'},
    {t:'07-08', title:'机构搜索热度因子 V2.8 复核', score:90, tag:'深研'}],
  growth: [
    {t:'07-26', title:'材料端小盘动量筛（周更）', score:70, tag:'跟踪'},
    {t:'07-15', title:'横截面加速度：谁在被买爆', score:74, tag:'快研'}],
  macro: [
    {t:'07-21', title:'供给收缩型涨价的久期问题', score:77, tag:'快研'}],
  oldmoney: [
    {t:'07-19', title:'涨价链现金流体检：谁把钱分给了股东', score:86, tag:'深研'}],
  consume: [
    {t:'07-10', title:'渠道被动补库监测（PIP 观察期作业）', score:58, tag:'跟踪'}]
};

function openResearcherPanel(id){
  const r = DATA.researchers.find(x=>x.id === id);
  if(!r) return;
  if(r.gone) return toast(r.n + ' 已离职。工位还空着，像个提醒');
  const rv = DATA.reviews[r.id] || {};
  PANEL_OPEN = 'r:' + id;
  $('#panelTitle').textContent = r.n + ' · 个人工作看板';
  $('#panelBar').style.background = 'var(--teal)';
  const nav = (typeof rNavSeries === 'function' && !r.veto) ? rNavSeries(id) : null;
  const reports = DATA.reports[id] || [];
  $('#panelBody').innerHTML = `
    <section class="screen active">
      <div style="display:grid;grid-template-columns:360px 1fr;gap:12px;align-items:start">
        <div class="col">
          ${win('灵魂 · 老板可现调', `
            <div class="row" style="margin-bottom:9px">${avatarHTML(r.sp,'s5')}
              <div><b style="font-size:14px">${r.n}</b> ${rarityBadge(r)} ${r.veto?'<span class="tag rose">VETO</span>':''}
                <div class="rproto">${r.proto}</div>
                <div class="row" style="gap:4px;margin-top:4px">
                  <span class="tag ${rv.rank<=3?'gold':''}">考核 #${rv.rank||'-'}</span>
                  ${rv.pip?'<span class="tag rose">PIP</span>':''}
                  <span class="tag">${rv.status||'在岗'}</span>
                </div></div></div>
            <div class="motto">「${r.motto}」</div>
            <div style="margin-top:8px">${trustBar(r.id, true)}</div>
            <div class="sliders" data-r="${r.id}" style="margin-top:9px">
              <div class="sld"><span class="lo">保守</span><input type="range" min="1" max="10" value="${r.aggr}" data-k="aggr"><span class="hi">激进</span></div>
              <div class="sld"><span class="lo">随大流</span><input type="range" min="1" max="10" value="${r.indep}" data-k="indep"><span class="hi">独立</span></div>
              <div class="sld"><span class="lo">短线</span><input type="range" min="1" max="10" value="${r.horizon}" data-k="horizon"><span class="hi">长线</span></div>
            </div>
            <div class="cap" style="margin:4px 0">对今日议题的发言（拖滑块看他改口）</div>
            <div class="saybox" id="say-${r.id}">${sayOf(r)}</div>
            <div class="cap" style="margin:8px 0 4px">关注因子</div>
            <div class="chips">${r.factors.map((f,i)=>`<span class="chip ${i<3?'on':''}">${f}</span>`).join('')}</div>
            ${r.creed ? `<div class="bridge" style="margin-top:8px">信条 · ${r.creed}</div>` : ''}
            <button class="px-btn on dotted" id="soulEdit" style="width:100%;margin-top:9px">✎ 编辑灵魂文件（SOUL.md）</button>`,
            {color:'pink'})}
          ${win('任务收件箱', `
            <div id="inbox-${r.id}">
              ${(r.inbox && r.inbox.length)
                ? r.inbox.map(t=>`<span class="taskchip">▸ ${t}</span>`).join('')
                : '<div class="t-xs t-dim" style="font-weight:700">空 · 知识库缺口和老板投稿都会派到这里</div>'}
            </div>
            <div class="row" style="gap:6px;margin-top:9px">
              ${!r.veto && (rv.status === '在岗') ? `<button class="px-btn sm" data-fieldtrip="${r.id}">派出去调研</button>` : ''}
              <button class="px-btn sm ghost" id="gotoRoster">打开研究员名册</button>
            </div>`, {color:'mustard'})}
          ${win('大脑 · 专属 LLM', (typeof rLLMConfigHTML === 'function' ? rLLMConfigHTML(r.id) : ''),
            {color:'sky', sub: (typeof rLLMGet === 'function' && rLLMGet(r.id)?.key) ? '自带大脑 🧠' : '共用公司大脑'})}
        </div>
        <div class="col">
          ${r.veto
            ? win('风控官不持仓', '<div class="t-sm" style="font-weight:700;line-height:1.8">他的 KPI 是别人少亏的钱。三道闸的判定记录见交易台 blotter。</div>', {color:'coral'})
            : win('模拟组合', `
              <div class="row"><span class="cap">30 日纸面 NAV</span><span class="demo-mark">编造值</span>
                <span class="sp"></span><b style="font-size:15px">${nav ? nav[nav.length-1].toFixed(1) : '—'}</b></div>
              <div style="margin-top:8px">${nav && typeof sparkHTML === 'function' ? sparkHTML(nav, 560, 96, rv.pip ? 'var(--coral)' : 'var(--teal)') : ''}</div>
              <div class="stat3" style="max-width:340px;margin-top:9px">
                <div><div class="k">命中</div><div class="v">${rv.hit ?? '—'}</div></div>
                <div><div class="k">贡献</div><div class="v">${rv.contrib ?? '—'}</div></div>
                <div><div class="k">纪律</div><div class="v">${rv.disc ?? '—'}</div></div>
              </div>`, {color:'teal', sub:'他的仓位不是公司的仓位——考核用'})}
          ${win('模拟仓 · 买卖建议时间轴', (DATA.trades[id] && DATA.trades[id].length)
            ? DATA.trades[id].map(td=>`
              <div class="gap-item">
                <div class="why" style="color:var(--ink)">
                  <span class="t-dim">${td.t}</span>
                  <span class="tag ${td.side==='buy'?'cyan':'rose'}">${td.side==='buy'?'买入建议':'卖出建议'}</span><br>
                  <b>${td.act}</b> — ${td.why}<br>
                  <span class="${/否决|止损|强平/.test(td.st)?'t-rose':/采纳|执行|持有/.test(td.st)?'t-cyan':'t-dim'}" style="font-weight:700">→ ${td.st}</span>
                </div>
              </div>`).join('')
            : '<div class="t-xs t-dim" style="font-weight:700">还没开过口。</div>',
            {color:'coral', sub:'建议 ≠ 成交：每条都要过原则闸 + 老板签字'})}
          ${win('历史报告', reports.length ? reports.map((rp,i)=>`
            <div class="gap-item" style="cursor:pointer" data-report="${id}|${i}">
              <div class="gt"><span class="tag ${rp.score>=85?'gold':rp.score>=75?'cyan':''}">${rp.score} 分</span>
                <span>${rp.title}</span></div>
              <div class="why">${rp.t} · ${rp.tag} · report-scorer 评分 · 点开看摘要</div>
            </div>`).join('') : '<div class="t-xs t-dim" style="font-weight:700">还没有产出。新员工或者该谈话了。</div>',
            {color:'sky', sub:'公司资产，跳槽带不走'})}
        </div>
      </div>
      <div class="panel-foot"><span class="demo-mark">DEMO</span> 战绩与报告评分为编造值。
        <span class="sp"></span><span>里奇流资本 · 曲率即命运</span></div>
    </section>`;
  $('#panel').classList.add('open');
  $('#panelScrim').classList.add('open');
  walkPause(true);
  /* 绑定 */
  $$('#panelBody .sliders input').forEach(inp=> inp.oninput = ()=>{
    r[inp.dataset.k] = +inp.value;
    $('#say-' + r.id).innerHTML = sayOf(r);
  });
  $$('#panelBody .chip').forEach(c=> c.onclick = ()=> c.classList.toggle('on'));
  $$('#panelBody [data-fieldtrip]').forEach(b=> b.onclick = ()=>{
    DATA.reviews[r.id].status = '外出调研';
    toast(r.n + ' 已出门。情报会回流老板日报');
    closePanel();
    setTimeout(()=>{
      DATA.reviews[r.id].status = '在岗';
      if(typeof pushDaily === 'function')
        pushDaily('intel', `外出情报：${r.n} 带回「某上市公司产线满负荷，Q3 排产比较满」（★★ 需交叉）`);
    }, 8000);
  });
  const gr = $('#gotoRoster'); if(gr) gr.onclick = ()=> openComponent('desk');
  const se = $('#soulEdit'); if(se) se.onclick = ()=> openSoulEditor(id);
  if(typeof bindRLLMConfig === 'function') bindRLLMConfig(id, ()=> openResearcherPanel(id));
  $$('#panelBody [data-report]').forEach(el2=> el2.onclick = ()=>{
    const [rid, idx] = el2.dataset.report.split('|');
    const rp = DATA.reports[rid][+idx];
    openModal(`
      <div class="win-bar" style="background:var(--sky)"><span>${rp.title}</span>
        <span class="dots" id="mClose" style="cursor:pointer">_ □ ×</span></div>
      <div style="padding:13px">
        <div class="row" style="margin-bottom:8px">
          <span class="tag gold">${rp.score} 分</span><span class="tag">${rp.tag}</span>
          <span class="t-xs t-dim" style="font-weight:700">${rp.t} · ${r.n}</span></div>
        <div class="minutes" style="font-size:10px">
          <h4>摘要（demo 占位）</h4>
          <div class="sec">完整报告在投产阶段接 deep-report 管线与云盘归档。此处演示：报告是<b>公司资产</b>，
          挂在研究员名下、按 report-scorer 评分进考核，人走了报告留下。</div>
          <div class="sec"><span class="k">下车信号</span> 每篇报告强制携带，跟踪组件自动盯。</div>
        </div>
      </div>`);
    $('#mClose').onclick = closeModal;
  });
}

/* ==========================================================================
   灵魂文件（SOUL.md 式可编辑）+ 模拟仓买卖建议时间轴
   ========================================================================== */
DATA.trades = {
  serenity: [
    {t:'07-29 09:31', side:'buy',  act:'买入 电子特气 A 2%', why:'窄口传导确认，二供未至', st:'老板已采纳'},
    {t:'07-24 13:20', side:'buy',  act:'光刻胶 A 重仓提案 8%', why:'KrF 验证独占窗口', st:'风控否决 · 流动性闸'},
    {t:'07-18 10:05', side:'sell', act:'减仓 靶材 C 至 3%', why:'被依赖度下降，窄口变宽', st:'老板已采纳'},
    {t:'07-08 09:40', side:'buy',  act:'买入 大硅片 B 3%', why:'拉货顺序第一站', st:'持有中 +3.7%'}],
  tech: [
    {t:'07-28 14:55', side:'buy',  act:'加仓 液冷 C 1%', why:'渗透率二阶导为正', st:'老板已采纳'},
    {t:'07-21 09:35', side:'sell', act:'清仓 消费电子 F', why:'边际变化衰竭', st:'已执行 -2.1%'},
    {t:'07-11 10:12', side:'buy',  act:'买入 光模块 E 4%', why:'排产上修 + 量价齐升', st:'持有中 +8.6%'}],
  quant: [
    {t:'07-25 09:32', side:'buy',  act:'因子篮子调仓（12 只）', why:'涨价主题 IC 仍显著', st:'自动执行'},
    {t:'07-12 09:30', side:'sell', act:'剔除拥挤度前 5% 持仓', why:'拥挤度闸触发', st:'自动执行'}],
  growth: [
    {t:'07-26 09:31', side:'buy',  act:'买入 高多层 PCB D 3%', why:'横截面加速度第一', st:'老板已采纳'},
    {t:'07-19 14:50', side:'sell', act:'破位止损 材料 G', why:'斜率走平即离场', st:'已执行 -6.8%'},
    {t:'07-05 09:36', side:'buy',  act:'追入 铜箔 H 2%', why:'涨价函密度飙升', st:'止损离场 -9.2%'}],
  macro: [
    {t:'07-15 10:00', side:'sell', act:'建议整体降仓 10%', why:'流动性边际收紧', st:'老板部分采纳(-5%)'}],
  oldmoney: [
    {t:'07-10 09:45', side:'buy',  act:'买入 高股息公用 J 4%', why:'自由现金流转正+分红率上调', st:'持有中 +1.9%'}],
  consume: [
    {t:'07-03 09:40', side:'buy',  act:'买入 白酒 K 2%', why:'渠道库存见底（误判）', st:'风控强平 -12%'}]
};

function soulText(r){
  return `口头禅: ${r.motto}
激进: ${r.aggr}
独立: ${r.indep}
长线: ${r.horizon}
因子: ${r.factors.join(', ')}
发言·激进: ${r.say.hi}
发言·中性: ${r.say.mid}
发言·保守: ${r.say.lo}
信条: ${r.creed || '（可自由书写。这是他的 SOUL.md，改了就是另一个人。）'}`;
}

function parseSoul(txt, r){
  txt.split('\n').forEach(line=>{
    const m = line.match(/^(口头禅|激进|独立|长线|因子|发言·激进|发言·中性|发言·保守|信条)\s*[:：]\s*(.*)$/);
    if(!m) return;
    const [, k, v] = m;
    if(k === '口头禅') r.motto = v;
    else if(k === '激进') r.aggr = clamp(parseInt(v) || r.aggr, 1, 10);
    else if(k === '独立') r.indep = clamp(parseInt(v) || r.indep, 1, 10);
    else if(k === '长线') r.horizon = clamp(parseInt(v) || r.horizon, 1, 10);
    else if(k === '因子') r.factors = v.split(/[,，]/).map(s=>s.trim()).filter(Boolean);
    else if(k === '发言·激进') r.say.hi = v;
    else if(k === '发言·中性') r.say.mid = v;
    else if(k === '发言·保守') r.say.lo = v;
    else if(k === '信条') r.creed = v;
  });
}

function openSoulEditor(id){
  const r = DATA.researchers.find(x=>x.id === id);
  openModal(`
    <div class="win-bar" style="background:var(--pink)"><span>SOUL.md · ${r.n}</span>
      <span class="dots" id="mClose" style="cursor:pointer">_ □ ×</span></div>
    <div style="padding:13px">
      <div class="t-xs t-dim" style="font-weight:700;line-height:1.7;margin-bottom:8px">
        这是他的灵魂文件。逐行 <b>键: 值</b>，改完保存立刻生效（存本机，刷新不丢）。<br>
        投产阶段这就是每个 agent 的 system prompt 源文件。</div>
      <textarea class="inp" id="soulTa" rows="12" style="resize:vertical;font-size:11px;line-height:1.8">${soulText(r)}</textarea>
      <div class="row" style="margin-top:10px;gap:6px">
        <button class="px-btn on dotted" id="soulSave" style="flex:1">保存灵魂</button>
        <button class="px-btn ghost" id="soulReset">恢复出厂人格</button>
      </div>
    </div>`);
  $('#mClose').onclick = closeModal;
  $('#soulSave').onclick = ()=>{
    parseSoul($('#soulTa').value, r);
    localStorage.setItem('rf_soul_' + id, $('#soulTa').value);
    closeModal();
    if(PANEL_OPEN === 'r:' + id) openResearcherPanel(id);
    else if(PANEL_OPEN === 'desk') drawDesk();
    toast(r.n + ' 的灵魂已改写。他自己还不知道');
  };
  $('#soulReset').onclick = ()=>{
    localStorage.removeItem('rf_soul_' + id);
    const d = DEFAULT_PERSONA[id];
    if(d){ r.aggr = d[0]; r.indep = d[1]; r.horizon = d[2]; }
    closeModal();
    if(PANEL_OPEN === 'r:' + id) openResearcherPanel(id);
    toast('已恢复出厂人格（口头禅等文本字段保留当前值）');
  };
}

/* 启动时应用本机已保存的灵魂 */
(function applySavedSouls(){
  DATA.researchers.forEach(r=>{
    const saved = localStorage.getItem('rf_soul_' + r.id);
    if(saved) parseSoul(saved, r);
  });
})();

/* ==========================================================================
   角色抽卡：SSR/SR/R（赚钱能力·实用性）· 信任血条 · LV=沉淀丰富度
   现有班底也标定稀有度——诚实定级，不看职级看赚钱。
   ========================================================================== */
const RARITY_OF = { serenity:'SSR', risk:'SSR', tech:'SR', quant:'SR', oldmoney:'SR',
  growth:'R', macro:'R', consume:'R' };
const TRUST_INIT = { serenity:86, tech:74, macro:60, consume:35, growth:66,
  oldmoney:78, quant:70, risk:95 };
Object.entries(TRUST_INIT).forEach(([id, v])=>{
  if(DATA.reviews[id]) DATA.reviews[id].trust = v;
});

function rarityOf(r){ return r.rarity || RARITY_OF[r.id] || 'R'; }
function rarityBadge(r){
  const t = rarityOf(r);
  return `<span class="rarity ${t.toLowerCase()}">${t}</span>`;
}
function trustBar(id, wide){
  const t = (DATA.reviews[id] && DATA.reviews[id].trust) ?? 50;
  const cls = t >= 70 ? 'hi' : t >= 45 ? 'mid' : 'lo';
  return `<div class="row" style="gap:6px">
    <span class="cap" style="flex:none">信任 HP</span>
    <div class="hpbar" style="flex:1;${wide?'':'max-width:150px'}"><i class="${cls}" style="width:${t}%"></i></div>
    <b style="flex:none">${t}</b></div>`;
}

/* ---- 卡池（demo 固定 10 张，抽完即空；固定种子可复现） ---- */
DATA.gachaPool = [
  {tier:'SSR', n:'扫地僧', sp:'oldmoney', proto:'退休复出的传奇 PM',
   factors:['周期钟摆','人性','仓位艺术'], motto:'我打过 2015。你们这叫波动？',
   say:{hi:'这个位置，闭着眼睛买，睁着眼睛跑。', mid:'仓位减半，剩下的交给时间。', lo:'现金也是仓位。等。'},
   aggr:6, indep:10, horizon:9, trust:70, lv:30},
  {tier:'SSR', n:'K 线之神', sp:'growth', proto:'神秘牛散 · 十年百倍(自称)',
   factors:['筹码结构','龙虎榜','情绪周期'], motto:'基本面是用来解释 K 线的。',
   say:{hi:'主升浪确认，满上。', mid:'洗盘。拿住，别看账户。', lo:'情绪冰点，空仓看戏。'},
   aggr:10, indep:9, horizon:2, trust:40, lv:22},
  {tier:'SR', n:'产业链老兵', sp:'tech', proto:'前大厂供应链总监',
   factors:['排产','库存水位','验厂'], motto:'报表会骗人，产线不会。',
   say:{hi:'我打了三个电话，产线是真的满。', mid:'排产在爬，但没到抢产能的程度。', lo:'产线冷清，故事是编的。'},
   aggr:5, indep:8, horizon:6, trust:65, lv:18},
  {tier:'SR', n:'海归量化博士', sp:'quant', proto:'常春藤 PhD · 只信 t 值',
   factors:['因子正交','半衰期','容量'], motto:'不显著就是不存在。',
   say:{hi:'信号显著且未拥挤，加。', mid:'边际显著，小仓试。', lo:'p 值 0.3，这是占星不是投资。'},
   aggr:4, indep:9, horizon:7, trust:60, lv:16},
  {tier:'SR', n:'财报侦探', sp:'macro', proto:'专挖附注和现金流',
   factors:['应收账款','存货周转','关联交易'], motto:'利润是观点，现金流是事实。',
   say:{hi:'现金流干净得像样板间，重仓无虞。', mid:'有两处附注存疑，等问询函。', lo:'应收涨得比营收快，跑。'},
   aggr:3, indep:8, horizon:8, trust:68, lv:15},
  {tier:'R', n:'卷王实习生', sp:'guest', proto:'凌晨三点还在扒公告',
   factors:['公告速读','会议纪要','表格'], motto:'老板我做了 40 页 PPT。',
   say:{hi:'我整理了全行业数据！都在表里！', mid:'我再核对一遍。', lo:'这个我还没学过……我去学！'},
   aggr:5, indep:3, horizon:5, trust:55, lv:3},
  {tier:'R', n:'消息灵通老哥', sp:'guest', proto:'群比你多 · 饭局比你密',
   factors:['小道消息','龙虎榜席位','传闻'], motto:'我有个朋友说……',
   say:{hi:'三个群都在传，肯定有事。', mid:'消息对半信，先小仓。', lo:'群里静悄悄，没行情。'},
   aggr:8, indep:2, horizon:1, trust:30, lv:8},
  {tier:'R', n:'看图仙人', sp:'guest', proto:'均线是他的信仰',
   factors:['均线','缠论','斐波那契'], motto:'一切都在图里。',
   say:{hi:'金叉放量，天予不取反受其咎。', mid:'缠中枢震荡，等三买。', lo:'均线空头排列，图不会骗人。'},
   aggr:7, indep:5, horizon:3, trust:35, lv:6},
  {tier:'R', n:'佛系研究员', sp:'consume', proto:'不卷 · 但从不踩雷',
   factors:['常识','估值','耐心'], motto:'看不懂的都不碰，所以我还活着。',
   say:{hi:'这个我真看得懂，可以买。', mid:'再等等，不着急。', lo:'看不懂。pass。'},
   aggr:2, indep:7, horizon:9, trust:62, lv:9},
  {tier:'R', n:'公众号写手', sp:'guest', proto:'10w+ 制造机 · 择时反指',
   factors:['流量','情绪','标题'], motto:'我发车的时候就是山顶。',
   say:{hi:'这个题材我写一篇就能带火！', mid:'流量在起，但还没到全民讨论。', lo:'散户都不点开了，行情还早。'},
   aggr:9, indep:1, horizon:2, trust:25, lv:5}
];
const GACHA_RATES = 'SSR 5% · SR 25% · R 70%（演示为固定种子，非真随机）';

function gachaPull(){
  if(!DATA.gachaPool.length) return null;
  const roll = rnd();
  let tier = roll < .05 ? 'SSR' : roll < .30 ? 'SR' : 'R';
  /* 池里没这档就降级/升级找最近的 */
  let cand = DATA.gachaPool.filter(c=>c.tier === tier);
  if(!cand.length) cand = DATA.gachaPool.filter(c=>c.tier === 'SR');
  if(!cand.length) cand = DATA.gachaPool;
  const pick_ = cand[Math.floor(rnd() * cand.length)];
  return pick_;
}

let GACHA_LEFT = 5;
function openGacha(){
  openModal(`
    <div class="win-bar" style="background:linear-gradient(90deg,#e9b23c,#e8535a)">
      <span>人才市场 · 角色抽卡</span><span class="dots" id="mClose" style="cursor:pointer">_ □ ×</span></div>
    <div style="padding:13px">
      <div class="row" style="margin-bottom:9px">
        <span class="t-xs t-dim" style="font-weight:700">${GACHA_RATES}</span>
        <span class="sp"></span>
        <span class="tag gold">本季猎头预算 ${GACHA_LEFT} 抽</span></div>
      <div class="gacha-stage" id="gachaStage">
        <div class="gacha-card back" id="gachaCard"><div class="q">?</div>
          <div class="t-xs" style="font-weight:700">池内剩 ${DATA.gachaPool.length} 人</div></div>
      </div>
      <div class="row" style="margin-top:10px;gap:6px">
        <button class="px-btn on dotted" id="pullBtn" style="flex:1" ${GACHA_LEFT<=0||!DATA.gachaPool.length?'disabled':''}>
          ⊕ 抽一发（剩 ${GACHA_LEFT}）</button>
      </div>
      <div class="t-xs t-dim" style="font-weight:700;margin-top:7px;line-height:1.7">
        SSR/SR/R = 赚钱能力与实用性定级。抽到只是开始：信任 HP 靠共事攒，LV 靠沉淀资料涨。<br>
        <span class="t-rose">R 卡不是废卡——公众号写手是全场最准的反指。</span></div>
    </div>`);
  $('#mClose').onclick = closeModal;
  $('#pullBtn').onclick = doPull;
}

async function doPull(){
  const btn = $('#pullBtn'); if(!btn || btn.disabled) return;
  btn.disabled = true;
  GACHA_LEFT--;
  const card = $('#gachaCard'), stage = $('#gachaStage');
  card.className = 'gacha-card back gacha-shake';
  await sleep(520);
  const c = gachaPull();
  if(!c){ toast('池子空了'); return; }
  DATA.gachaPool = DATA.gachaPool.filter(x=>x !== c);
  const burst = el('div','gacha-burst ' + c.tier.toLowerCase());
  stage.appendChild(burst);
  setTimeout(()=>burst.remove(), 650);
  card.className = 'gacha-card tier-' + c.tier.toLowerCase();
  card.innerHTML = `
    <div class="rarity ${c.tier.toLowerCase()}" style="font-size:13px">${c.tier}</div>
    ${avatarHTML(c.sp,'s4')}
    <b style="font-size:14px">${c.n}</b>
    <div class="t-xs t-dim" style="font-weight:700;text-align:center;padding:0 8px">${c.proto}</div>
    <div class="t-xs" style="font-weight:700">信任 ${c.trust} · LV.${c.lv}</div>`;
  /* 签约区 */
  let bar = $('#gachaSign');
  if(!bar){
    bar = el('div','row'); bar.id = 'gachaSign';
    bar.style.cssText = 'margin-top:8px;gap:6px';
    stage.parentElement.insertBefore(bar, stage.nextSibling);
  }
  bar.innerHTML = `
    <button class="px-btn on" id="signBtn" style="flex:1">✍ 签下 ${c.n}</button>
    <button class="px-btn ghost" id="passBtn">放回池子</button>`;
  $('#signBtn').onclick = ()=>{
    const id = 'g' + Date.now();
    DATA.researchers.push({id, sp:c.sp, n:c.n, proto:c.proto, rarity:c.tier,
      lv:c.lv, xp:10, adopt:0, hit:0, mdd:0, love:2, adopted:0, rejected:0,
      aggr:c.aggr, indep:c.indep, horizon:c.horizon, factors:c.factors,
      motto:c.motto, say:c.say});
    DATA.reviews[id] = {hit:50, contrib:40, disc:60, rank:DATA.researchers.length,
      status:'在岗', trust:c.trust};
    DEFAULT_PERSONA[id] = [c.aggr, c.indep, c.horizon];
    if(typeof pushDaily === 'function')
      pushDaily('review', `抽卡入职：${c.tier} ${c.n}（${c.proto}）。信任 ${c.trust}，好好处`);
    closeModal(); drawDesk();
    toast(`${c.tier}！${c.n} 已入职。工位自己找`);
  };
  $('#passBtn').onclick = ()=>{
    DATA.gachaPool.push(c);
    bar.innerHTML = '';
    toast('放回去了。他看你的眼神有点复杂');
  };
  const left = $('#pullBtn');
  left.textContent = `⊕ 抽一发（剩 ${GACHA_LEFT}）`;
  if(GACHA_LEFT > 0 && DATA.gachaPool.length) left.disabled = false;
}
