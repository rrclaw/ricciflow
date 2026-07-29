/* ricciflow — 通用工具 + 窗口/抽屉/弹窗管理
   加载方式: 传统 <script> 顺序加载（零构建、file:// 可直开）。
   模块间通过顶层声明共享（var/function 提升到全局作用域）。 */

/* ==========================================================================
   SECTION 9 — 工具
   ========================================================================== */
const $ = (s,r)=> (r||document).querySelector(s);
const $$ = (s,r)=> Array.from((r||document).querySelectorAll(s));
const sleep = ms => new Promise(r=> setTimeout(r, ms));
const el = (tag, cls, html)=>{ const n=document.createElement(tag); if(cls)n.className=cls; if(html!=null)n.innerHTML=html; return n; };
const stars = n => '★'.repeat(n) + '<span style="color:#3a3350">' + '☆'.repeat(5-n) + '</span>';
const clamp = (v,a,b)=> Math.max(a, Math.min(b, v));
/* demo 里所有"随机"用固定种子，保证每次演示可复现 */
let _seed = 20260728;
function rnd(){ _seed = (_seed * 1103515245 + 12345) & 0x7fffffff; return _seed / 0x7fffffff; }
function resetSeed(){ _seed = 20260728; }
function pick(arr){ return arr[Math.floor(rnd()*arr.length)]; }

/* 打字机 */
async function typeInto(node, text, speed){
  for(const ch of text){ node.innerHTML += ch; await sleep(speed||14); }
}

function showTip(html, ev){
  const t = $('#tip'); t.innerHTML = html; t.classList.add('show');
  const pad = 14;
  let x = ev.clientX + pad, y = ev.clientY + pad;
  if(x + 260 > innerWidth) x = ev.clientX - 260;
  if(y + 90 > innerHeight) y = ev.clientY - 90;
  t.style.left = x + 'px'; t.style.top = y + 'px';
}
function hideTip(){ $('#tip').classList.remove('show'); }

/* 窗口外壳：标题栏 + 奶油内容区。color = teal|coral|mustard|sky|pink|ink */
function win(title, bodyHTML, opt){
  opt = opt || {};
  return `<div class="win ${opt.color||'teal'}${opt.cls?' '+opt.cls:''}"${opt.attr||''}><div class="in">
      <div class="win-bar"><span>${title}</span>${opt.sub?`<span class="sub">${opt.sub}</span>`:''}<span class="dots">_ □ ×</span></div>
      <div class="win-body"${opt.bodyStyle?` style="${opt.bodyStyle}"`:''}>${bodyHTML}</div>
    </div></div>`;
}

function openDrawer(html){
  $('#drawerIn').innerHTML = html;
  $('#drawer').classList.add('open'); $('#scrim').classList.add('open');
}
function closeDrawer(){ $('#drawer').classList.remove('open'); $('#scrim').classList.remove('open'); }
function openModal(html){ $('#modalBox').innerHTML = html; $('#modal').classList.add('open'); }
function closeModal(){ $('#modal').classList.remove('open'); }
$('#scrim').onclick = closeDrawer;
$('#modal').onclick = e => { if(e.target.id === 'modal') closeModal(); };


/* ---- V1 路由的替代品：组件注册表挂在 shell.js，RENDER 表保留原名 ---- */
const RENDER = {};

/* ---------- 通用 ⓘ 方法论徽标：半隐藏，悬停展开 ---------- */
function infoDot(text){
  const t = String(text).replace(/"/g,'&quot;');
  return `<span class="info-dot" data-info="${t}">ⓘ</span>`;
}
/* 事件代理：悬停/点击 ⓘ 出浮层（复用 tipbox） */
document.addEventListener('mouseover', e=>{
  const d = e.target.closest && e.target.closest('.info-dot');
  if(d) showTip('<b>方法论</b><br>' + d.dataset.info, e);
});
document.addEventListener('mouseout', e=>{
  if(e.target.closest && e.target.closest('.info-dot')) hideTip();
});
document.addEventListener('click', e=>{
  const d = e.target.closest && e.target.closest('.info-dot');
  if(d){ e.stopPropagation(); showTip('<b>方法论</b><br>' + d.dataset.info, e);
    setTimeout(hideTip, 4000); }
});
