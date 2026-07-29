/* ricciflow — L2 世界地图：横向街道，三金融圈 + 场景场所
   建筑真名（地标），机构戏仿名（行为主体）。走路 + [E] 进楼。 */

function paintTower(ctx, x, baseY, w, hPx, body, opts){
  opts = opts || {};
  const topY = baseY - hPx;
  ctx.fillStyle = W_PAL.ink; ctx.fillRect(x - 2, topY - 2, w + 4, hPx + 2);
  texRect(ctx, x, topY, w, hPx, body, .08, x);
  /* 窗格 */
  ctx.fillStyle = 'rgba(255,240,200,.75)';
  for(let wy = topY + 8; wy < baseY - 10; wy += 12)
    for(let wx = x + 5; wx < x + w - 6; wx += 10)
      if(((wx + wy) % 3) !== 0) ctx.fillRect(wx, wy, 5, 6);
  /* 门 */
  ctx.fillStyle = W_PAL.ink; ctx.fillRect(x + w/2 - 8, baseY - 18, 16, 18);
  /* 招牌 */
  if(opts.sign){
    ctx.fillStyle = W_PAL.ink; ctx.fillRect(x - 2, topY - 22, w + 4, 21);
    ctx.fillStyle = opts.signBg || W_PAL.cream; ctx.fillRect(x, topY - 19, w, 15);
    ctx.fillStyle = opts.signFg || W_PAL.ink;
    ctx.font = 'bold 12px monospace';
    ctx.fillText(opts.sign, x + 4, topY - 7, w - 8);
  }
  if(opts.mine){
    /* 楼身横幅：里奇流资本在此 */
    ctx.fillStyle = W_PAL.coral; ctx.fillRect(x - 4, topY + 46, w + 8, 20);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px monospace';
    ctx.fillText('▲ 里奇流资本 68F', x + 2, topY + 60, w + 2);
  }
}

function paintShop(ctx, x, baseY, w, body, name){
  const h = 52;
  ctx.fillStyle = W_PAL.ink; ctx.fillRect(x - 2, baseY - h - 2, w + 4, h + 2);
  texRect(ctx, x, baseY - h, w, h, body, .1, x * 3);
  ctx.fillStyle = W_PAL.cream; ctx.fillRect(x + 3, baseY - h + 4, w - 6, 13);
  ctx.fillStyle = W_PAL.ink; ctx.font = 'bold 11px monospace';
  ctx.fillText(name, x + 6, baseY - h + 15, w - 10);
  ctx.fillRect(x + w/2 - 7, baseY - 16, 14, 16);                  /* 门 */
  ctx.fillStyle = 'rgba(255,240,200,.8)';
  ctx.fillRect(x + 4, baseY - 30, w/2 - 8, 12);                   /* 橱窗 */
}

