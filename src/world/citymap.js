/* ricciflow — L2 世界地图：等距（2:1 iso）视角城市
   参考小镇 iso 图的视角，但画风取真实金融城：陆家嘴玻璃幕墙 / 金茂阶梯宝塔 /
   SWFC 风洞口 / IFC 皇冠顶 / NYSE 柱廊。建筑真名，机构戏仿名。 */

const ISO = { TW:64, TH:32, ORX:0, ORY:0 };
function isoPt(ix, iy){
  return [ISO.ORX + (ix - iy) * ISO.TW/2, ISO.ORY + (ix + iy) * ISO.TH/2];
}

/* 多边形（带描边）。iso 斜边接受轻微 AA，统一 2px 深棕描边压住 */
function poly(ctx, pts, fill, stroke){
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for(let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  if(fill){ ctx.fillStyle = fill; ctx.fill(); }
  if(stroke){ ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
}

/* 等距盒子：cell 足迹 (ix,iy,w,d)，像素高 h */
function isoBox(ctx, ix, iy, w, d, h, c, opts){
  opts = opts || {};
  const A = isoPt(ix, iy), B = isoPt(ix + w, iy), C = isoPt(ix + w, iy + d), D = isoPt(ix, iy + d);
  const up = p => [p[0], p[1] - h];
  const At = up(A), Bt = up(B), Ct = up(C), Dt = up(D);
  /* 落影 */
  poly(ctx, [A, B, [C[0] + 10, C[1] + 6], [D[0] + 10, D[1] + 6]], 'rgba(30,25,20,.18)');
  /* 左面（朝西南，亮一点） */
  poly(ctx, [D, C, Ct, Dt], shade(c, -6), W_PAL.ink);
  /* 右面（朝东南，暗） */
  poly(ctx, [C, B, Bt, Ct], shade(c, -30), W_PAL.ink);
  /* 顶面 */
  poly(ctx, [At, Bt, Ct, Dt], opts.roof || shade(c, 24), W_PAL.ink);
  /* 幕墙窗：左右面横条 */
  if(opts.glass !== false && h > 40){
    ctx.fillStyle = 'rgba(255,244,214,.8)';
    const rows = Math.floor((h - 18) / 13);
    for(let r = 1; r <= rows; r++){
      const yOff = r * 13;
      /* 左面窗条：D→C 边 */
      for(let s = .12; s < .88; s += .17){
        const x1 = D[0] + (C[0]-D[0]) * s, y1 = D[1] + (C[1]-D[1]) * s - yOff;
        ctx.fillRect(x1, y1, 7, 5);
      }
      /* 右面窗条 */
      for(let s = .15; s < .85; s += .2){
        const x1 = C[0] + (B[0]-C[0]) * s, y1 = C[1] + (B[1]-C[1]) * s - yOff;
        ctx.fillRect(x1, y1, 6, 5);
      }
    }
  }
  return {A, B, C, D, At, Bt, Ct, Dt};
}

/* 楼顶立牌（面向镜头） */
function isoSign(ctx, box, text, bg, fg){
  const cx = (box.At[0] + box.Ct[0]) / 2, cy = Math.min(box.At[1], box.Bt[1], box.Ct[1], box.Dt[1]);
  const w = Math.max(64, text.length * 12 + 14);
  ctx.fillStyle = W_PAL.ink; ctx.fillRect(cx - w/2 - 2, cy - 26, w + 4, 20);
  ctx.fillStyle = bg || W_PAL.cream; ctx.fillRect(cx - w/2, cy - 24, w, 16);
  ctx.fillStyle = fg || W_PAL.ink; ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center'; ctx.fillText(text, cx, cy - 12); ctx.textAlign = 'left';
}

/* 地标特化画法 */
const ISO_STYLES = {
  shTower(ctx, b){          /* 上海中心：分段收分玻璃塔 + 顶冠 */
    let box;
    [[2.4,2.4,66,'#7fa8dd'],[2.0,2.0,60,'#8fb4e4'],[1.6,1.6,54,'#9fc0ea'],[1.1,1.1,40,'#b0cdf0']].forEach((t,i)=>{
      const inset = (2.4 - t[0]) / 2;
      box = isoBox(ctx, b.ix + inset, b.iy + inset, t[0], t[1], 66 + i*54 + t[2] - 66, t[3]);
    });
    /* 我方横幅 */
    const p = isoPt(b.ix + 1.2, b.iy + 2.4);
    ctx.fillStyle = W_PAL.coral; ctx.fillRect(p[0] - 62, p[1] - 132, 124, 18);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center';
    ctx.fillText('▲ 里奇流资本 68F', p[0], p[1] - 119); ctx.textAlign = 'left';
    return box;
  },
  jinmao(ctx, b){           /* 金茂：宝塔式阶梯收分 */
    let box;
    [[2.2,2.2,50],[1.8,1.8,40],[1.4,1.4,34],[1.0,1.0,26],[.6,.6,22]].forEach((t,i)=>{
      const inset = (2.2 - t[0]) / 2;
      box = isoBox(ctx, b.ix + inset, b.iy + inset, t[0], t[1],
        [50,90,124,150,172][i], '#b8a888', {roof:'#d9c9a2'});
    });
    return box;
  },
  swfc(ctx, b){             /* 环球金融：楔形顶 + 风洞口 */
    const box = isoBox(ctx, b.ix, b.iy, 2.2, 2.2, 150, '#8ea6c4');
    const cx = (box.At[0] + box.Ct[0]) / 2;
    const topY = Math.min(box.At[1], box.Ct[1]);
    poly(ctx, [[cx - 30, topY + 4], [cx + 30, topY + 4], [cx + 12, topY - 30], [cx - 12, topY - 30]], '#9db4d0', W_PAL.ink);
    ctx.fillStyle = '#e8f2fb';                      /* 风洞 */
    ctx.fillRect(cx - 12, topY - 24, 24, 12);
    ctx.strokeStyle = W_PAL.ink; ctx.strokeRect(cx - 12, topY - 24, 24, 12);
    return box;
  },
  ifc(ctx, b){              /* 香港 IFC：皇冠锯齿顶 */
    const box = isoBox(ctx, b.ix, b.iy, 2.2, 2.2, 160, '#9aa7b8');
    const topY = Math.min(box.At[1], box.Ct[1]);
    const cx = (box.At[0] + box.Ct[0]) / 2;
    ctx.fillStyle = '#aab6c6';
    for(let i = -3; i <= 3; i++){
      const hh = 22 - Math.abs(i) * 5;
      ctx.fillRect(cx + i * 10 - 4, topY - hh + 2, 8, hh);
      ctx.strokeStyle = W_PAL.ink; ctx.strokeRect(cx + i*10 - 4, topY - hh + 2, 8, hh);
    }
    return box;
  },
  nyse(ctx, b){             /* NYSE：柱廊 + 山花 */
    const box = isoBox(ctx, b.ix, b.iy, 3, 2, 58, '#cfc4ae', {glass:false});
    /* 左面柱廊 */
    ctx.fillStyle = '#efe8d8';
    for(let s = .1; s < .92; s += .14){
      const x1 = box.D[0] + (box.C[0]-box.D[0]) * s, y1 = box.D[1] + (box.C[1]-box.D[1]) * s;
      ctx.fillRect(x1, y1 - 46, 7, 44);
      ctx.strokeStyle = W_PAL.ink; ctx.strokeRect(x1, y1 - 46, 7, 44);
    }
    /* 山花三角 */
    const mx = (box.Dt[0] + box.Ct[0]) / 2;
    poly(ctx, [[box.Dt[0] - 4, box.Dt[1] + 2], [box.Ct[0] + 4, box.Ct[1] + 2],
               [mx, (box.Dt[1] + box.Ct[1]) / 2 - 22]], '#efe8d8', W_PAL.ink);
    /* 美股旗 */
    ctx.fillStyle = '#4a6fa5'; ctx.fillRect(mx - 2, (box.Dt[1]+box.Ct[1])/2 - 40, 3, 20);
    ctx.fillStyle = W_PAL.coral; ctx.fillRect(mx + 1, (box.Dt[1]+box.Ct[1])/2 - 40, 14, 9);
    return box;
  },
  hotel(ctx, b){            /* 金陆大酒店：金顶 + 门廊 */
    const box = isoBox(ctx, b.ix, b.iy, 2.2, 2, 108, '#c9a06a', {roof:'#e9c56a'});
    const p = isoPt(b.ix + 1.1, b.iy + 2);
    ctx.fillStyle = '#e9c56a'; ctx.fillRect(p[0] - 26, p[1] - 20, 52, 8);
    ctx.strokeStyle = W_PAL.ink; ctx.strokeRect(p[0] - 26, p[1] - 20, 52, 8);
    return box;
  },
  campus(ctx, b){           /* X 公司产业园：厂房 + 蓝顶 + 烟囱 */
    const box = isoBox(ctx, b.ix, b.iy, 3, 2, 42, '#8a97a4', {roof:'#5f7d9c', glass:false});
    isoBox(ctx, b.ix + 2.2, b.iy + .2, .4, .4, 74, '#7d8a96');
    /* 大门 */
    const p = isoPt(b.ix, b.iy + 1);
    ctx.fillStyle = W_PAL.ink; ctx.fillRect(p[0] - 4, p[1] - 16, 20, 16);
    return box;
  },
  shop(ctx, b){             /* 沿街小店：遮阳棚 */
    const box = isoBox(ctx, b.ix, b.iy, 1.4, 1.4, 40, b.c, {glass:false});
    /* 左面遮阳棚 */
    ctx.fillStyle = W_PAL.cream;
    const x1 = box.D[0], y1 = box.D[1], x2 = box.C[0], y2 = box.C[1];
    for(let s = 0; s < .96; s += .12){
      const bx = x1 + (x2-x1) * s, by = y1 + (y2-y1) * s - 24;
      ctx.fillStyle = (Math.round(s*8) % 2) ? W_PAL.cream : shade(b.c, 36);
      ctx.fillRect(bx, by, 8, 9);
    }
    return box;
  },
  tower(ctx, b){            /* 普通玻璃塔 */
    return isoBox(ctx, b.ix, b.iy, 2, 2, b.h, b.c);
  }
};

/* 东方明珠：三足 + 双球 + 天线（旋转对称，正面画法成立） */
ISO_STYLES.pearl = function(ctx, b){
  const base = isoPt(b.ix + 1, b.iy + 1);
  const cx = base[0], cy = base[1];
  poly(ctx, [[cx, cy - 6], [cx + 34, cy - 6], [cx + 17, cy + 10]], 'rgba(30,25,20,.18)');
  /* 三足 */
  ctx.strokeStyle = W_PAL.ink; ctx.lineWidth = 5;
  [[-26, 0], [26, 0], [0, 12]].forEach(([dx, dy])=>{
    ctx.beginPath(); ctx.moveTo(cx + dx, cy + dy); ctx.lineTo(cx, cy - 78); ctx.stroke();
  });
  ctx.lineWidth = 2;
  const ball = (bx, by, r, c)=>{
    ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI * 2);
    ctx.fillStyle = c; ctx.fill(); ctx.strokeStyle = W_PAL.ink; ctx.stroke();
    ctx.beginPath(); ctx.arc(bx - r*.3, by - r*.3, r*.3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fill();
  };
  /* 塔身 */
  ctx.fillStyle = '#c05a83'; ctx.fillRect(cx - 5, cy - 210, 10, 210);
  ctx.strokeStyle = W_PAL.ink; ctx.strokeRect(cx - 5, cy - 210, 10, 210);
  ball(cx, cy - 92, 30, '#d16a8e');        /* 下球 */
  ball(cx, cy - 172, 19, '#c05a83');       /* 上球 */
  ball(cx, cy - 216, 8, '#e8a0b8');        /* 太空舱 */
  ctx.fillStyle = W_PAL.ink; ctx.fillRect(cx - 2, cy - 258, 4, 42);   /* 天线 */
  return {At:[cx - 30, cy - 240], Bt:[cx + 30, cy - 240], Ct:[cx + 30, cy - 240], Dt:[cx - 30, cy - 240]};
};

/* 华尔街铜牛（小雕塑） */
function paintBull(ctx, ix, iy){
  const p = isoPt(ix, iy);
  const x = p[0], y = p[1];
  ctx.fillStyle = '#d9cbb2'; ctx.fillRect(x - 16, y - 6, 32, 8);     /* 基座 */
  ctx.strokeStyle = W_PAL.ink; ctx.strokeRect(x - 16, y - 6, 32, 8);
  ctx.fillStyle = '#8a5a28';
  ctx.fillRect(x - 11, y - 18, 20, 12);                              /* 身 */
  ctx.fillRect(x + 7, y - 22, 8, 8);                                 /* 头 */
  ctx.fillRect(x - 13, y - 16, 4, 6);                                /* 尾臀 */
  ctx.fillStyle = '#f2e3c8';
  ctx.fillRect(x + 12, y - 25, 4, 3); ctx.fillRect(x + 5, y - 25, 4, 3);   /* 角 */
  ctx.fillStyle = '#8a5a28';
  ctx.fillRect(x - 9, y - 8, 3, 5); ctx.fillRect(x + 2, y - 8, 3, 5);      /* 腿 */
}

/* 天星小轮 */
function paintFerry(ctx, ix, iy){
  const p = isoPt(ix, iy);
  const x = p[0], y = p[1];
  ctx.fillStyle = '#2e5e4e'; ctx.fillRect(x - 24, y - 6, 48, 10);
  ctx.strokeStyle = W_PAL.ink; ctx.strokeRect(x - 24, y - 6, 48, 10);
  ctx.fillStyle = '#f4efe4'; ctx.fillRect(x - 18, y - 16, 36, 10);
  ctx.strokeStyle = W_PAL.ink; ctx.strokeRect(x - 18, y - 16, 36, 10);
  ctx.fillStyle = W_PAL.ink;
  for(let i = 0; i < 5; i++) ctx.fillRect(x - 14 + i * 7, y - 13, 4, 4);
  ctx.fillRect(x - 3, y - 24, 5, 8);                                /* 烟囱 */
  ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(x + 24, y - 2, 14, 2);
}

/* 直升机坪（岛间跳转热点） */
function paintHelipad(ctx, ix, iy){
  const p = isoPt(ix, iy);
  poly(ctx, [isoPt(ix - .9, iy), isoPt(ix, iy - .45), isoPt(ix + .9, iy), isoPt(ix, iy + .45)],
    '#6b7d8a', W_PAL.ink);
  ctx.fillStyle = '#f4efe4'; ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'center'; ctx.fillText('H', p[0], p[1] + 5); ctx.textAlign = 'left';
}

/* ---------- 城市布局（iso cell 坐标） ---------- */
/* 真实地理 → 画布：太平洋居中投影。
   上海(121.5E,31.2N) 香港(114.2E,22.3N 在上海西南) 纽约(74W,40.7N 大洋彼岸右上)。
   东京/首尔/硅谷/孟买按同一投影挂「规划中」幽灵岛。 */
const GEO_CANVAS = {
  lujiazui:{cx: 680, cy: 400, coord:'121.5°E 31.2°N'},
  central: {cx: 470, cy: 810, coord:'114.2°E 22.3°N'},
  wallst:  {cx:1790, cy: 350, coord:'74.0°W 40.7°N'}
};
const FUTURE_HUBS = [
  {n:'首尔 · 汝矣岛', cx: 960, cy:250, coord:"126.9°E"},
  {n:'东京 · 丸之内', cx:1130, cy:360, coord:"139.8°E"},
  {n:'硅谷',          cx:1560, cy:270, coord:"122.1°W"},
  {n:'孟买 BKC',      cx: 210, cy:790, coord:"72.9°E"}
];
const CITY = {
  islands: [
    {id:'lujiazui', n:'陆 家 嘴', w:16, d:12, ground:'#a9c48a',
     water:'黄 浦 江', waterSide:'e'},
    {id:'wallst', n:'华 尔 街', w:10, d:8, ground:'#b3b3a0',
     water:'哈 德 逊 河', waterSide:'e'},
    {id:'central', n:'香 港 中 环', w:11, d:8, ground:'#a0bd94',
     water:'维 多 利 亚 港', waterSide:'n'}
  ],
  buildings: [
    /* —— 陆家嘴 —— */
    {isl:'lujiazui', id:'pearl', n:'东方明珠', ix:1.6, iy:3.6, style:'pearl'},
    {isl:'lujiazui', id:'sh_center', n:'上海中心', ix:4.6, iy:1.2, style:'shTower',
     sign:['SHANGHAI TOWER', '#e8535a', '#fff'], label:'上海中心 · 回楼里', use:()=> enterFloors()},
    {isl:'lujiazui', id:'swfc', n:'环球金融中心', ix:8.4, iy:1.4, style:'swfc', sign:['SWFC']},
    {isl:'lujiazui', id:'jinmao', n:'金茂大厦', ix:12.0, iy:1.8, style:'jinmao', sign:['JIN MAO']},
    {isl:'lujiazui', id:'broker', n:'中银河证券', ix:12.8, iy:4.6, style:'tower', h:76, c:'#c98a5a',
     sign:['中银河证券'], label:'券商楼 · 集合出差调研', use:()=> startFieldTrip && startFieldTrip()},
    {isl:'lujiazui', id:'rest', n:'聚贤楼', ix:1.6, iy:8.8, style:'shop', c:'#b5495b', sign:['聚贤楼'],
     label:'聚贤楼饭店 · 开饭局', use:()=> startVenueDinner('rest')},
    {isl:'lujiazui', id:'tea', n:'拾露茶室', ix:4.4, iy:8.8, style:'shop', c:'#4f8a72', sign:['拾露茶室'],
     label:'拾露茶室 · 开饭局', use:()=> startVenueDinner('tea')},
    {isl:'lujiazui', id:'ktv', n:'夜莺会所', ix:7.2, iy:8.8, style:'shop', c:'#7b4a9c', sign:['夜莺会所'],
     label:'夜莺会所(商K) · 开饭局', use:()=> startVenueDinner('ktv')},
    {isl:'lujiazui', id:'hotel', n:'金陆大酒店', ix:10.0, iy:8.6, style:'hotel', sign:['金陆大酒店 ★★★★★'],
     label:'五星酒店 · 上市公司策略会', use:()=> startStrategyMeet && startStrategyMeet()},
    {isl:'lujiazui', id:'campus', n:'X 公司产业园', ix:13.0, iy:8.6, style:'campus', sign:['X 公司产业园'],
     label:'X公司园区 · 需券商带队', use:()=> toast('直接闯不进去。去中银河证券集合，卖方带队才见得到董秘')},
    /* —— 华尔街 —— */
    {isl:'wallst', id:'nyse', n:'NYSE', ix:1.2, iy:1.6, style:'nyse', sign:['NYSE']},
    {isl:'wallst', id:'tiger', n:'猛虎基金', ix:5.4, iy:1.2, style:'tower', h:150, c:'#d08a3e', sign:['TIGER FUND'],
     label:'猛虎基金 · 派研究员调研', use:()=> dispatchAbroad('猛虎基金')},
    {isl:'wallst', id:'beacon', n:'灯塔资产', ix:7.6, iy:4.6, style:'tower', h:170, c:'#8ab0c9', sign:['BEACON'],
     label:'灯塔资产 · 派研究员调研', use:()=> dispatchAbroad('灯塔资产')},
    {isl:'wallst', id:'fed', n:'联储金库', ix:2.0, iy:5.0, style:'tower', h:60, c:'#b0a898', sign:['FED VAULT']},
    /* —— 中环 —— */
    {isl:'central', id:'ifc', n:'IFC', ix:1.6, iy:2.0, style:'ifc', sign:['IFC 国金'],
     label:'鲸吞资本 · 派研究员调研', use:()=> dispatchAbroad('鲸吞资本')},
    {isl:'central', id:'vic', n:'维多利亚港湾基金', ix:5.0, iy:2.4, style:'tower', h:110, c:'#7d9c8a',
     sign:['V.HARBOUR'], label:'维港基金 · 派研究员调研', use:()=> dispatchAbroad('维多利亚港湾基金')},
    {isl:'central', id:'hsbc', n:'狮子银行', ix:8.0, iy:2.6, style:'tower', h:132, c:'#a4756b', sign:['LION BANK']},
    {isl:'central', id:'exchsq', n:'交易广场', ix:4.8, iy:5.4, style:'tower', h:88, c:'#9aa7b8', sign:['EXCHANGE SQ']}
  ],
  /* 岛间跳转直升机坪 */
  pads: [
    {isl:'lujiazui', ix:14.9, iy:7.0},
    {isl:'wallst',  ix:5.2, iy:6.4},
    {isl:'central', ix:9.4, iy:6.2}
  ],
  cars: [
    {isl:'lujiazui', ix:4.6, iy:7.0, c:'#e8535a'}, {isl:'lujiazui', ix:8.6, iy:7.2, c:'#57bfb4'},
    {isl:'wallst', ix:4.2, iy:4.2, c:'#e9b23c'}, {isl:'central', ix:3.4, iy:4.6, c:'#7fa8dd'}
  ],
  trees: [['lujiazui',9.8,4.8],['lujiazui',0.9,7.2],['wallst',0.8,3.8],['wallst',8.8,1.0],
          ['central',0.8,5.8],['central',7.4,0.8],['lujiazui',6.4,11.2],['central',10.2,4.4]]
};
function islById(id){ return CITY.islands.find(i=>i.id===id); }
function gxy(b){ const I = islById(b.isl); return [I.ox + b.ix, I.oy + b.iy]; }

function paintIsoCar(ctx, ix, iy, c){
  const b = isoBox(ctx, ix, iy, .7, .38, 12, c, {glass:false});
  isoBox(ctx, ix + .14, iy + .05, .4, .28, 20, shade(c, 18), {glass:false});
}
function paintIsoTree(ctx, ix, iy){
  const p = isoPt(ix, iy);
  ctx.fillStyle = '#7a5a3a'; ctx.fillRect(p[0] - 3, p[1] - 12, 6, 12);
  [[18, -34, '#4f8a3d'], [14, -46, '#5f9c4a'], [9, -56, '#6cab52']].forEach(([r, dy, col])=>{
    poly(ctx, [[p[0] - r, p[1] + dy + 14], [p[0] + r, p[1] + dy + 14], [p[0], p[1] + dy]], col, W_PAL.ink);
  });
}

function cityRoom(){
  const GW = 66, GH = 32;
  ISO.ORX = (GW * TILE) / 2 - 120; ISO.ORY = 130;
  /* 地理映射：目标画布中心 → 岛的 iso 原点 */
  CITY.islands.forEach(I=>{
    const g = GEO_CANVAS[I.id];
    const dif = (g.cx - ISO.ORX) / (ISO.TW/2);
    const sum = (g.cy - ISO.ORY) / (ISO.TH/2);
    I.ox = (dif + sum) / 2 - I.w / 2;
    I.oy = (sum - dif) / 2 - I.d / 2;
    I.coord = g.coord;
  });

  const room = makeRoom({
    gw:GW, gh:GH, wallRows:0, furniture:[],
    paintBase:(ctx, hour)=>{
      const sk = skyByHour(hour);
      /* 海面打底 */
      ctx.fillStyle = '#6ea4bd'; ctx.fillRect(0, 0, GW*TILE, GH*TILE);
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      for(let k = 0; k < 90; k++){
        const wx = (k * 211) % (GW*TILE), wy = (k * 157) % (GH*TILE);
        ctx.fillRect(wx, wy, 14, 2);
      }
      /* 方块云 */
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      [[150,40],[620,20],[1120,52],[1600,26]].forEach(([cx,cy])=>{
        ctx.fillRect(cx, cy, 52, 12); ctx.fillRect(cx+10, cy-9, 32, 11);
      });
      /* 各岛 */
      CITY.islands.forEach(I=>{
        const g = (ix,iy)=> isoPt(I.ox + ix, I.oy + iy);
        /* 岸基（深色底座 = 岛的厚度） */
        poly(ctx, [g(0, I.d), g(I.w, I.d), [g(I.w, I.d)[0], g(I.w, I.d)[1] + 16],
                   [g(0, I.d)[0], g(0, I.d)[1] + 16]], '#7d6a52', W_PAL.ink);
        poly(ctx, [g(I.w, 0), g(I.w, I.d), [g(I.w, I.d)[0], g(I.w, I.d)[1] + 16],
                   [g(I.w, 0)[0], g(I.w, 0)[1] + 16]], '#6e5c46', W_PAL.ink);
        /* 地面 */
        poly(ctx, [g(0,0), g(I.w,0), g(I.w,I.d), g(0,I.d)], I.ground, W_PAL.ink);
        ctx.strokeStyle = 'rgba(90,110,70,.22)'; ctx.lineWidth = 1;
        for(let i = 2; i < I.w; i += 2){
          const a = g(i, 0), b2 = g(i, I.d);
          ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b2[0], b2[1]); ctx.stroke();
        }
        for(let j = 2; j < I.d; j += 2){
          const a = g(0, j), b2 = g(I.w, j);
          ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b2[0], b2[1]); ctx.stroke();
        }
        /* 沿岛环路（简化：一条横路） */
        const ry = Math.floor(I.d / 2) + .4;
        poly(ctx, [g(0, ry), g(I.w, ry), g(I.w, ry + 1.2), g(0, ry + 1.2)], '#4e4a45', W_PAL.ink);
        ctx.fillStyle = '#f4efe4';
        for(let i = .5; i < I.w - .5; i += 1.5){
          const p = g(i, ry + .6);
          ctx.save(); ctx.translate(p[0], p[1]); ctx.transform(1, .5, 0, 1, 0, 0);
          ctx.fillRect(0, -1, 16, 3); ctx.restore();
        }
        /* 水域名 + 真实经纬（写在岛旁的海面上） */
        const wp = I.waterSide === 'n' ? g(I.w * .5, -2.2) : g(I.w + 1.6, I.d * .4);
        ctx.fillStyle = 'rgba(244,239,228,.92)'; ctx.font = 'bold 13px monospace';
        ctx.textAlign = 'center'; ctx.fillText(I.water, wp[0], wp[1]);
        ctx.font = '10px monospace'; ctx.fillStyle = 'rgba(244,239,228,.65)';
        ctx.fillText(I.coord, wp[0], wp[1] + 14); ctx.textAlign = 'left';
        /* 区牌 */
        const dp = g(I.w * .5, -0.9);
        ctx.fillStyle = W_PAL.ink; ctx.fillRect(dp[0] - 52, dp[1] - 14, 104, 20);
        ctx.fillStyle = W_PAL.cream; ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center'; ctx.fillText(I.n, dp[0], dp[1]); ctx.textAlign = 'left';
      });
      /* 规划中的幽灵岛（东京/首尔/硅谷/孟买） */
      FUTURE_HUBS.forEach(f=>{
        ctx.save(); ctx.globalAlpha = .38;
        poly(ctx, [[f.cx - 74, f.cy], [f.cx, f.cy - 37], [f.cx + 74, f.cy], [f.cx, f.cy + 37]],
          '#9fb694', W_PAL.ink);
        ctx.restore();
        ctx.strokeStyle = 'rgba(63,43,35,.55)'; ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(f.cx - 74, f.cy); ctx.lineTo(f.cx, f.cy - 37);
        ctx.lineTo(f.cx + 74, f.cy); ctx.lineTo(f.cx, f.cy + 37); ctx.closePath();
        ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(63,43,35,.75)'; ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(f.n + ' · 规划中', f.cx, f.cy + 2);
        ctx.font = '9px monospace';
        ctx.fillText(f.coord, f.cx, f.cy + 15); ctx.textAlign = 'left';
      });
      /* 水上交通装饰 */
      paintFerry(ctx, islById('central').ox + 5, islById('central').oy - 3.2);
      paintFerry(ctx, islById('lujiazui').ox + 18.2, islById('lujiazui').oy + 4.4);
      /* 岛间航线（虚线弧） */
      ctx.strokeStyle = 'rgba(244,239,228,.6)'; ctx.setLineDash([6, 8]); ctx.lineWidth = 2;
      const pd = CITY.pads.map(p=> isoPt(islById(p.isl).ox + p.ix, islById(p.isl).oy + p.iy));
      ctx.beginPath(); ctx.moveTo(pd[0][0], pd[0][1]);
      ctx.quadraticCurveTo((pd[0][0]+pd[1][0])/2, Math.min(pd[0][1], pd[1][1]) - 90, pd[1][0], pd[1][1]);
      ctx.moveTo(pd[0][0], pd[0][1]);
      ctx.quadraticCurveTo((pd[0][0]+pd[2][0])/2 - 80, (pd[0][1]+pd[2][1])/2, pd[2][0], pd[2][1]);
      ctx.stroke(); ctx.setLineDash([]);
      /* 树 / 车 / 直升机坪 / 铜牛 */
      CITY.trees.forEach(([isl, ix, iy])=>{ const I = islById(isl); paintIsoTree(ctx, I.ox + ix, I.oy + iy); });
      CITY.cars.forEach(c=>{ const I = islById(c.isl); paintIsoCar(ctx, I.ox + c.ix, I.oy + c.iy, c.c); });
      CITY.pads.forEach(p=>{ const I = islById(p.isl); paintHelipad(ctx, I.ox + p.ix, I.oy + p.iy); });
      paintBull(ctx, islById('wallst').ox + 3.6, islById('wallst').oy + 3.4);
      /* 楼（全局按 iy 排序） */
      const sorted = [...CITY.buildings].sort((a, b2)=> (gxy(a)[0] + gxy(a)[1]) - (gxy(b2)[0] + gxy(b2)[1]));
      sorted.forEach(b2=>{
        const [px, py] = gxy(b2);
        const proxy = Object.assign({}, b2, {ix: px, iy: py});
        const box = ISO_STYLES[b2.style](ctx, proxy);
        if(b2.sign) isoSign(ctx, box, b2.sign[0], b2.sign[1], b2.sign[2]);
      });
    }
  });

  /* 碰撞：海面全禁走，岛面放行，楼再封 */
  const inv = (px, py)=>{
    const ix = ((px - ISO.ORX) / (ISO.TW/2) + (py - ISO.ORY) / (ISO.TH/2)) / 2;
    const iy = ((py - ISO.ORY) / (ISO.TH/2) - (px - ISO.ORX) / (ISO.TW/2)) / 2;
    return [ix, iy];
  };
  for(let ty = 0; ty < GH; ty++)
    for(let tx = 0; tx < GW; tx++){
      const [ix, iy] = inv(tx*TILE + 16, ty*TILE + 16);
      const onLand = CITY.islands.some(I=>
        ix >= I.ox + .3 && ix <= I.ox + I.w - .3 && iy >= I.oy + .3 && iy <= I.oy + I.d - .3);
      room.solid[ty][tx] = !onLand;
    }
  /* 楼体碰撞 + 热点 */
  CITY.buildings.forEach(b=>{
    const [bx, by] = gxy(b);
    const w = {nyse:3, campus:3, shop:1.4, pearl:2}[b.style] || 2.2;
    const d = {shop:1.4, pearl:2}[b.style] || 2;
    const corners = [isoPt(bx, by), isoPt(bx + w, by), isoPt(bx + w, by + d), isoPt(bx, by + d)];
    const xs = corners.map(p=>p[0]), ys = corners.map(p=>p[1]);
    const tx0 = Math.max(0, Math.floor(Math.min(...xs) / TILE)), tx1 = Math.min(GW - 1, Math.ceil(Math.max(...xs) / TILE));
    const ty0 = Math.max(0, Math.floor(Math.min(...ys) / TILE)), ty1 = Math.min(GH - 1, Math.ceil(Math.max(...ys) / TILE));
    for(let y = ty0; y <= ty1 - 1; y++)
      for(let x = tx0; x <= tx1; x++)
        room.solid[y][x] = true;
    if(b.label){
      room.furniture.push({id:b.id, tx:tx0, ty:ty0, tw:tx1 - tx0 + 1, th:ty1 - ty0 + 1,
        solid:false, label:b.label, onUse: b.use || (()=> toast(b.n + '：今天不接待'))});
    }
  });
  /* 直升机坪热点：岛间跳转 */
  CITY.pads.forEach(p=>{
    const I = islById(p.isl);
    const sp = isoPt(I.ox + p.ix, I.oy + p.iy);
    const tx = Math.floor(sp[0] / TILE), ty = Math.floor(sp[1] / TILE);
    const others = CITY.islands.filter(x=>x.id !== p.isl);
    room.furniture.push({id:'pad_' + p.isl, tx:tx - 1, ty:ty - 1, tw:3, th:2, solid:false,
      label:'直升机坪 · 飞去别的金融圈',
      onUse: ()=> openModal(`
        <div class="win-bar" style="background:var(--sky)"><span>直升机坪 · 目的地</span>
          <span class="dots" id="mClose" style="cursor:pointer">_ □ ×</span></div>
        <div style="padding:13px"><div class="col" style="gap:6px">
          ${others.map(o=>`<button class="px-btn" data-fly="${o.id}" style="width:100%">✈ 飞往 ${o.n.replace(/ /g,'')}</button>`).join('')}
        </div></div>`)});
  });
  room._afterOpen = ()=>{};
  return room;
}

