/* ricciflow — 行走引擎 + 相机
   相机：滚轮缩放（围绕光标）、拖拽平移（>6px 判定为拖，否则是点击走路）。
   不做寻路：点击走动 = 轴优先直线逼近，撞墙就停。 */

const WALK = {
  room: null, base: null,
  x: 0, y: 0, dir: 'down', frame: 0, animT: 0,
  keys: {}, target: null, paused: false,
  nearFurn: null, hour: new Date().getHours(),
  raf: null, plantFrame: 0, lastBaseAt: 0
};
const CAM = { zoom: 1, fit: 1, px: 0, py: 0, minZ: .6, maxZ: 2.6 };
const BOSS_PX = 2;
const SPEED = 2.4;

const worldCanvas = $('#world');
const wctx = worldCanvas.getContext('2d');

function walkPause(v){ WALK.paused = v; WALK.keys = {}; WALK.target = null; }

/* 找最近可站立点（出生点掉进碰撞体时向外螺旋搜） */
function nearestOpen(tx, ty){
  const r = WALK.room;
  for(let rad = 0; rad < 12; rad++)
    for(let dy = -rad; dy <= rad; dy++)
      for(let dx = -rad; dx <= rad; dx++){
        const x = tx + dx, y = ty + dy;
        if(x < 0 || y < 0 || x >= r.gw || y >= r.gh) continue;
        if(!r.solid[y][x]) return [x, y];
      }
  return [tx, ty];
}

function enterRoom(room, spawnTx, spawnTy){
  WALK.room = room;
  const [sx, sy] = (()=>{ WALK.room = room; return nearestOpen(spawnTx, spawnTy); })();
  WALK.x = sx * TILE + TILE/2;
  WALK.y = sy * TILE + TILE/2;
  WALK.dir = 'up'; WALK.target = null;
  WALK.base = renderRoomBase(room, WALK.hour, 0);
  WALK.lastBaseAt = performance.now();
  fitCanvas();
  if(!WALK.raf) loop();
}

/* 画布=视口；相机变换画世界 */
function fitCanvas(){
  if(!WALK.room) return;
  worldCanvas.width = innerWidth; worldCanvas.height = innerHeight;
  worldCanvas.style.width = '100vw'; worldCanvas.style.height = '100vh';
  worldCanvas.style.left = '0'; worldCanvas.style.top = '0';
  wctx.imageSmoothingEnabled = false;
  CAM.fit = Math.min(innerWidth / WALK.room.W, innerHeight / WALK.room.H);
  CAM.zoom = 1;
  centerCam();
}
function centerCam(){
  const s = CAM.fit * CAM.zoom;
  CAM.px = (innerWidth - WALK.room.W * s) / 2;
  CAM.py = (innerHeight - WALK.room.H * s) / 2;
}
function clampCam(){
  const s = CAM.fit * CAM.zoom;
  const w = WALK.room.W * s, h = WALK.room.H * s;
  if(w <= innerWidth) CAM.px = (innerWidth - w) / 2;
  else CAM.px = clamp(CAM.px, innerWidth - w - 80, 80);
  if(h <= innerHeight) CAM.py = (innerHeight - h) / 2;
  else CAM.py = clamp(CAM.py, innerHeight - h - 80, 80);
}
function toWorld(cx, cy){
  const s = CAM.fit * CAM.zoom;
  return [(cx - CAM.px) / s, (cy - CAM.py) / s];
}
addEventListener('resize', fitCanvas);

/* 滚轮缩放（围绕光标点） */
worldCanvas.addEventListener('wheel', e=>{
  if(!WALK.room || WALK.paused) return;
  e.preventDefault();
  const [wx, wy] = toWorld(e.clientX, e.clientY);
  const f = e.deltaY < 0 ? 1.12 : 1 / 1.12;
  CAM.zoom = clamp(CAM.zoom * f, CAM.minZ, CAM.maxZ);
  const s = CAM.fit * CAM.zoom;
  CAM.px = e.clientX - wx * s;
  CAM.py = e.clientY - wy * s;
  clampCam();
}, {passive:false});

