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
  $('#btnNewR').onclick = openNewResearcher;
  $('#btnResetR').onclick = ()=>{ DATA.researchers.forEach(r=>{
      const d = DEFAULT_PERSONA[r.id]; if(d){ r.aggr=d[0]; r.indep=d[1]; r.horizon=d[2]; }
    }); drawDesk(); };
};

/* 记住出厂性格，方便一键还原 */
const DEFAULT_PERSONA = {};
DATA.researchers.forEach(r=> DEFAULT_PERSONA[r.id] = [r.aggr, r.indep, r.horizon]);

function drawDesk(){
  const g = $('#deskGrid'); if(!g) return;
  g.innerHTML = '';
  DATA.researchers.forEach(r=> g.insertAdjacentHTML('beforeend', researcherCard(r)));
  bindDesk();
}

function researcherCard(r){
  const color = r.veto ? 'coral' : r.id==='serenity' ? 'pink' : r.id==='quant' ? 'sky' : 'teal';
  const body = `
    <div class="rhead">
      ${avatarHTML(r.sp,'s4')}
      <div>
        <div class="rname">${r.n} ${r.veto?'<span class="tag rose">VETO</span>':''}</div>
        <div class="rproto">${r.proto}</div>
      </div>
      <div class="lv">LV.${r.lv}<br><span class="t-xs t-dim">XP ${r.xp}%</span></div>
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
    <div class="inbox" id="inbox-${r.id}">
      <span class="cap">任务收件箱</span>
      ${(r.inbox && r.inbox.length)
        ? r.inbox.map(t=>`<span class="taskchip">▸ ${t}</span>`).join('')
        : `<div class="t-xs t-dim" style="margin-top:3px" id="inboxEmpty-${r.id}">空 · 可从知识库缺口派单过来</div>`}
    </div>`;
  return win(r.n, body, {color, cls:'rcard', sub:'LV.'+r.lv});
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

