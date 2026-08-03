/* ricciflow — L1 楼层：上海中心电梯厅 + NPC 机构室内
   52F 断桥资本（交流） / 77F 城堡量化（交流+挖人） / 68F 回家 / 1F 出楼 */

DATA.npcs = {
  bridgewater:{n:'断桥资本', color:'#8ab0c9', host:'macro',
    talk:[
      {q:'聊聊宏观？', a:'我们在压久期。你们做股票的总觉得流动性是水，其实它是潮汐——现在是退潮前最后一波浪。',
       clue:'断桥观点：流动性退潮前最后一波（久期视角）'},
      {q:'怎么看存储涨价？', a:'商品属性周期，我们不碰个股。但一句话送你：供给收缩的涨价，久期比你想的短。',
       clue:'断桥观点：供给收缩型涨价久期偏短'}]},
  citadel:{n:'城堡量化', color:'#7b4a9c', host:'quant',
    talk:[
      {q:'交流下因子？', a:'你们那个机构搜索热度因子我们复现过，IC 比你们公布的低 0.02。别慌，是我们数据源更脏。',
       clue:'城堡复现 search_alpha 因子：IC 差 0.02（数据源差异）'},
      {q:'最近招人吗？', a:'一直招。说起来，你们那位量化研究员……我们出 3.2 倍。这不是玩笑。', poachWarn:true}],
    poach:{n:'高频路径士', sp:'quant', cost:'年薪 2.4×，签字费一套 IFC 景观房',
      ok:'挖来了：高频路径士入职。他第一句话：你们的下单延迟是按「天」算的？'}}
};

function npcRoom(id){
  const npc = DATA.npcs[id];
  const F = [];
  F.push({id:'npc_talk', tx:5, ty:3, tw:3, th:2, solid:false,
    label:`和 ${npc.n} 交流`, onUse:()=> npcTalk(id),
    paint:(ctx,x,y)=>{
      ctx.fillStyle = W_PAL.ink; ctx.fillRect(x, y+14, 3*TILE, TILE);
      ctx.fillStyle = '#9a6a3f'; ctx.fillRect(x+3, y+17, 3*TILE-6, TILE-6);
      drawSpriteOn(ctx, npc.host, x + TILE, y - 8, 2);
    }});
  if(npc.poach) F.push({id:'npc_poach', tx:10, ty:3, tw:2, th:2, solid:false,
    label:'挖这个人', onUse:()=> npcPoach(id),
    paint:(ctx,x,y)=>{ drawSpriteOn(ctx, npc.poach.sp, x + 8, y + 6, 2);
      ctx.fillStyle = W_PAL.mustard; ctx.font='bold 13px monospace';
      ctx.fillText('TOP GUN', x + 4, y + 58); }});
  F.push({id:'back', tx:6, ty:8, tw:2, th:1, solid:false,
    label:'回电梯厅', onUse:()=> enterFloors()});
  const room = makeRoom({
    gw:14, gh:10, wallRows:2, furniture:F,
    paintBase:(ctx, hour)=>{
      ctx.fillStyle = W_PAL.ink; ctx.fillRect(3*TILE, 6, 8*TILE, 22*1);
      ctx.fillStyle = npc.color; ctx.fillRect(3*TILE+3, 9, 8*TILE-6, 16);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 13px monospace';
      ctx.fillText(npc.n + ' · ' + (id==='citadel'?'77F':'52F'), 3*TILE + 12, 21);
      paintWindow(ctx, 10*TILE, TILE + 6, 3*TILE, TILE + 10, hour);
      paintPlant(ctx, TILE, 7*TILE, 0);
    },
    onStep:(tx,ty)=>{ if(ty >= 9) enterFloors(); }
  });
  return room;
}

function visitNpc(id){
  enterRoom(npcRoom(id), 7, 7);
  fitCanvas();
  setLocation('visiting:' + id, `上海中心 · ${DATA.npcs[id].n}（拜访中）`);
}

let NPC_TALK_STEP = {};
/* 和别家机构「交流」= 看这一家（化名）最近真实说过什么。
   以前这里是写死的三段对白，已删 —— 说的话必须有出处。 */
function npcTalk(id){
  const map = {duanqiao:'zhongxin', citadel:'huatai2', menghu:'guosheng2', jingtan:'zhaoshang2'};
  const nid = map[id] || 'zhongxin';
  if(typeof openNpcCard === 'function') return openNpcCard(nid);
  toast('NPC 素材模块没加载');
}

