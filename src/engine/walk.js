/* ricciflow — 行走引擎：老板小人 + 输入 + 碰撞 + 家具交互
   不做寻路：点击走动 = 轴优先直线逼近，撞墙就停。 */

const WALK = {
  room: null, base: null,
  x: 0, y: 0, dir: 'down', frame: 0, animT: 0,
  keys: {}, target: null, paused: false,
  nearFurn: null, hour: new Date().getHours(),
  raf: null, plantFrame: 0, lastBaseAt: 0
};
const BOSS_PX = 2;              /* 老板 sprite 放大倍数: 16×20 → 32×40 */
const SPEED = 2.4;

const worldCanvas = $('#world');
const wctx = worldCanvas.getContext('2d');
wctx.imageSmoothingEnabled = false;

function walkPause(v){ WALK.paused = v; WALK.keys = {}; WALK.target = null; }

function enterRoom(room, spawnTx, spawnTy){
  WALK.room = room;
  WALK.x = spawnTx * TILE + TILE/2;
  WALK.y = spawnTy * TILE + TILE/2;
  WALK.dir = 'up'; WALK.target = null;
  WALK.base = renderRoomBase(room, WALK.hour, 0);
  WALK.lastBaseAt = performance.now();
  if(!WALK.raf) loop();
}

/* 画布随窗口自适应：内部分辨率=房间原生，CSS 拉伸保持像素 */
function fitCanvas(){
  if(!WALK.room) return;
  worldCanvas.width = WALK.room.W; worldCanvas.height = WALK.room.H;
  wctx.imageSmoothingEnabled = false;
  const availH = innerHeight, availW = innerWidth;
  const scale = Math.min(availW / WALK.room.W, availH / WALK.room.H);
  worldCanvas.style.width  = Math.round(WALK.room.W * scale) + 'px';
  worldCanvas.style.height = Math.round(WALK.room.H * scale) + 'px';
  worldCanvas.style.position = 'fixed';
  worldCanvas.style.left = Math.round((availW - WALK.room.W * scale)/2) + 'px';
  worldCanvas.style.top  = Math.round((availH - WALK.room.H * scale)/2) + 'px';
}
addEventListener('resize', fitCanvas);

function solidAt(px, py){
  const r = WALK.room;
  const tx = Math.floor(px / TILE), ty = Math.floor(py / TILE);
  if(tx < 0 || ty < 0 || tx >= r.gw || ty >= r.gh) return true;
  return r.solid[ty][tx];
}
/* 脚底碰撞盒：细腰，方便过门 */
function canStand(x, y){
  return !solidAt(x - 9, y) && !solidAt(x + 9, y) && !solidAt(x, y - 4) && !solidAt(x, y + 6);
}

function tryMove(dx, dy){
  if(dx){ const nx = WALK.x + dx; if(canStand(nx, WALK.y)) WALK.x = nx; }
  if(dy){ const ny = WALK.y + dy; if(canStand(WALK.x, ny)) WALK.y = ny; }
}

/* ---------- 输入 ---------- */
addEventListener('keydown', e=>{
  if(WALK.paused || !GAME.guideDone) return;
  const k = e.key.toLowerCase();
  if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(k)){
    WALK.keys[k] = true; WALK.target = null; e.preventDefault();
  }
  if(k === 'e' && WALK.nearFurn) triggerFurniture(WALK.nearFurn);
});
addEventListener('keyup', e=>{ delete WALK.keys[e.key.toLowerCase()]; });

worldCanvas.addEventListener('click', e=>{
  if(WALK.paused || !GAME.guideDone || !WALK.room) return;
  const r = worldCanvas.getBoundingClientRect();
  const sx = WALK.room.W / r.width;
  const mx = (e.clientX - r.left) * sx, my = (e.clientY - r.top) * sx;
  /* 点在家具上且在附近 → 直接触发 */
  const f = furnitureAtPoint(mx, my);
  if(f && dist(WALK.x, WALK.y, fCenter(f).x, fCenter(f).y) < TILE * 2.6){
    triggerFurniture(f); return;
  }
  WALK.target = {x: mx, y: my, furn: f || null};
});