const CITY = {
  buildings: [
    /* 陆家嘴 */
    {id:'sh_center', n:'上海中心', tx:1,  tw:5, h:300, c:'#7fa8dd', sign:'SHANGHAI TOWER', mine:true,
     label:'上海中心 · 回楼里', use:()=> enterFloors()},
    {id:'swfc',      n:'环球金融中心', tx:7,  tw:4, h:262, c:'#8ea6c4', sign:'SWFC'},
    {id:'jinmao',    n:'金茂大厦', tx:12, tw:4, h:238, c:'#a89a80', sign:'JIN MAO'},
    {id:'broker',    n:'中银河证券', tx:17, tw:3, h:150, c:'#c98a5a', sign:'中银河证券',
     label:'券商楼 · 集合出差调研', use:()=> startFieldTrip && startFieldTrip()},
    /* 场所（陆家嘴街区） */
    {id:'rest',  n:'聚贤楼',   tx:21, tw:3, shop:true, c:'#b5495b',
     label:'聚贤楼饭店 · 开饭局', use:()=> startVenueDinner('rest')},
    {id:'tea',   n:'拾露茶室', tx:25, tw:3, shop:true, c:'#4f8a72',
     label:'拾露茶室 · 开饭局', use:()=> startVenueDinner('tea')},
    {id:'ktv',   n:'夜莺会所', tx:29, tw:3, shop:true, c:'#7b4a9c',
     label:'夜莺会所(商K) · 开饭局', use:()=> startVenueDinner('ktv')},
    {id:'hotel', n:'金陆大酒店', tx:33, tw:4, h:180, c:'#c9a06a', sign:'金陆大酒店 ★★★★★',
     label:'五星酒店 · 上市公司策略会', use:()=> startStrategyMeet && startStrategyMeet()},
    {id:'campus',n:'X 公司产业园', tx:38, tw:4, shop:true, c:'#6b7d8a',
     label:'X公司园区 · 需券商带队', use:()=> toast('直接闯不进去。去中银河证券集合，卖方带队才见得到董秘')},
    /* 华尔街 */
    {id:'nyse',  n:'NYSE', tx:44, tw:4, h:130, c:'#b0a898', sign:'NYSE'},
    {id:'tiger', n:'猛虎基金', tx:49, tw:3, h:210, c:'#d08a3e', sign:'TIGER FUND',
     label:'猛虎基金 · 派研究员调研', use:()=> dispatchAbroad('猛虎基金')},
    {id:'beacon',n:'灯塔资产', tx:53, tw:3, h:190, c:'#8ab0c9', sign:'BEACON',
     label:'灯塔资产 · 派研究员调研', use:()=> dispatchAbroad('灯塔资产')},
    /* 中环 */
    {id:'ifc',   n:'IFC', tx:58, tw:4, h:280, c:'#9aa7b8', sign:'IFC',
     label:'鲸吞资本 · 派研究员调研', use:()=> dispatchAbroad('鲸吞资本')},
    {id:'vic',   n:'维多利亚港湾基金', tx:63, tw:3, h:160, c:'#7d9c8a', sign:'V.HARBOUR',
     label:'维港基金 · 派研究员调研', use:()=> dispatchAbroad('维多利亚港湾基金')}
  ],
  districts: [
    {n:'陆 家 嘴', tx:1,  tw:41},
    {n:'华 尔 街', tx:44, tw:12},
    {n:'中 环',    tx:58, tw:8}
  ]
};

function cityRoom(){
  const GW = 68, GH = 13, baseTy = 10;
  const F = CITY.buildings.map(b=> ({
    id:b.id, tx:b.tx, ty: baseTy - 2, tw:b.tw, th:2,
    label:b.label, onUse: b.use || (()=> toast(b.n + '：今天不接待')),
    solid:false
  }));
  const room = makeRoom({
    gw:GW, gh:GH, wallRows:0, furniture:F,
    paintBase:(ctx, hour)=>{
      const sk = skyByHour(hour);
      /* 天空 */
      ctx.fillStyle = sk.glass; ctx.fillRect(0, 0, GW*TILE, baseTy*TILE);
      /* 云（步进感：方块云） */
      ctx.fillStyle = 'rgba(255,255,255,.7)';
      [[100,40],[420,66],[860,30],[1300,58],[1700,44]].forEach(([cx,cy])=>{
        ctx.fillRect(cx, cy, 46, 10); ctx.fillRect(cx+8, cy-8, 30, 10);
      });
      /* 街道 */
      texRect(ctx, 0, baseTy*TILE, GW*TILE, (GH-baseTy)*TILE, '#5b5650', .1, 5);
      ctx.fillStyle = '#e9c56a';
      for(let x = 0; x < GW*TILE; x += 48) ctx.fillRect(x, (baseTy+1)*TILE + 10, 24, 4);
      /* 区牌 */
      CITY.districts.forEach(d=>{
        ctx.fillStyle = W_PAL.ink; ctx.fillRect(d.tx*TILE, 6, d.tw*TILE, 20);
        ctx.fillStyle = W_PAL.cream; ctx.font = 'bold 12px monospace';
        ctx.fillText(d.n, d.tx*TILE + 10, 20);
      });
      /* 楼 */
      CITY.buildings.forEach(b=>{
        if(b.shop) paintShop(ctx, b.tx*TILE, baseTy*TILE, b.tw*TILE, b.c, b.n);
        else paintTower(ctx, b.tx*TILE, baseTy*TILE, b.tw*TILE, b.h, b.c,
          {sign:b.sign, mine:b.mine, signBg: b.mine ? W_PAL.coral : undefined, signFg: b.mine ? '#fff' : undefined});
      });
    },
    onStep:(tx, ty)=>{}
  });
  /* 街道上不许走进天空 */
  for(let y = 0; y < baseTy; y++) room.solid[y].fill(true);
  return room;
}

function enterCity(){
  enterRoom(cityRoom(), 3, 11);
  fitCanvas();
  setLocation('city', '世界地图 · 陆家嘴 — 华尔街 — 中环');
  toast('走到楼门口按 E。上海中心是回家的路');
}

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
