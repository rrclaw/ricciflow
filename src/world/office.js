/* ricciflow — L0 老板办公室（首页）
   家具 = 组件热点。走到大门出去 → L1 楼层。 */

function officeRoom(){
  const F = [];

  /* --- 家具画笔 --- */
  const paintQuoteWall = (ctx, x, y)=>{
    ctx.fillStyle = W_PAL.ink; ctx.fillRect(x + 6, y + 8, 5*TILE - 12, 2*TILE - 14);
    ctx.fillStyle = W_PAL.screen; ctx.fillRect(x + 10, y + 12, 5*TILE - 20, 2*TILE - 22);
    /* 假 K 线 */
    for(let i = 0; i < 16; i++){
      const cx = x + 16 + i * 8;
      const up = (i * 7) % 3 !== 0;
      ctx.fillStyle = up ? W_PAL.screenGlow : W_PAL.coral;
      const hh = 6 + (i * 13) % 18;
      ctx.fillRect(cx, y + 2*TILE - 26 - hh, 4, hh);
    }
    ctx.fillStyle = W_PAL.screenGlow; ctx.font = 'bold 13px monospace';
    ctx.fillText('SOURCE RACK 12/16 ▲', x + 14, y + 22);
  };

  const paintSign = (ctx, x, y)=>{
    ctx.fillStyle = W_PAL.ink; ctx.fillRect(x + 2, y + 8, 4*TILE - 4, 2*TILE - 20);
    ctx.fillStyle = W_PAL.cream; ctx.fillRect(x + 6, y + 12, 4*TILE - 12, 2*TILE - 28);
    ctx.fillStyle = W_PAL.coral; ctx.font = 'bold 13px monospace';
    ctx.fillText('RICCI FLOW', x + 14, y + 28);
    ctx.fillStyle = W_PAL.ink; ctx.font = 'bold 13px monospace';
    ctx.fillText('里 奇 流 资 本', x + 13, y + 40);
    ctx.font = '11px monospace'; ctx.fillStyle = '#8a7460';
    ctx.fillText('曲率即命运', x + 26, y + 50);
  };

  const paintMeetingDoor = (ctx, x, y)=>{
    ctx.fillStyle = W_PAL.ink; ctx.fillRect(x + 4, y + 4, 3*TILE - 8, 2*TILE - 6);
    ctx.fillStyle = '#6e4a28'; ctx.fillRect(x + 8, y + 8, 3*TILE - 16, 2*TILE - 12);
    ctx.fillStyle = W_PAL.mustard; ctx.fillRect(x + 3*TILE - 22, y + TILE + 2, 5, 5);
    ctx.fillStyle = W_PAL.cream; ctx.font = 'bold 13px monospace';
    ctx.fillText('WAR ROOM', x + 14, y + 16);
  };

  const paintRulesBoard = (ctx, x, y)=>{
    ctx.fillStyle = W_PAL.ink; ctx.fillRect(x + 4, y + 6, 2*TILE - 8, 2*TILE - 16);
    ctx.fillStyle = W_PAL.cream; ctx.fillRect(x + 7, y + 9, 2*TILE - 14, 2*TILE - 22);
    ctx.fillStyle = W_PAL.coral;
    for(let i = 0; i < 4; i++) ctx.fillRect(x + 11, y + 14 + i*8, 2*TILE - 26, 3);
  };

  const paintBookshelf = (ctx, x, y)=>{
    ctx.fillStyle = W_PAL.ink; ctx.fillRect(x + 2, y + 2, 2*TILE - 4, 3*TILE - 4);
    ctx.fillStyle = '#6e4a28'; ctx.fillRect(x + 5, y + 5, 2*TILE - 10, 3*TILE - 10);
    const cols = ['#e8535a','#57bfb4','#e9b23c','#7fa8dd','#ef86ad'];
    for(let s = 0; s < 3; s++){
      for(let b = 0; b < 6; b++){
        ctx.fillStyle = cols[(s*6 + b) % 5];
        ctx.fillRect(x + 8 + b*8, y + 10 + s*28, 6, 20);
      }
    }
  };

  const paintBossDesk = (ctx, x, y, hour, frame)=>{
    ctx.fillStyle = W_PAL.ink; ctx.fillRect(x, y + 10, 4*TILE, 2*TILE - 14);
    ctx.fillStyle = '#9a6a3f'; ctx.fillRect(x + 3, y + 13, 4*TILE - 6, 2*TILE - 20);
    /* 三联屏（发光） */
    for(let m = 0; m < 3; m++){
      const mx = x + 8 + m * 40;
      ctx.fillStyle = W_PAL.ink; ctx.fillRect(mx, y - 8, 34, 26);
      ctx.fillStyle = frame && m === 1 ? '#123a34' : W_PAL.screen;
      ctx.fillRect(mx + 3, y - 5, 28, 20);
      ctx.fillStyle = W_PAL.screenGlow;
      ctx.fillRect(mx + 6, y, 12, 2); ctx.fillRect(mx + 6, y + 5, 20, 2);
      ctx.fillRect(mx + 6, y + 10, 8, 2);
    }
    ctx.fillStyle = W_PAL.coral; ctx.fillRect(x + 4*TILE - 18, y + 20, 10, 8);   /* 老板杯 */
  };

  const paintStaffDesk = (ctx, x, y, who)=>{
    ctx.fillStyle = W_PAL.ink; ctx.fillRect(x, y + 14, 3*TILE, TILE + 4);
    ctx.fillStyle = '#9a6a3f'; ctx.fillRect(x + 3, y + 17, 3*TILE - 6, TILE - 2);
    ctx.fillStyle = W_PAL.ink; ctx.fillRect(x + 10, y + 2, 26, 18);
    ctx.fillStyle = W_PAL.screen; ctx.fillRect(x + 13, y + 5, 20, 12);
    ctx.fillStyle = W_PAL.screenGlow; ctx.fillRect(x + 15, y + 8, 12, 2);
    /* 坐着的研究员（画在桌下方） */
    ctx.fillStyle = '#5f3c22'; ctx.fillRect(x + 34, y + 44, 22, 8);   /* 椅子 */
    drawSpriteOn(ctx, who, x + 34, y + 24, 2);
  };

  const paintCoffee = (ctx, x, y)=>{
    ctx.fillStyle = W_PAL.ink; ctx.fillRect(x + 2, y + 6, TILE - 4, 2*TILE - 10);
    ctx.fillStyle = '#8a4a3a'; ctx.fillRect(x + 5, y + 9, TILE - 10, 2*TILE - 16);
    ctx.fillStyle = W_PAL.cream; ctx.fillRect(x + 8, y + 16, TILE - 16, 8);
    ctx.fillStyle = W_PAL.mustard; ctx.fillRect(x + 10, y + 34, 10, 10);
  };

  const paintTradeDesk = (ctx, x, y)=>{
    ctx.fillStyle = W_PAL.ink; ctx.fillRect(x, y + 8, 4*TILE, TILE);
    ctx.fillStyle = '#2e6b4f'; ctx.fillRect(x + 3, y + 11, 4*TILE - 6, TILE - 6);
    ctx.fillStyle = W_PAL.cream; ctx.font = 'bold 13px monospace';
    ctx.fillText('TRADING', x + 34, y + 26);
    /* 交易员站柜台后 */
    drawSpriteOn(ctx, 'trader', x + 4*TILE - 34, y - 14, 2);
    ctx.fillStyle = W_PAL.coral; ctx.fillRect(x + 8, y - 4, 8, 8);   /* 红色急停按钮 */
  };

  /* --- 家具表 --- */
  F.push({id:'quote_wall',  tx:1,  ty:1, tw:5, th:2, solid:false, comp:'rack',
          label:'行情大屏 · 数据源', paint:paintQuoteWall});
  F.push({id:'sign',        tx:6,  ty:1, tw:4, th:2, solid:false, paint:paintSign});
  F.push({id:'meeting_door',tx:11, ty:1, tw:3, th:2, solid:false, comp:'scenes',
          label:'会议室 · 场景', paint:paintMeetingDoor});
  F.push({id:'rules_board', tx:16, ty:1, tw:2, th:2, solid:false, comp:'settings',
          label:'制度牌 · 系统', paint:paintRulesBoard});
  F.push({id:'bookshelf',   tx:1,  ty:4, tw:2, th:3, comp:'atlas',
          label:'书架 · 知识库', paint:paintBookshelf});
  F.push({id:'boss_desk',   tx:5,  ty:6, tw:4, th:2, comp:'research',
          label:'办公桌 · 研究台', paint:paintBossDesk});
  /* 工位区：每人一桌一热点 → 个人工作看板 */
  const staffWho = ['serenity','tech','quant','growth'];
  const staffName = {serenity:'Serenity', tech:'科技研究员', quant:'量化研究员', growth:'成长股研究员'};
  [[15,5],[20,5],[15,8],[20,8]].forEach(([tx,ty],i)=>{
    const who = staffWho[i];
    F.push({id:'staff_'+who, tx, ty, tw:3, th:2, comp:'desk',
            label:staffName[who] + ' 的工位',
            onUse:()=> openResearcherPanel(who),
            paint:(ctx,x,y)=> paintStaffDesk(ctx, x, y, who)});
  });
  F.push({id:'coffee',      tx:24, ty:5, tw:1, th:2, comp:'daily',
          label:'咖啡机 · 老板日报', paint:paintCoffee});
  F.push({id:'trade_desk',  tx:4,  ty:11, tw:4, th:2, comp:'trading',
          label:'交易柜台 · 交易台', paint:paintTradeDesk});
  F.push({id:'main_door',   tx:12, ty:13, tw:2, th:2, solid:false,
          label:'出办公室', onUse: ()=> enterFloors()});

  const room = makeRoom({
    gw:26, gh:15, wallRows:3, furniture:F,
    paintBase:(ctx, hour, frame)=>{
      /* 窗（右侧墙） */
      paintWindow(ctx, 19*TILE, 8, 6*TILE, 2*TILE + 8, hour);
      /* 地毯 */
      paintRug(ctx, 10*TILE, 7*TILE, 3*TILE, 2*TILE);
      /* 盆栽 */
      paintPlant(ctx, 3*TILE + 2, 3*TILE + 2, frame);
      paintPlant(ctx, 23*TILE + 2, 12*TILE + 2, frame);
      /* 大门 + 门垫 */
      const dx = 12*TILE, dy = 14*TILE;
      ctx.fillStyle = W_PAL.ink; ctx.fillRect(dx - 6, dy - TILE + 6, 2*TILE + 12, TILE + 24);
      ctx.fillStyle = '#6e4a28'; ctx.fillRect(dx, dy - TILE + 12, 2*TILE, TILE + 18);
      ctx.fillStyle = W_PAL.mustard; ctx.fillRect(dx + TILE - 5, dy - 6, 10, 6);
      ctx.fillStyle = W_PAL.cream; ctx.font = 'bold 13px monospace';
      ctx.fillText('EXIT', dx + TILE - 16, dy - TILE + 26);
    },
    paintDynamic:(ctx, now)=>{
      /* 工位偶尔冒思考泡（步进闪烁，不平滑） */
      const t = Math.floor(now / 900) % 8;
      if(t < 3){
        const spots = [[16,4.4],[21,4.4],[16,7.4]];
        const [sx, sy] = spots[t % spots.length];
        ctx.fillStyle = W_PAL.cream;
        ctx.fillRect(sx*TILE + 40, sy*TILE, 26, 14);
        ctx.fillStyle = W_PAL.ink;
        ctx.font = 'bold 13px monospace';
        ctx.fillText('...', sx*TILE + 46, sy*TILE + 11);
      }
    },
    onStep:(tx, ty)=>{
      if(ty >= 14 && (tx === 12 || tx === 13)) enterFloors();
    }
  });
  return room;
}

function startOffice(){
  enterRoom(officeRoom(), 12, 10);
  fitCanvas();
  setLocation('office', '上海中心 68F · 里奇流资本 · 老板办公室');
}
