/* ricciflow — tile 引擎
   只做三件事：画房间、判碰撞、给家具热点。不做寻路，不做存档，不做音效。
   坐标系：tile = 32px；纹理 texel = 4px（每 tile 8×8 texel）。 */

const TILE = 32;
const TX = 4;                       /* texel 尺寸 */

/* 世界层调色（星露谷系暖色） */
const W_PAL = {
  woodA:'#8a5a35', woodB:'#7c4f2e', woodLine:'#5f3c22',
  wall:'#c9a06a', wallLo:'#b08a54', wallLine:'#6e4a28',
  rug:'#8f4a52', rugHi:'#a56069', rugLine:'#63343c',
  ink:'#3f2b23',
  glassDay:'#a8d4e4', glassDusk:'#e2a37a', glassNight:'#2b3a5e', glassDawn:'#d9b8c8',
  skyline:'#5a6b85', skylineNight:'#1c2540',
  screen:'#0e2a26', screenGlow:'#3ecfa0',
  cream:'#f9ecd6', teal:'#57bfb4', coral:'#e8535a', mustard:'#e9b23c', sky:'#7fa8dd',
  plant:'#4f8a3d', plantHi:'#6cab52', pot:'#a9603a',
  shadow:'rgba(40,22,10,.25)'
};

/* 按真实本地时间给窗色（昼夜彩蛋） */
function skyByHour(h){
  if(h >= 6 && h < 8)   return {glass:W_PAL.glassDawn,  sky:'#8a7d9c'};
  if(h >= 8 && h < 17)  return {glass:W_PAL.glassDay,   sky:W_PAL.skyline};
  if(h >= 17 && h < 20) return {glass:W_PAL.glassDusk,  sky:'#7a5a6b'};
  return {glass:W_PAL.glassNight, sky:W_PAL.skylineNight};
}

/* 带种子抖动的矩形填充（木纹/砖面质感全靠它） */
function texRect(ctx, x, y, w, h, base, jitter, seedBase){
  let s = seedBase || 7;
  const nx = Math.ceil(w / TX), ny = Math.ceil(h / TX);
  for(let j = 0; j < ny; j++){
    for(let i = 0; i < nx; i++){
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      const r = s / 0x7fffffff;
      ctx.fillStyle = r < (jitter || .12) ? shade(base, -10) : base;
      ctx.fillRect(x + i*TX, y + j*TX, TX, TX);
    }
  }
}
function shade(hex, amt){
  const n = parseInt(hex.slice(1), 16);
  const r = clamp((n >> 16) + amt, 0, 255), g = clamp(((n >> 8) & 255) + amt, 0, 255),
        b = clamp((n & 255) + amt, 0, 255);
  return `rgb(${r},${g},${b})`;
}

/* ---------- 房间基底 ---------- */
function paintFloor(ctx, gw, gh, wallRows){
  for(let ty = 0; ty < gh; ty++){
    for(let tx = 0; tx < gw; tx++){
      const x = tx*TILE, y = ty*TILE;
      if(ty < wallRows){
        texRect(ctx, x, y, TILE, TILE, W_PAL.wall, .1, tx*31 + ty*7);
        if(ty === wallRows - 1){                       /* 墙脚线 */
          ctx.fillStyle = W_PAL.wallLine; ctx.fillRect(x, y + TILE - TX, TILE, TX);
        }
      } else {
        texRect(ctx, x, y, TILE, TILE, (tx + ty) % 2 ? W_PAL.woodA : W_PAL.woodB, .14, tx*13 + ty*17);
        ctx.fillStyle = W_PAL.woodLine;               /* 地板拼缝 */
        ctx.fillRect(x, y, TILE, 1);
        if(tx % 2 === 0) ctx.fillRect(x, y, 1, TILE);
      }
    }
  }
}

function paintRug(ctx, x, y, w, h){
  texRect(ctx, x, y, w, h, W_PAL.rug, .12, 99);
  ctx.fillStyle = W_PAL.rugLine;
  ctx.fillRect(x, y, w, TX); ctx.fillRect(x, y + h - TX, w, TX);
  ctx.fillRect(x, y, TX, h); ctx.fillRect(x + w - TX, y, TX, h);
  ctx.fillStyle = W_PAL.rugHi;
  ctx.fillRect(x + 2*TX, y + 2*TX, w - 4*TX, TX);
  ctx.fillRect(x + 2*TX, y + h - 3*TX, w - 4*TX, TX);
}

