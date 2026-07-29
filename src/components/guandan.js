/* ricciflow — 茶室掼蛋（真实可玩）
   两副牌 108 张 · 4 人 2v2：老板+Serenity vs 宏观研究员+茶室老周
   支持：单张/对子/三张/三带二/顺子/三连对(木板)/二连三(钢板)/炸弹(4-8)/同花顺/四王炸
   简化：固定打 2 · 无逢人配 · 无进贡（demo 版，桌角有标注） */

const GD = {
  players: [], hands: [], turn: 0, lastPlay: null, lastBy: -1,
  passes: 0, finished: [], selected: new Set(), running: false, log: []
};
const GD_NAMES = ['老板（你）', 'Serenity', '宏观研究员', '茶室老周'];
const GD_TEAM = [0, 1, 0, 1];   /* 0/2 一队，1/3 一队 */

/* ---------- 牌与牌值 ---------- */
const GD_RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const GD_SUITS = ['♠','♥','♣','♦'];
/* 打 2：大王>小王>2>A>K>…>3 */
function gdVal(rank){
  if(rank === 'BJ') return 18;
  if(rank === 'SJ') return 17;
  if(rank === '2') return 16;
  if(rank === 'A') return 14;
  return {K:13,Q:12,J:11,'10':10,'9':9,'8':8,'7':7,'6':6,'5':5,'4':4,'3':3}[rank];
}
/* 顺子里用自然序（A 可作 14 或 1，2 就是 2） */
function gdNat(rank){
  if(rank === 'A') return 14;
  if(rank === '2') return 2;
  return gdVal(rank) === 16 ? 2 : ({K:13,Q:12,J:11,'10':10,'9':9,'8':8,'7':7,'6':6,'5':5,'4':4,'3':3}[rank] || gdVal(rank));
}
function gdDeck(){
  const d = [];
  for(let n = 0; n < 2; n++){
    GD_SUITS.forEach(su=> GD_RANKS.forEach(r=> d.push({r, s:su})));
    d.push({r:'SJ', s:'☆'}); d.push({r:'BJ', s:'★'});
  }
  for(let i = d.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

/* ---------- 牌型解析 ----------
   返回 {type, len, key, power}；power>0 表示炸弹类 */
function gdParse(cards){
  if(!cards.length) return null;
  const n = cards.length;
  const cnt = {};
  cards.forEach(c=> cnt[c.r] = (cnt[c.r] || 0) + 1);
  const ranks = Object.keys(cnt);
  const jokers = cards.filter(c=> c.r === 'SJ' || c.r === 'BJ').length;

  if(n === 4 && jokers === 4) return {type:'bomb', len:4, key:99, power:99, n:'四王炸'};
  if(ranks.length === 1 && n >= 4 && !jokers)
    return {type:'bomb', len:n, key:gdVal(ranks[0]), power:n, n:n + '张炸'};
  if(n === 1) return {type:'single', len:1, key:gdVal(cards[0].r), n:'单张'};
  if(n === 2 && ranks.length === 1 && !jokers) return {type:'pair', len:2, key:gdVal(ranks[0]), n:'对子'};
  if(n === 3 && ranks.length === 1) return {type:'trip', len:3, key:gdVal(ranks[0]), n:'三张'};
  if(n === 5 && ranks.length === 2){
    const a = cnt[ranks[0]], b = cnt[ranks[1]];
    if((a === 3 && b === 2) || (a === 2 && b === 3))
      return {type:'full', len:5, key:gdVal(a === 3 ? ranks[0] : ranks[1]), n:'三带二'};
  }
  /* 顺子 / 同花顺（5 张连续，无王） */
  if(n === 5 && !jokers && ranks.length === 5){
    const nats = cards.map(c=> gdNat(c.r)).sort((x, y)=> x - y);
    const natsLow = cards.map(c=> c.r === 'A' ? 1 : gdNat(c.r)).sort((x, y)=> x - y);
    const isRun = arr=> arr.every((v, i)=> i === 0 || v === arr[i-1] + 1);
    if(isRun(nats) || isRun(natsLow)){
      const top = isRun(nats) ? nats[4] : natsLow[4];
      const sameSuit = cards.every(c=> c.s === cards[0].s);
      return sameSuit ? {type:'bomb', len:5, key:top, power:5.5, n:'同花顺'}
                      : {type:'straight', len:5, key:top, n:'顺子'};
    }
  }
  /* 三连对（木板）：aabbcc 连续 */
  if(n === 6 && ranks.length === 3 && ranks.every(r=> cnt[r] === 2) && !jokers){
    const nats = ranks.map(gdNat).sort((x, y)=> x - y);
    if(nats[1] === nats[0] + 1 && nats[2] === nats[1] + 1)
      return {type:'plate2', len:6, key:nats[2], n:'三连对'};
  }
  /* 钢板：aaabbb 连续 */
  if(n === 6 && ranks.length === 2 && ranks.every(r=> cnt[r] === 3) && !jokers){
    const nats = ranks.map(gdNat).sort((x, y)=> x - y);
    if(nats[1] === nats[0] + 1)
      return {type:'plate3', len:6, key:nats[1], n:'钢板'};
  }
  return null;
}
function gdBeats(a, b){          /* a 能不能压 b */
  if(!b) return true;
  if(a.power && !b.power) return true;
  if(!a.power && b.power) return false;
  if(a.power && b.power)
    return a.power !== b.power ? a.power > b.power : a.key > b.key;
  return a.type === b.type && a.len === b.len && a.key > b.key;
}

/* ---------- AI：找最小能压的组合 ---------- */
function gdCandidates(hand, last){
  const out = [];
  const byRank = {};
  hand.forEach(c=>{ (byRank[c.r] = byRank[c.r] || []).push(c); });
  const push = cards=>{
    const p = gdParse(cards);
    if(p && gdBeats(p, last)) out.push({cards, p});
  };
  const ranks = Object.keys(byRank);
  if(!last || last.type === 'single') ranks.forEach(r=> push([byRank[r][0]]));
  if(!last || last.type === 'pair') ranks.forEach(r=>{ if(byRank[r].length >= 2 && r !== 'SJ' && r !== 'BJ') push(byRank[r].slice(0, 2)); });
  if(!last || last.type === 'trip') ranks.forEach(r=>{ if(byRank[r].length >= 3) push(byRank[r].slice(0, 3)); });
  if(!last || last.type === 'full'){
    ranks.forEach(r=>{
      if(byRank[r].length >= 3){
        const pairR = ranks.find(r2=> r2 !== r && byRank[r2].length >= 2 && r2 !== 'SJ' && r2 !== 'BJ');
        if(pairR) push(byRank[r].slice(0, 3).concat(byRank[pairR].slice(0, 2)));
      }
    });
  }
  if(!last || last.type === 'straight'){
    /* 枚举自然连续 5：从手牌唯一自然值集合找窗口 */
    const uniq = [...new Set(hand.filter(c=> c.r !== 'SJ' && c.r !== 'BJ').map(c=> gdNat(c.r)))].sort((a, b)=> a - b);
    for(let i = 0; i + 4 < uniq.length + 0; i++){
      const win = uniq.slice(i, i + 5);
      if(win.length === 5 && win[4] - win[0] === 4){
        const cards = win.map(v=> hand.find(c=> gdNat(c.r) === v && c.r !== 'SJ' && c.r !== 'BJ'));
        if(cards.every(Boolean)) push(cards);
      }
    }
  }
  if(!last || last.type === 'plate2' || last.type === 'plate3'){
    const uniq = [...new Set(hand.filter(c=> byRank[c.r].length >= 2 && c.r !== 'SJ' && c.r !== 'BJ').map(c=> gdNat(c.r)))].sort((a, b)=> a - b);
    for(let i = 0; i + 2 < uniq.length + 0; i++){
      const w = uniq.slice(i, i + 3);
      if(w.length === 3 && w[2] - w[0] === 2){
        const cards = [];
        w.forEach(v=>{
          const r = hand.find(c=> gdNat(c.r) === v && c.r !== 'SJ' && c.r !== 'BJ').r;
          cards.push(...byRank[r].slice(0, 2));
        });
        push(cards);
      }
    }
    const uniq3 = [...new Set(hand.filter(c=> byRank[c.r].length >= 3).map(c=> gdNat(c.r)))].sort((a, b)=> a - b);
    for(let i = 0; i + 1 < uniq3.length; i++){
      if(uniq3[i+1] === uniq3[i] + 1){
        const cards = [];
        [uniq3[i], uniq3[i+1]].forEach(v=>{
          const r = hand.find(c=> gdNat(c.r) === v).r;
          cards.push(...byRank[r].slice(0, 3));
        });
        push(cards);
      }
    }
  }
  /* 炸弹永远是候选 */
  ranks.forEach(r=>{
    if(r === 'SJ' || r === 'BJ') return;
    for(let k = 4; k <= byRank[r].length; k++) push(byRank[r].slice(0, k));
  });
  const js = hand.filter(c=> c.r === 'SJ' || c.r === 'BJ');
  if(js.length === 4) push(js);
  out.sort((x, y)=> (x.p.power||0) - (y.p.power||0) || x.p.key - y.p.key || x.cards.length - y.cards.length);
  return out;
}

function gdAiPick(idx){
  const hand = GD.hands[idx];
  const last = GD.lastBy === idx ? null : GD.lastPlay;
  const cands = gdCandidates(hand, last);
  if(!cands.length) return null;
  const lastByOpp = GD.lastBy >= 0 && GD_TEAM[GD.lastBy] !== GD_TEAM[idx];
  /* 队友出的：小牌不压，除非自己快走完 */
  if(!last) return cands[0];
  if(!lastByOpp && hand.length > 6) return null;
  /* 不轻易动炸：非炸候选优先；只在对手出且无普通牌可压时用炸 */
  const normal = cands.filter(c=> !c.p.power);
  if(normal.length) return normal[0];
  if(lastByOpp && (GD.hands[GD.lastBy].length <= 10 || hand.length <= 8)) return cands[0];
  return null;
}

/* ---------- 聊天 ---------- */
const GD_BANTER = [
  [2, '出牌比发研报果断多了啊你们'],
  [3, '茶凉了就说明你想太久'],
  [1, '这把牌面，像极了缺口清单'],
  [2, '供给收缩型手牌，久期不长'],
  [3, '我孙子都会算你手里还有几个炸'],
  [1, '绕不开的牌才是好牌'],
  [2, '你这个出法，宏观上没问题，微观上完蛋']
];
const GD_QUICK = ['快点出，别研究了', '炸他！', '搭档稳住，我牌好', '这局打完回去开晨会'];

function gdSay(who, txt){
  GD.log.push([who, txt]);
  const lane = $('#gdChat');
  if(lane){
    lane.insertAdjacentHTML('beforeend',
      `<div class="logline"><b>${GD_NAMES[who] || who}</b>：${txt}</div>`);
    lane.scrollTop = lane.scrollHeight;
  }
}

/* ---------- UI ---------- */
function gdCardHTML(c, i, sel){
  const red = c.s === '♥' || c.s === '♦' || c.r === 'BJ';
  const face = c.r === 'BJ' ? '大王' : c.r === 'SJ' ? '小王' : c.r;
  return `<span class="gd-card ${sel ? 'sel' : ''} ${red ? 'red' : ''}" data-gi="${i}">
    <b>${face}</b><i>${c.s}</i></span>`;
}

function openGuandan(){
  PANEL_OPEN = 'guandan';
  GD.hands = [[], [], [], []];
  const deck = gdDeck();
  deck.forEach((c, i)=> GD.hands[i % 4].push(c));
  GD.hands.forEach(h=> h.sort((a, b)=> gdVal(a.r) - gdVal(b.r)));
  GD.turn = 0; GD.lastPlay = null; GD.lastBy = -1; GD.passes = 0;
  GD.finished = []; GD.selected = new Set(); GD.running = true; GD.log = [];

  $('#panelTitle').textContent = '拾露茶室 · 掼蛋桌';
  $('#panelBar').style.background = 'var(--teal)';
  $('#panelBody').innerHTML = `
    <section class="screen active">
      <div style="display:grid;grid-template-columns:1fr 280px;gap:12px;align-items:start">
        ${win('牌桌 · 打 2（你 + Serenity vs 宏观 + 老周）', `
          <div class="gd-table" id="gdTable">
            <div class="gd-seat top" id="gdSeat2"></div>
            <div class="gd-seat left" id="gdSeat1"></div>
            <div class="gd-seat right" id="gdSeat3"></div>
            <div class="gd-pile" id="gdPile"><span class="t-dim" style="font-weight:700">你先出牌</span></div>
          </div>
          <div class="gd-hand" id="gdHand"></div>
          <div class="row" style="margin-top:9px;gap:6px">
            <button class="px-btn on" id="gdPlay">出牌</button>
            <button class="px-btn" id="gdPass">不要</button>
            <button class="px-btn ghost" id="gdHint">提示</button>
            <span class="sp"></span>
            <button class="px-btn ghost" id="gdRestart">重开一局</button>
          </div>
          <div class="t-xs t-dim" style="font-weight:700;margin-top:6px">
            demo 简化：固定打 2 · 无逢人配 · 无进贡。牌型全支持（含木板/钢板/同花顺/四王炸）。</div>`,
          {color:'teal', bodyStyle:'padding:10px'})}
        <div class="col">
          ${win('茶室闲聊', '<div class="loglane" id="gdChat" style="max-height:330px"></div>',
            {color:'pink', sub:'边打边聊'})}
          ${win('快捷喊话', GD_QUICK.map((q, i)=>
            `<button class="px-btn sm" style="width:100%;margin-bottom:5px;text-align:left" data-gdq="${i}">「${q}」</button>`).join(''),
            {color:'mustard'})}
        </div>
      </div>
      <div class="panel-foot"><span class="demo-mark">DEMO</span> 掼蛋为民间牌类玩法 · 本桌无任何金钱要素
        <span class="sp"></span><span>里奇流资本 · 曲率即命运</span></div>
    </section>`;
  $('#panel').classList.add('open');
  $('#panelScrim').classList.add('open');
  walkPause(true);

  $('#gdPlay').onclick = gdHumanPlay;
  $('#gdPass').onclick = gdHumanPass;
  $('#gdHint').onclick = gdHumanHint;
  $('#gdRestart').onclick = openGuandan;
  $$('[data-gdq]').forEach(b=> b.onclick = ()=>{
    gdSay(0, GD_QUICK[+b.dataset.gdq]);
    if(Math.random() < .6) setTimeout(()=> gdSay(3, '你喊你的，牌照打'), 900);
  });
  gdRender();
  gdSay(3, '来了老板？坐。茶自己倒，牌我来发');
  setTimeout(()=> gdSay(1, '说好了，打完这局回去写复盘'), 1200);
}

function gdRender(){
  [1, 2, 3].forEach(i=>{
    const seat = $('#gdSeat' + i); if(!seat) return;
    const done = GD.finished.includes(i);
    seat.innerHTML = `${avatarHTML(['', 'serenity', 'macro', 'guest'][i], 's3')}
      <div class="t-xs" style="font-weight:700">${GD_NAMES[i]}${GD_TEAM[i] === 0 ? '（搭档）' : ''}</div>
      <div class="t-xs ${done ? 't-gold' : 't-dim'}" style="font-weight:700">
        ${done ? '已走完 ✓' : '剩 ' + GD.hands[i].length + ' 张'}</div>
      ${GD.turn === i && GD.running ? '<div class="tag gold">思考中…</div>' : ''}`;
  });
  const hand = $('#gdHand'); if(!hand) return;
  hand.innerHTML = GD.hands[0].map((c, i)=> gdCardHTML(c, i, GD.selected.has(i))).join('');
  $$('#gdHand .gd-card').forEach(el2=> el2.onclick = ()=>{
    const i = +el2.dataset.gi;
    GD.selected.has(i) ? GD.selected.delete(i) : GD.selected.add(i);
    el2.classList.toggle('sel');
  });
  const myTurn = GD.turn === 0 && GD.running;
  $('#gdPlay').disabled = !myTurn;
  $('#gdPass').disabled = !myTurn || GD.lastBy === -1 || GD.lastBy === 0;
  $('#gdHint').disabled = !myTurn;
}

function gdShowPile(cards, p, by){
  const pile = $('#gdPile'); if(!pile) return;
  pile.innerHTML = cards ? `
    <div class="t-xs" style="font-weight:700;margin-bottom:4px">${GD_NAMES[by]} · ${p.n}</div>
    <div>${cards.map(c=> gdCardHTML(c, -1, false)).join('')}</div>`
    : `<span class="t-dim" style="font-weight:700">${GD_NAMES[by]} 收下这轮，重新领出</span>`;
}

function gdNextAlive(from){
  let t = (from + 1) % 4;
  while(GD.finished.includes(t)) t = (t + 1) % 4;
  return t;
}

function gdAfterPlay(idx){
  if(!GD.hands[idx].length && !GD.finished.includes(idx)){
    GD.finished.push(idx);
    const pos = ['头游', '二游', '三游'][GD.finished.length - 1] || '末游';
    gdSay(idx, idx === 0 ? '先走一步，你们慢慢打' : '我先走了，' + pos + '拿下');
    pushDaily && pushDaily('intel', `茶室战报：${GD_NAMES[idx]} ${pos}（掼蛋）`);
  }
  if(GD.finished.length >= 3 || GD.finished.includes(0) && GD.finished.length >= 2){
    /* 三家走完或胜负已明 → 结算 */
    if(GD.finished.length >= 3) return gdEnd();
  }
  if(GD.finished.length >= 3) return gdEnd();
}

function gdEnd(){
  GD.running = false;
  const order = [...GD.finished];
  [0, 1, 2, 3].forEach(i=>{ if(!order.includes(i)) order.push(i); });
  const myTeamRanks = order.map((p, rank)=> ({p, rank})).filter(x=> GD_TEAM[x.p] === 0).map(x=> x.rank);
  const win_ = myTeamRanks.includes(0);
  const double_ = myTeamRanks[0] === 0 && myTeamRanks[1] === 1;
  openModal(`
    <div class="win-bar" style="background:${win_ ? 'var(--mustard)' : 'var(--coral)'};color:${win_?'var(--ink)':'#fff'}">
      <span>本局结算</span><span class="dots" id="mClose" style="cursor:pointer">_ □ ×</span></div>
    <div style="padding:13px">
      ${order.map((p, i)=> `<div class="row" style="margin-bottom:6px">
        <span class="tag ${i === 0 ? 'gold' : ''}">${['头游','二游','三游','末游'][i]}</span>
        <b>${GD_NAMES[p]}</b>
        <span class="t-dim t-xs" style="font-weight:700">${GD_TEAM[p] === 0 ? '你方' : '对方'}</span></div>`).join('')}
      <div class="bridge" style="margin-top:10px">
        ${double_ ? '双上！升 3 级。老周说下次不跟你们打了' :
          win_ ? '你方拿下头游，稳中带升' : '被对面双杀了。宏观研究员表示这叫均值回归'}</div>
      <button class="px-btn on dotted" id="gdAgain" style="width:100%;margin-top:10px">再来一局</button>
    </div>`);
  $('#mClose').onclick = closeModal;
  $('#gdAgain').onclick = ()=>{ closeModal(); openGuandan(); };
}

function gdHumanHint(){
  const last = GD.lastBy === 0 || GD.lastBy === -1 ? null : GD.lastPlay;
  const cands = gdCandidates(GD.hands[0], last);
  GD.selected.clear();
  if(!cands.length){ toast('没牌能压，只能不要'); gdRender(); return; }
  cands[0].cards.forEach(c=>{
    const i = GD.hands[0].indexOf(c);
    GD.selected.add(i);
  });
  gdRender();
}

function gdHumanPlay(){
  const cards = [...GD.selected].map(i=> GD.hands[0][i]);
  if(!cards.length) return toast('先选牌');
  const p = gdParse(cards);
  if(!p) return toast('这不是合法牌型');
  const last = GD.lastBy === 0 || GD.lastBy === -1 ? null : GD.lastPlay;
  if(last && !gdBeats(p, last)) return toast(`${p.n} 压不过对面的 ${last.n}`);
  GD.hands[0] = GD.hands[0].filter((c, i)=> !GD.selected.has(i));
  GD.selected.clear();
  GD.lastPlay = p; GD.lastBy = 0; GD.passes = 0;
  gdShowPile(cards, p, 0);
  if(p.power >= 4) gdSay(2, '炸就炸吧，反正你研究员的工资也是你发');
  gdAfterPlay(0);
  if(!GD.running) return;
  GD.turn = gdNextAlive(0);
  gdRender();
  setTimeout(gdAiTurn, 900);
}

function gdHumanPass(){
  GD.passes++;
  gdSay(0, '不要');
  gdAdvance();
}

function gdAdvance(){
  /* 三家（在场的）都不要 → lastBy 重新领出 */
  const alive = [0, 1, 2, 3].filter(i=> !GD.finished.includes(i)).length;
  if(GD.passes >= alive - 1 && GD.lastBy >= 0){
    GD.lastPlay = null; GD.passes = 0;
    const leader = GD.finished.includes(GD.lastBy) ? gdNextAlive(GD.lastBy) : GD.lastBy;
    GD.turn = leader;
    gdShowPile(null, null, leader);
  } else {
    GD.turn = gdNextAlive(GD.turn);
  }
  gdRender();
  if(GD.turn !== 0 && GD.running) setTimeout(gdAiTurn, 800);
}

function gdAiTurn(){
  if(!GD.running || GD.turn === 0) return;
  const idx = GD.turn;
  const pick = gdAiPick(idx);
  if(pick){
    pick.cards.forEach(c=>{
      GD.hands[idx].splice(GD.hands[idx].indexOf(c), 1);
    });
    GD.lastPlay = pick.p; GD.lastBy = idx; GD.passes = 0;
    gdShowPile(pick.cards, pick.p, idx);
    if(pick.p.power >= 4) gdSay(idx, '炸！');
    else if(Math.random() < .22){
      const line = GD_BANTER[Math.floor(Math.random() * GD_BANTER.length)];
      gdSay(line[0], line[1]);
    }
    gdAfterPlay(idx);
    if(!GD.running) return;
  } else {
    GD.passes++;
    if(Math.random() < .3) gdSay(idx, '不要');
  }
  gdAdvance();
}
