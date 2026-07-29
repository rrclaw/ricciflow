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
  { id:'scenes',   n:'场景',     icon:'场', furn:'meeting_door', color:'pink',  enabled:true,
    render: ()=> RENDER.war() },
  { id:'trading',  n:'交易台',   icon:'交', furn:'trade_desk', color:'coral',   enabled:true,
    render: ()=> RENDER.trading && RENDER.trading() },
  { id:'daily',    n:'日报',     icon:'报', furn:'coffee',     color:'pink',    enabled:true,
    render: ()=> RENDER.daily && RENDER.daily() },
  { id:'settings', n:'系统',     icon:'统', furn:'rules_board', color:'ink',    enabled:true,
    render: ()=> RENDER.sys() },
];
/* 屏容器 id 与 V1 保持一致，V1 渲染函数零改动 */
const SCREEN_ID = { research:'scr-research', rack:'scr-sources', atlas:'scr-atlas',
  desk:'scr-desk', scenes:'scr-war', trading:'scr-trading', daily:'scr-daily', settings:'scr-sys' };

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
  $('#panelBody').innerHTML =
    `<section class="screen active" id="${SCREEN_ID[id]}"></section>
     <div class="panel-foot"><span class="demo-mark">DEMO</span>
       本页全部数据为演示用虚构数据，不代表任何真实业绩。研究员「战绩 / 命中率」为编造值。
       <span class="sp"></span><span>里奇流资本 · 曲率即命运</span></div>`;
  $('#panel').classList.add('open');
  $('#panelScrim').classList.add('open');
  c.render();
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

/* ---------- HUD ---------- */
function drawHUD(){
  const hud = $('#hud');
  hud.innerHTML = '';
  COMPONENTS.forEach(c=>{
    const b = el('button','hud-item' + (c.enabled ? '' : ' off'), c.icon +
      `<span class="lbl">${c.n}</span>`);
    b.dataset.hud = c.id;
    b.onclick = ()=> openComponent(c.id);
    hud.appendChild(b);
  });
  /* 大地图入口：在办公室时锁定 */
  const locked = GAME.location === 'office';
  const m = el('button','hud-item' + (locked ? ' locked' : ''), '图' +
    `<span class="lbl">${locked ? '走出办公室才能出门' : '世界地图'}</span>`);
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
})();