/* 一扇窗（含天际线剪影 + 昼夜色） */
function paintWindow(ctx, x, y, w, h, hour){
  const sk = skyByHour(hour);
  ctx.fillStyle = W_PAL.ink; ctx.fillRect(x - TX, y - TX, w + 2*TX, h + 2*TX);
  ctx.fillStyle = sk.glass; ctx.fillRect(x, y, w, h);
  /* 天际线剪影（陆家嘴：三件套轮廓意思一下） */
  ctx.fillStyle = sk.sky;
  const base = y + h;
  ctx.fillRect(x + w*.08, base - h*.55, w*.10, h*.55);
  ctx.fillRect(x + w*.10, base - h*.66, w*.06, h*.66);
  ctx.fillRect(x + w*.30, base - h*.78, w*.09, h*.78);
  ctx.fillRect(x + w*.315, base - h*.86, w*.05, h*.86);
  ctx.fillRect(x + w*.52, base - h*.60, w*.12, h*.60);
  ctx.fillRect(x + w*.55, base - h*.68, w*.05, h*.08);
  ctx.fillRect(x + w*.74, base - h*.48, w*.10, h*.48);
  if(sk.glass === W_PAL.glassNight){
    ctx.fillStyle = '#e9c56a';
    for(let i = 0; i < 14; i++)
      ctx.fillRect(x + w*.09 + (i*37 % (w*.75)), base - h*.5 + (i*23 % (h*.4)), 2, 2);
  }
  ctx.fillStyle = W_PAL.ink;
  ctx.fillRect(x + w/2 - 1, y, 3, h);
  ctx.fillRect(x, y + h/2 - 1, w, 3);
}

function paintPlant(ctx, x, y, frame){
  ctx.fillStyle = W_PAL.pot;    ctx.fillRect(x + TX, y + 5*TX, 6*TX, 3*TX);
  ctx.fillStyle = W_PAL.ink;    ctx.fillRect(x + TX, y + 5*TX, 6*TX, 1);
  const sway = frame ? TX : 0;
  ctx.fillStyle = W_PAL.plant;
  ctx.fillRect(x + 2*TX + sway, y + TX, 4*TX, 4*TX);
  ctx.fillRect(x + TX + sway, y + 2*TX, 6*TX, 2*TX);
  ctx.fillStyle = W_PAL.plantHi;
  ctx.fillRect(x + 3*TX + sway, y, 2*TX, 2*TX);
}

/* ---------- 房间对象 ---------- */
function makeRoom(def){
  const room = Object.assign({}, def);
  room.W = def.gw * TILE; room.H = def.gh * TILE;
  room.solid = [];
  for(let y = 0; y < def.gh; y++) room.solid.push(new Array(def.gw).fill(false));
  for(let y = 0; y < def.wallRows; y++) room.solid[y].fill(true);
  (def.furniture || []).forEach(f=>{
    if(f.solid === false) return;
    for(let y = f.ty; y < f.ty + (f.th || 1); y++)
      for(let x = f.tx; x < f.tx + (f.tw || 1); x++)
        if(room.solid[y] && x >= 0 && x < def.gw) room.solid[y][x] = true;
  });
  return room;
}

/* 静态层预渲染 */
function renderRoomBase(room, hour, frame){
  const off = document.createElement('canvas');
  off.width = room.W; off.height = room.H;
  const ctx = off.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  paintFloor(ctx, room.gw, room.gh, room.wallRows);
  if(room.paintBase) room.paintBase(ctx, hour, frame);
  (room.furniture || []).forEach(f=>{
    if(f.paint) f.paint(ctx, f.tx*TILE, f.ty*TILE, hour, frame);
  });
  const g = ctx.createRadialGradient(room.W/2, room.H/2, room.H*.25, room.W/2, room.H/2, room.H*.95);
  g.addColorStop(0, W_PAL.glow || 'rgba(255,205,130,.10)');
  g.addColorStop(1, W_PAL.vignette || 'rgba(30,16,8,.38)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, room.W, room.H);
  return off;
}

/* ==========================================================================
   主题：经典（暖木星露谷） / 清新（奶油蓝格纸，V1 airhouse 色系）
   ========================================================================== */
const W_THEMES = {
  classic: {
    woodA:'#8a5a35', woodB:'#7c4f2e', woodLine:'#5f3c22',
    wall:'#c9a06a', wallLo:'#b08a54', wallLine:'#6e4a28',
    rug:'#8f4a52', rugHi:'#a56069', rugLine:'#63343c',
    shadow:'rgba(40,22,10,.25)', vignette:'rgba(30,16,8,.38)', glow:'rgba(255,205,130,.10)',
    bodyBg:'#1c140e'
  },
  fresh: {
    woodA:'#e3d2ac', woodB:'#d8c69e', woodLine:'#b3a077',
    wall:'#dfe7f2', wallLo:'#c8d4e4', wallLine:'#8fa0b8',
    rug:'#ef86ad', rugHi:'#f5a7c3', rugLine:'#c05a83',
    shadow:'rgba(90,90,120,.18)', vignette:'rgba(120,140,170,.16)', glow:'rgba(255,255,255,.12)',
    bodyBg:'#cfe1f5'
  }
};
let WORLD_THEME = localStorage.getItem('rf_theme') || 'classic';

function applyWorldTheme(name){
  WORLD_THEME = W_THEMES[name] ? name : 'classic';
  Object.assign(W_PAL, W_THEMES[WORLD_THEME]);
  localStorage.setItem('rf_theme', WORLD_THEME);
  document.body.style.background = W_PAL.bodyBg;
  document.body.classList.toggle('theme-fresh', WORLD_THEME === 'fresh');
  /* 世界层立即重渲 */
  if(typeof WALK !== 'undefined' && WALK.room){
    WALK.base = renderRoomBase(WALK.room, WALK.hour, WALK.plantFrame);
  }
}
applyWorldTheme(WORLD_THEME);