function enterCity(spawnIsl){
  const room = cityRoom();
  const I = islById(spawnIsl || 'lujiazui');
  const sp = isoPt(I.ox + I.w * .5, I.oy + I.d * .68);
  enterRoom(room, Math.floor(sp[0] / TILE), Math.floor(sp[1] / TILE));
  fitCanvas();
  setLocation('city', '世界地图 · 陆家嘴 / 华尔街 / 香港中环（隔海相望）');
  toast('三个金融圈隔水相望。走到 H 坪按 E 飞过去');
}
/* 飞行按钮事件代理（modal 内容动态） */
document.addEventListener('click', e=>{
  const fly = e.target.closest && e.target.closest('[data-fly]');
  if(fly){ closeModal(); enterCity(fly.dataset.fly); }
  const mc = e.target.closest && e.target.closest('#mClose');
});

/* 派研究员去别家机构调研（外圈机构不开门，只收情报） */
function dispatchAbroad(firm){
  const cand = DATA.researchers.filter(r=>!r.veto && !r.gone && DATA.reviews[r.id]?.status === '在岗');
  if(!cand.length) return toast('没人在岗，都派出去了');
  const r = cand[0];
  DATA.reviews[r.id].status = '外出调研';
  toast(`${r.n} 已出发去 ${firm}。情报回流老板日报`);
  setTimeout(()=>{
    DATA.reviews[r.id].status = '在岗';
    const intel = {
      '猛虎基金':'他们在减 AI 应用、加上游电力。理由一句话：应用还没赚钱，电表先转',
      '灯塔资产':'他们组合里出现了北欧 IDC REIT。和我们的外溢论文对上了',
      '鲸吞资本':'港股通里他们在扫某存储模组厂，连扫 4 天',
      '维多利亚港湾基金':'他们研究员私下说：东南亚电力 PPA 那条线他们查过，真的'
    }[firm];
    pushDaily('intel', `外出情报 · ${firm}：${intel}（★★ 需交叉验证）`);
  }, 9000);
}
