/* ricciflow — 壳：组件注册表 + 面板 + HUD + 引导 + 全局游戏状态
   最后加载，负责 bootstrap。 */

/* ---------- 全局游戏状态 ---------- */
const GAME = {
  location: 'office',          /* office | floors | city | visiting:<id> */
  guideDone: false,
  decorMode: false
};

/* ---------- 组件注册表 ----------
   furn: 办公室家具 id（tile 引擎热点）；enabled 可在装修模式改 */
const COMPONENTS = [
  { id:'research', n:'研究台',   icon:'研', furn:'boss_desk',  color:'mustard', enabled:true,
    render: ()=> RENDER.research && RENDER.research() },
  { id:'rack',     n:'数据源',   icon:'源', furn:'quote_wall', color:'teal',    enabled:true,
    render: ()=> RENDER.sources() },
  { id:'atlas',    n:'知识库',   icon:'库', furn:'bookshelf',  color:'sky',     enabled:true,
    render: ()=> RENDER.atlas() },
  { id:'desk',     n:'研究员',   icon:'员', furn:'staff_area', color:'teal',    enabled:true,
    render: ()=> RENDER.desk() },
  { id:'scenes',   n:'会议室',   icon:'会', furn:'meeting_door', color:'pink',  enabled:true,
    render: ()=> RENDER.war() },
  { id:'trading',  n:'交易台',   icon:'交', furn:'trade_desk', color:'coral',   enabled:true,
    render: ()=> RENDER.trading && RENDER.trading() },
  { id:'archive',  n:'档案室',   icon:'档', furn:'coffee',     color:'pink',    enabled:true,
    render: ()=> RENDER.archive && RENDER.archive() },
  { id:'finance',  n:'财务处',   icon:'财', furn:'safe',       color:'mustard', enabled:true,
    render: ()=> RENDER.finance && RENDER.finance() },
  { id:'settings', n:'系统',     icon:'统', furn:'rules_board', color:'ink',    enabled:true,
    render: ()=> RENDER.sys() },
];
/* 屏容器 id 与 V1 保持一致，V1 渲染函数零改动 */
const SCREEN_ID = { research:'scr-research', rack:'scr-sources', atlas:'scr-atlas',
  desk:'scr-desk', scenes:'scr-war', trading:'scr-trading', archive:'scr-archive',
  finance:'scr-finance', settings:'scr-sys' };

function compById(id){ return COMPONENTS.find(c=> c.id === id); }

/* ---------- 组件面板 ---------- */
let PANEL_OPEN = null;
function openComponent(id){
  const c = compById(id);
  if(!c) return;
  if(!c.enabled){ toast('该组件已在装修模式中停用'); return; }
  PANEL_OPEN = id;
  $('#panelTitle').textContent = c.n + ' · ' + c.icon;
  $('#panelBar').style.background = `var(--${c.color === 'ink' ? 'ink' : c.color})`;
  /* 页脚写「这一屏读的是哪个真实文件」，不写免责声明。
     以前这里写死一句免责声明，是整站看起来像剧本的一大原因。 */
  $('#panelBody').innerHTML =
    `<section class="screen active" id="${SCREEN_ID[id]}"></section>
     <div class="panel-foot">${typeof provenanceFoot === 'function'
       ? provenanceFoot(id) : '<span>里奇流资本 · 曲率即命运</span>'}</div>`;
  $('#panel').classList.add('open');
  $('#panelScrim').classList.add('open');
  c.render();
  if(typeof bindLockedCards === 'function') bindLockedCards();
  if(typeof walkPause === 'function') walkPause(true);
}
function closePanel(){
  PANEL_OPEN = null;
  $('#panel').classList.remove('open');
  $('#panelScrim').classList.remove('open');
  if(typeof walkPause === 'function') walkPause(false);
}
$('#panelClose').onclick = closePanel;
$('#panelScrim').onclick = closePanel;
document.addEventListener('keydown', e=>{
  if(e.key === 'Escape'){
    if($('#modal').classList.contains('open')) closeModal();
    else if($('#drawer').classList.contains('open')) closeDrawer();
    else if(PANEL_OPEN) closePanel();
  }
});

/* toast（V1 的 toast 在 scenes.js 里定义过；这里兜底一份同名不同实现会冲突——
   scenes.js 的 toast 是 function 声明，会提升；此处只在缺失时补） */
if(typeof toast !== 'function'){
  window.toast = function(msg){
    const t = el('div','', msg);
    t.style.cssText = 'position:fixed;left:50%;bottom:70px;transform:translateX(-50%);z-index:9500;' +
      'background:var(--ink);color:var(--cream);padding:8px 14px;font-size:11px;font-weight:700';
    document.body.appendChild(t);
    setTimeout(()=> t.remove(), 2200);
  };
}