function dist(a,b,c,d){ return Math.hypot(a-c, b-d); }
function fCenter(f){
  return {x: (f.tx + (f.tw||1)/2) * TILE, y: (f.ty + (f.th||1)) * TILE + 10};
}
function furnitureAtPoint(px, py){
  return (WALK.room.furniture || []).find(f=>
    px >= f.tx*TILE && px < (f.tx + (f.tw||1))*TILE &&
    py >= f.ty*TILE && py < (f.ty + (f.th||1))*TILE && f.label);
}

function triggerFurniture(f){
  if(f.onUse) f.onUse(f);
  else if(f.comp) openComponent(f.comp);
}

/* ---------- 主循环 ---------- */
function loop(){
  WALK.raf = requestAnimationFrame(loop);
  const now = performance.now();

  /* 每 4 秒重渲底图：盆栽两帧摆动 + 窗色跟真实时间 */
  if(now - WALK.lastBaseAt > 4000){
    WALK.plantFrame = 1 - WALK.plantFrame;
    WALK.hour = new Date().getHours();
    WALK.base = renderRoomBase(WALK.room, WALK.hour, WALK.plantFrame);
    WALK.lastBaseAt = now;
  }

  let mvx = 0, mvy = 0;
  if(!WALK.paused && GAME.guideDone){
    const K = WALK.keys;
    if(K['a'] || K['arrowleft'])  mvx -= SPEED;
    if(K['d'] || K['arrowright']) mvx += SPEED;
    if(K['w'] || K['arrowup'])    mvy -= SPEED;
    if(K['s'] || K['arrowdown'])  mvy += SPEED;
    if(!mvx && !mvy && WALK.target){
      const dx = WALK.target.x - WALK.x, dy = WALK.target.y - WALK.y;
      if(Math.abs(dx) > 3) mvx = Math.sign(dx) * SPEED;
      else if(Math.abs(dy) > 3) mvy = Math.sign(dy) * SPEED;
      else {
        if(WALK.target.furn) triggerFurniture(WALK.target.furn);
        WALK.target = null;
      }
    }
  }
  if(mvx || mvy){
    const ox = WALK.x, oy = WALK.y;
    tryMove(mvx, 0); tryMove(0, mvy);
    if(WALK.x === ox && WALK.y === oy && WALK.target) WALK.target = null;  /* 卡住放弃 */
    WALK.dir = Math.abs(mvx) >= Math.abs(mvy)
      ? (mvx < 0 ? 'left' : mvx > 0 ? 'right' : WALK.dir)
      : (mvy < 0 ? 'up' : 'down');
    WALK.animT += 1;
    if(WALK.animT % 9 === 0) WALK.frame = 1 - WALK.frame;
  } else WALK.frame = 0;

  /* 家具接近检测 */
  let near = null, bestD = TILE * 2.4;
  (WALK.room.furniture || []).forEach(f=>{
    if(!f.label) return;
    const c = fCenter(f), d = dist(WALK.x, WALK.y, c.x, c.y);
    if(d < bestD){ bestD = d; near = f; }
  });
  WALK.nearFurn = near;
  drawHint(near);

  /* 触发地块（门等） */
  const tx = Math.floor(WALK.x / TILE), ty = Math.floor(WALK.y / TILE);
  if(WALK.room.onStep && !WALK.paused) WALK.room.onStep(tx, ty);

  /* ---------- 绘制 ---------- */
  wctx.clearRect(0, 0, WALK.room.W, WALK.room.H);
  wctx.drawImage(WALK.base, 0, 0);
  if(WALK.room.paintDynamic) WALK.room.paintDynamic(wctx, now);
  /* 影子 + 老板 */
  wctx.fillStyle = W_PAL.shadow;
  wctx.fillRect(WALK.x - 12, WALK.y + 12, 24, 6);
  drawBoss(wctx, WALK.dir, WALK.frame, Math.round(WALK.x - 16), Math.round(WALK.y - 28), BOSS_PX);
}

function drawHint(f){
  const h = $('#interactHint');
  if(!f || WALK.paused || !GAME.guideDone){ h.style.display = 'none'; return; }
  h.style.display = 'block';
  h.textContent = `[E] ${f.label}`;
  const r = worldCanvas.getBoundingClientRect();
  const s = r.width / WALK.room.W;
  h.style.left = (r.left + ((f.tx + (f.tw||1)/2) * TILE) * s - 40) + 'px';
  h.style.top  = (r.top + (f.ty * TILE) * s - 30) + 'px';
}