/* 拖拽平移 vs 点击走路 */
const DRAG = { on:false, moved:false, sx:0, sy:0, opx:0, opy:0 };
worldCanvas.addEventListener('mousedown', e=>{
  if(!WALK.room || WALK.paused) return;
  DRAG.on = true; DRAG.moved = false;
  DRAG.sx = e.clientX; DRAG.sy = e.clientY;
  DRAG.opx = CAM.px; DRAG.opy = CAM.py;
});
addEventListener('mousemove', e=>{
  if(!DRAG.on) return;
  const dx = e.clientX - DRAG.sx, dy = e.clientY - DRAG.sy;
  if(Math.abs(dx) + Math.abs(dy) > 6) DRAG.moved = true;
  if(DRAG.moved){
    CAM.px = DRAG.opx + dx; CAM.py = DRAG.opy + dy;
    clampCam();
  }
});
addEventListener('mouseup', e=>{
  if(!DRAG.on) return;
  DRAG.on = false;
  if(DRAG.moved || !WALK.room || WALK.paused || !GAME.guideDone) return;
  /* 是点击：走路 / 触发家具 */
  const [mx, my] = toWorld(e.clientX, e.clientY);
  if(mx < 0 || my < 0 || mx > WALK.room.W || my > WALK.room.H) return;
  const f = furnitureAtPoint(mx, my);
  if(f && dist(WALK.x, WALK.y, fCenter(f).x, fCenter(f).y) < TILE * 3.2){
    triggerFurniture(f); return;
  }
  WALK.target = {x: mx, y: my, furn: f || null};
});

/* ---------- 触屏：单指拖=平移/点走，双指捏合=缩放 ---------- */
const TOUCH = { pinch0: 0, zoom0: 1 };
worldCanvas.addEventListener('touchstart', e=>{
  if(!WALK.room || WALK.paused) return;
  if(e.touches.length === 1){
    const t = e.touches[0];
    DRAG.on = true; DRAG.moved = false;
    DRAG.sx = t.clientX; DRAG.sy = t.clientY;
    DRAG.opx = CAM.px; DRAG.opy = CAM.py;
  } else if(e.touches.length === 2){
    DRAG.on = false;
    TOUCH.pinch0 = Math.hypot(e.touches[0].clientX - e.touches[1].clientX,
                              e.touches[0].clientY - e.touches[1].clientY);
    TOUCH.zoom0 = CAM.zoom;
  }
}, {passive:true});
worldCanvas.addEventListener('touchmove', e=>{
  if(!WALK.room || WALK.paused) return;
  e.preventDefault();
  if(e.touches.length === 1 && DRAG.on){
    const t = e.touches[0];
    const dx = t.clientX - DRAG.sx, dy = t.clientY - DRAG.sy;
    if(Math.abs(dx) + Math.abs(dy) > 8) DRAG.moved = true;
    if(DRAG.moved){ CAM.px = DRAG.opx + dx; CAM.py = DRAG.opy + dy; clampCam(); }
  } else if(e.touches.length === 2 && TOUCH.pinch0 > 0){
    const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX,
                         e.touches[0].clientY - e.touches[1].clientY);
    CAM.zoom = clamp(TOUCH.zoom0 * d / TOUCH.pinch0, CAM.minZ, CAM.maxZ);
    clampCam();
  }
}, {passive:false});
worldCanvas.addEventListener('touchend', e=>{
  if(e.touches.length > 0) return;
  if(!DRAG.on) return;
  DRAG.on = false;
  if(DRAG.moved || !WALK.room || WALK.paused || !GAME.guideDone) return;
  const [mx, my] = toWorld(DRAG.sx, DRAG.sy);
  if(mx < 0 || my < 0 || mx > WALK.room.W || my > WALK.room.H) return;
  const f = furnitureAtPoint(mx, my);
  if(f && dist(WALK.x, WALK.y, fCenter(f).x, fCenter(f).y) < TILE * 3.2){
    triggerFurniture(f); return;
  }
  setWalkTarget(mx, my, f);
});