/* ---------- HUD：图标 + 全称常显，悬停出一句话说明 ---------- */
const HUD_HINTS = {
  research:'流水线看板 · 灵感到跟踪', rack:'数据接口机架', atlas:'知识图谱与缺口', finance:'tokens 薪资 · 成本 · 基金收入',
  desk:'研究员名册与考核', scenes:'晨会与复盘 · 各研究员观点原文', trading:'持仓·原则闸·拦截',
  archive:'每天谁写了什么 · 按日期归档', settings:'配色·LLM·装修·红线'
};
function drawHUD(){
  const hud = $('#hud');
  hud.innerHTML = '';
  COMPONENTS.forEach(c=>{
    const b = el('button','hud-item' + (c.enabled ? '' : ' off'),
      `<span class="ico">${c.icon}</span><span class="name">${c.n}</span>
       <span class="hint">${HUD_HINTS[c.id] || ''}</span>`);
    b.dataset.hud = c.id;
    b.onclick = ()=> openComponent(c.id);
    hud.appendChild(b);
  });
  /* 老板的手机（常驻，带未读角标） */
  const ph = el('button','hud-item',
    `<span class="ico">✆</span><span class="name">手机</span>
     <span class="ph-badge" id="phoneBadge" style="display:none">0</span>
     <span class="hint">通知 · 公司群 · 老板圈</span>`);
  ph.dataset.hud = 'phone';
  ph.onclick = ()=> openPhone();
  hud.appendChild(ph);
  /* 大地图入口：在办公室时锁定 */
  const locked = GAME.location === 'office';
  const m = el('button','hud-item' + (locked ? ' locked' : ''),
    `<span class="ico">✈</span><span class="name">世界地图</span>
     <span class="hint">${locked ? '走大门出去才解锁' : '三个金融圈隔海相望'}</span>`);
  m.dataset.hud = 'map';
  m.onclick = ()=>{
    if(GAME.location === 'office') toast('老板，出门要走大门。楼下才有世界。');
    else if(typeof enterCity === 'function') enterCity();
  };
  hud.appendChild(m);
}

/* ---------- 位置显示 ---------- */
function setLocation(loc, label){
  GAME.location = loc;
  $('#tbLoc').textContent = label;
  drawHUD();
}

/* ---------- 引导卡 ---------- */
function dismissGuide(){
  GAME.guideDone = true;
  $('#guide').classList.add('done');
}
$('#guideOK').onclick = dismissGuide;
document.addEventListener('keydown', e=>{
  if(e.key === 'Enter' && !GAME.guideDone) dismissGuide();
});

/* ---------- 数据状态指示器（顶栏） ----------
   三态：实盘已接通 / 公开层（无钥匙）/ 桥未运行。点一下开保险库。 */
function drawDataState(){
  const el2 = $('#tbState'); if(!el2) return;
  const authed = (typeof REAL !== 'undefined' && REAL.on);
  const hasKey = (typeof VAULT !== 'undefined' && !!VAULT.key);
  let cls, txt, tip;
  if(authed){
    cls = 'cyan'; txt = '实盘 · 已接通';
    tip = '研究员/财务/知识库/数据源均读自本机真实文件';
  } else if(hasKey){
    cls = 'rose'; txt = '桥未运行';
    tip = '有钥匙但连不上 kb-bridge：先跑 python3.11 bridge/kb_bridge.py' +
          (typeof REAL !== 'undefined' && REAL.err ? '（' + REAL.err + '）' : '');
  } else {
    cls = ''; txt = '公开层';
    tip = '未插钥匙：只显示不敏感的真实数据，机密部分上锁。'
        + '密码每天一换，终端跑 python3.11 bridge/bosskey.py 拿今天的';
  }
  el2.innerHTML = `<span class="tag ${cls}" title="${tip}" style="cursor:pointer">${txt}</span>`;
  el2.onclick = ()=>{
    if(authed) return toast('已经接通了。机密数据仅本机可见');
    if(typeof openVault === 'function') openVault(()=>{
      if(typeof loadReal === 'function') loadReal(true).then(()=> drawDataState());
    });
  };
}

/* ---------- bootstrap ---------- */
(function boot(){
  const d = new Date();
  $('#tbDate').textContent = d.toISOString().slice(0,10);
  drawHUD();
  if(typeof initRackStats === 'function') initRackStats();
  /* 数据源计数上条 */
  if(typeof syncTopbar === 'function') syncTopbar();
  /* 世界层启动（office.js 提供）；引擎未就绪时静默跳过（迁移期） */
  if(typeof startOffice === 'function') startOffice();
  drawDataState();
  /* 公开层不需要钥匙，开局就拉：wiki 图谱 / 信源分布 / 名册身份 */
  if(typeof loadPublic === 'function')
    loadPublic().then(()=>{
      drawDataState();
      if(PANEL_OPEN && RENDER[PANEL_OPEN]) RENDER[PANEL_OPEN]();
      if(typeof syncTopbar === 'function') syncTopbar();
    });
  /* 钥匙已经存在本机就直接接真 —— 以前少了这一步，每次刷新全站回落 mock，
     必须手动转一遍保险库才变真，整站因此永远看起来像剧本。 */
  if(typeof loadReal === 'function' && typeof VAULT !== 'undefined' && VAULT.key){
    loadReal(true).then(ok=>{
      drawDataState();
      if(ok && PANEL_OPEN && RENDER[PANEL_OPEN]) RENDER[PANEL_OPEN]();
      if(!ok && REAL.err) console.warn('[real] 接真失败:', REAL.err);
    });
  }
})();

/* ---------- 配色切换：经典（暖木） / 清新（奶油蓝格纸） ---------- */
function syncThemeBtn(){
  $('#themeToggle').textContent = WORLD_THEME === 'classic' ? '◧ 经典配色' : '◨ 清新配色';
}
$('#themeToggle').onclick = ()=>{
  applyWorldTheme(WORLD_THEME === 'classic' ? 'fresh' : 'classic');
  syncThemeBtn();
  toast(WORLD_THEME === 'classic' ? '经典配色：暖木办公室' : '清新配色：昨天那个奶油蓝格纸味');
};
syncThemeBtn();