function npcPoach(id){
  /* 挖来的人是虚构的，名册只放真在跑的策略，所以这里不再写名册。
     P5 会把 NPC 换成「化名 + 真实公开发言蒸馏」，那时再谈交换什么。 */
  return toast('挖角会往名册里塞假人，已停用。名册只放 ~/invest skills 里真在跑的策略。');
}
function _deadNpcPoach(id){
  const npc = DATA.npcs[id];
  openModal(`
    <div class="win-bar" style="background:var(--coral)"><span>挖人谈判 · ${npc.poach.n}</span>
      <span class="dots" id="mClose" style="cursor:pointer">_ □ ×</span></div>
    <div style="padding:13px">
      <div class="row" style="margin-bottom:9px">${avatarHTML(npc.poach.sp,'s4')}
        <div><b>${npc.poach.n}</b><div class="t-xs t-dim">城堡量化 · 高频组</div></div></div>
      <div class="t-sm" style="line-height:1.8;margin-bottom:10px">对方要价：<b>${npc.poach.cost}</b><br>
        <span class="t-xs t-dim" style="font-weight:700">考核预算提示：你的量化研究员排名 #6，引入外援会刺激他，也可能逼走他。</span></div>
      <div class="row" style="gap:6px">
        <button class="px-btn on" id="poachGo">砸钱，挖</button>
        <button class="px-btn ghost" id="poachNo">下次一定</button></div>
    </div>`);
  $('#mClose').onclick = closeModal;
  $('#poachNo').onclick = closeModal;
  $('#poachGo').onclick = ()=>{
    DATA.researchers.push({id:'poach'+Date.now(), sp:npc.poach.sp, n:npc.poach.n, proto:'挖自城堡量化',
      lv:11, xp:5, adopt:0, hit:0, mdd:0, love:2, adopted:0, rejected:0,
      aggr:6, indep:8, horizon:2, factors:['微观结构','延迟','拥挤度'],
      motto:'延迟就是钱。', say:{hi:npc.poach.ok, mid:npc.poach.ok, lo:npc.poach.ok}});
    DATA.reviews[DATA.researchers[DATA.researchers.length-1].id] = {hit:50,contrib:50,disc:80,rank:9,status:'在岗'};
    pushDaily('review', `挖角成功：${npc.poach.n} 入职（来自城堡量化）。名册 +1`);
    closeModal(); toast('挖到了。去「研究员」看新卡');
  };
}

/* ---------- 电梯厅 ---------- */
function floorsRoom(){
  const F = [
    {id:'f68', tx:2,  ty:2, tw:2, th:2, solid:false, label:'68F · 回里奇流资本',
     onUse:()=> startOffice()},
    {id:'f77', tx:5,  ty:2, tw:2, th:2, solid:false, label:'77F · 城堡量化',
     onUse:()=> visitNpc('citadel')},
    {id:'f52', tx:8,  ty:2, tw:2, th:2, solid:false, label:'52F · 断桥资本',
     onUse:()=> visitNpc('bridgewater')},
    {id:'f1',  tx:11, ty:2, tw:2, th:2, solid:false, label:'1F 大堂 · 出楼看世界',
     onUse:()=> enterCity()}
  ];
  const room = makeRoom({
    gw:15, gh:9, wallRows:2, furniture:F,
    paintBase:(ctx, hour)=>{
      /* 电梯门 ×4 */
      const doors = [[2,'68F 里奇流','#e8535a'],[5,'77F 城堡','#7b4a9c'],[8,'52F 断桥','#8ab0c9'],[11,'1F 大堂','#e9b23c']];
      doors.forEach(([tx, name, c])=>{
        const x = tx*TILE, y = TILE - 8;
        ctx.fillStyle = W_PAL.ink; ctx.fillRect(x - 3, y, 2*TILE + 6, 2*TILE + 20);
        ctx.fillStyle = '#9aa3ad'; ctx.fillRect(x, y + 3, 2*TILE, 2*TILE + 12);
        ctx.fillStyle = W_PAL.ink; ctx.fillRect(x + TILE - 2, y + 3, 4, 2*TILE + 12);
        ctx.fillStyle = c; ctx.fillRect(x, y - 2, 2*TILE, 10);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 13px monospace';
        ctx.fillText(name, x + 3, y + 6, 2*TILE - 6);
      });
      /* 楼层指示牌 */
      ctx.fillStyle = W_PAL.ink; ctx.fillRect(13*TILE + 6, 3*TILE, 40, 60);
      ctx.fillStyle = W_PAL.cream; ctx.fillRect(13*TILE + 9, 3*TILE + 3, 34, 54);
      ctx.fillStyle = W_PAL.ink; ctx.font = 'bold 13px monospace';
      ['118F 观光','77F 城堡','68F 里奇流','52F 断桥','1F 大堂'].forEach((s,i)=>
        ctx.fillText(s, 13*TILE + 11, 3*TILE + 13 + i*10));
      paintRug(ctx, 5*TILE, 5*TILE, 5*TILE, 2*TILE);
    }
  });
  return room;
}

function enterFloors(){
  enterRoom(floorsRoom(), 7, 6);
  fitCanvas();
  setLocation('floors', '上海中心 · 电梯厅');
}