/* ---------- BFS 寻路（网格小，负担可忽略；点击=沿路径走） ---------- */
function findPath(stx, sty, ttx, tty){
  const r = WALK.room;
  if(ttx < 0 || tty < 0 || ttx >= r.gw || tty >= r.gh) return null;
  /* 目标在碰撞体里 → 螺旋找最近可站格 */
  if(r.solid[tty][ttx]){
    let best = null, bd = 1e9;
    for(let rad = 1; rad < 8 && !best; rad++)
      for(let dy = -rad; dy <= rad; dy++)
        for(let dx = -rad; dx <= rad; dx++){
          const x = ttx + dx, y = tty + dy;
          if(x < 0 || y < 0 || x >= r.gw || y >= r.gh || r.solid[y][x]) continue;
          const d = dx*dx + dy*dy;
          if(d < bd){ bd = d; best = [x, y]; }
        }
    if(!best) return null;
    [ttx, tty] = best;
  }
  const key = (x, y)=> y * r.gw + x;
  const prev = new Map();
  const q = [[stx, sty]];
  prev.set(key(stx, sty), null);
  while(q.length){
    const [cx, cy] = q.shift();
    if(cx === ttx && cy === tty){
      const path = [];
      let k = key(cx, cy);
      let cur = [cx, cy];
      while(cur){
        path.unshift(cur);
        const pk = prev.get(key(cur[0], cur[1]));
        cur = pk;
      }
      path.shift();                      /* 去掉起点 */
      return path;
    }
    [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx,dy])=>{
      const nx = cx + dx, ny = cy + dy;
      if(nx < 0 || ny < 0 || nx >= r.gw || ny >= r.gh) return;
      if(r.solid[ny][nx] || prev.has(key(nx, ny))) return;
      prev.set(key(nx, ny), [cx, cy]);
      q.push([nx, ny]);
    });
  }
  return null;
}

function setWalkTarget(mx, my, furn){
  const path = findPath(Math.floor(WALK.x / TILE), Math.floor(WALK.y / TILE),
                        Math.floor(mx / TILE), Math.floor(my / TILE));
  if(!path){ toast('走不过去，那边被挡死了'); return; }
  WALK.path = path;
  WALK.target = {x: mx, y: my, furn: furn || null};
}

function solidAt(px, py){
  const r = WALK.room;
  const tx = Math.floor(px / TILE), ty = Math.floor(py / TILE);
  if(tx < 0 || ty < 0 || tx >= r.gw || ty >= r.gh) return true;
  return r.solid[ty][tx];
}
function canStand(x, y){
  return !solidAt(x - 9, y) && !solidAt(x + 9, y) && !solidAt(x, y - 4) && !solidAt(x, y + 6);
}
function tryMove(dx, dy){
  if(dx){ const nx = WALK.x + dx; if(canStand(nx, WALK.y)) WALK.x = nx; }
  if(dy){ const ny = WALK.y + dy; if(canStand(WALK.x, ny)) WALK.y = ny; }
}

addEventListener('keydown', e=>{
  if(WALK.paused || !GAME.guideDone) return;
  const k = e.key.toLowerCase();
  if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(k)){
    WALK.keys[k] = true; WALK.target = null; WALK.path = null; e.preventDefault();
  }
  if(k === 'e' && WALK.nearFurn) triggerFurniture(WALK.nearFurn);
  if(k === '0'){ CAM.zoom = 1; centerCam(); }        /* 归位 */
});
addEventListener('keyup', e=>{ delete WALK.keys[e.key.toLowerCase()]; });

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
      /* 目标是家具：走到附近直接触发（不必抵达点击点） */
      if(WALK.target.furn){
        const c = fCenter(WALK.target.furn);
        if(dist(WALK.x, WALK.y, c.x, c.y) < TILE * 3.6){
          const f = WALK.target.furn; WALK.target = null; WALK.path = null;
          triggerFurniture(f);
        }
      }
      if(WALK.target && WALK.path && WALK.path.length){
        /* 沿 BFS 路径逐格走 */
        const [wtx, wty] = WALK.path[0];
        const wx = wtx * TILE + TILE/2, wy = wty * TILE + TILE/2;
        const dx = wx - WALK.x, dy = wy - WALK.y;
        if(Math.abs(dx) <= 3 && Math.abs(dy) <= 3) WALK.path.shift();
        else {
          if(Math.abs(dx) > 3) mvx = Math.sign(dx) * SPEED;
          if(Math.abs(dy) > 3) mvy = Math.sign(dy) * SPEED;
          if(mvx && mvy){ mvx *= .72; mvy *= .72; }
        }
      } else if(WALK.target){
        /* 路径走完：最后一小段直线逼近或收尾 */
        const dx = WALK.target.x - WALK.x, dy = WALK.target.y - WALK.y;
        if(Math.abs(dx) > 3) mvx = Math.sign(dx) * SPEED;
        if(Math.abs(dy) > 3) mvy = Math.sign(dy) * SPEED;
        if(mvx && mvy){ mvx *= .72; mvy *= .72; }
        if(!mvx && !mvy){
          if(WALK.target.furn) triggerFurniture(WALK.target.furn);
          WALK.target = null;
        }
      }
    }
  }
  if(mvx || mvy){
    const ox = WALK.x, oy = WALK.y;
    tryMove(mvx, 0); tryMove(0, mvy);
    if(WALK.x === ox && WALK.y === oy && WALK.target){
      /* 撞墙走不动：如果目标家具就在旁边，直接触发再放弃 */
      if(WALK.target.furn){
        const c = fCenter(WALK.target.furn);
        if(dist(WALK.x, WALK.y, c.x, c.y) < TILE * 5.5){
          const f = WALK.target.furn; WALK.target = null;
          triggerFurniture(f);
        }
      }
      WALK.target = null;
    }
    WALK.dir = Math.abs(mvx) >= Math.abs(mvy)
      ? (mvx < 0 ? 'left' : mvx > 0 ? 'right' : WALK.dir)
      : (mvy < 0 ? 'up' : 'down');
    WALK.animT += 1;
    if(WALK.animT % 9 === 0) WALK.frame = 1 - WALK.frame;
  } else WALK.frame = 0;

  let near = null, bestD = TILE * 2.4;
  (WALK.room.furniture || []).forEach(f=>{
    if(!f.label) return;
    const c = fCenter(f), d = dist(WALK.x, WALK.y, c.x, c.y);
    if(d < bestD){ bestD = d; near = f; }
  });
  WALK.nearFurn = near;
  drawHint(near);

  const tx = Math.floor(WALK.x / TILE), ty = Math.floor(WALK.y / TILE);
  if(WALK.room.onStep && !WALK.paused) WALK.room.onStep(tx, ty);

  /* ---------- 绘制（相机变换） ---------- */
  const s = CAM.fit * CAM.zoom;
  wctx.setTransform(1, 0, 0, 1, 0, 0);
  wctx.fillStyle = W_PAL.bodyBg || '#1c140e';
  wctx.fillRect(0, 0, worldCanvas.width, worldCanvas.height);
  wctx.setTransform(s, 0, 0, s, CAM.px, CAM.py);
  wctx.imageSmoothingEnabled = false;
  wctx.drawImage(WALK.base, 0, 0);
  if(WALK.room.paintDynamic) WALK.room.paintDynamic(wctx, now);
  wctx.fillStyle = W_PAL.shadow;
  wctx.fillRect(WALK.x - 12, WALK.y + 12, 24, 6);
  drawBoss(wctx, WALK.dir, WALK.frame, Math.round(WALK.x - 16), Math.round(WALK.y - 28), BOSS_PX);
}

function drawHint(f){
  const h = $('#interactHint');
  if(!f || WALK.paused || !GAME.guideDone){ h.style.display = 'none'; return; }
  h.style.display = 'block';
  h.textContent = `[E] ${f.label}`;
  const s = CAM.fit * CAM.zoom;
  h.style.left = (CAM.px + ((f.tx + (f.tw||1)/2) * TILE) * s - 40) + 'px';
  h.style.top  = (CAM.py + (f.ty * TILE) * s - 30) + 'px';
}
