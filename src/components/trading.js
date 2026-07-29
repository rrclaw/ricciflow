/* ricciflow — 组件: 交易台 TRADING DESK
   交易员不做判断：执行 + 原则闸校验 + 记录。含「上头拦截剧场」。 */

DATA.principles = [
  {id:'p1', txt:'当日涨幅 > 15% 不追', by:'老板 · 3月12日亲手写'},
  {id:'p2', txt:'PE > 60 不买', by:'老板 · 开业第一天'},
  {id:'p3', txt:'单票 ≤ 15%', by:'风控官接管，不可改'},
  {id:'p4', txt:'组合回撤 -10% 只减不加', by:'风控官接管，不可改'}
];

DATA.positions = [
  {n:'电子特气 A', cost:32.4, px:38.1, w:'12%', from:'存储外溢票'},
  {n:'大硅片 B',   cost:18.9, px:19.6, w:'9%',  from:'存储外溢票'},
  {n:'液冷 C',     cost:55.2, px:61.8, w:'8%',  from:'晨会主线'},
  {n:'高多层 PCB D',cost:41.0, px:39.2, w:'7%', from:'goldpool 引擎'},
  {n:'光模块 E',   cost:88.7, px:96.3, w:'11%', from:'wavehunter 引擎'},
  {n:'现金',       cost:'—', px:'—',  w:'53%', from:'回撤闸强制'}
];

DATA.blotter = [
  {t:'07-29 09:31', tk:'存储外溢票', by:'Serenity', act:'买入 电子特气 A 2%', gate:'✓ 全过', sign:'老板已签'},
  {t:'07-28 14:55', tk:'晨会主线',   by:'科技研究员', act:'加仓 液冷 C 1%',   gate:'✓ 全过', sign:'老板已签'},
  {t:'07-28 10:02', tk:'—',          by:'老板本人',  act:'追入 材料 F 5%',    gate:'✗ 原则#1 拦截', sign:'撤单'},
  {t:'07-25 09:40', tk:'goldpool',   by:'成长股研究员', act:'买入 高多层 D 3%', gate:'✓ 全过', sign:'老板已签'},
  {t:'07-24 13:20', tk:'反路演结论', by:'Serenity', act:'光刻胶 A 重仓提案', gate:'✗ 流动性闸', sign:'降级观察'},
  {t:'07-23 09:35', tk:'wavehunter', by:'量化研究员', act:'买入 光模块 E 4%', gate:'✓ 全过', sign:'老板已签'},
  {t:'07-22 14:10', tk:'—',          by:'风控官',   act:'强平 消费 G 全部',   gate:'回撤闸触发', sign:'自动执行'}
];

DATA.intercept = [
  ['老板',   '这公司太好了，今天涨了 20%，我一定要追。'],
  ['交易员', '原则 #1：当日涨幅 >15% 不追。这是你 3 月 12 日亲手写的。'],
  ['老板',   '这次不一样。'],
  ['交易员', '调出你上次说「这次不一样」的记录：4 月 2 日追入 XX，-18% 止损离场。要念一遍吗？'],
  ['老板',   '……先放观察池。'],
  ['系统',   '[记录] 冷静间隔 4 分钟 · 原则闸生效 · 拦截计数 +1']
];

/* 组合 NAV 序列（固定种子编造，DEMO 角标） */
function navSeries(seed, n, drift){
  let s = seed, v = 100; const out = [];
  for(let i = 0; i < n; i++){
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    v = v * (1 + drift + ((s / 0x7fffffff) - .5) * .03);
    out.push(v);
  }
  return out;
}
function sparkHTML(series, w, h, color){
  const min = Math.min(...series), max = Math.max(...series);
  const bw = Math.max(2, Math.floor(w / series.length) - 1);
  return `<div style="display:flex;align-items:flex-end;gap:1px;height:${h}px">` +
    series.map(v=>{
      const hh = Math.max(2, Math.round((v - min) / (max - min + .001) * (h - 4)) + 2);
      return `<i style="width:${bw}px;height:${hh}px;background:${color};
        box-shadow:inset 0 0 0 1px rgba(63,43,35,.6)"></i>`;
    }).join('') + '</div>';
}

RENDER.trading = function(){
  const root = $('#scr-trading');
  const nav = navSeries(42, 40, .0022);
  const last = nav[nav.length-1].toFixed(1);
  root.innerHTML = `
    <div class="screen-head">
      <h1>交易台 · TRADING DESK</h1>
      <span class="sub">交易员不做判断。执行、过闸、记录，以及在你上头的时候拦住你</span>
      <div class="tools"><button class="px-btn on dotted" id="btnIntercept">▶ 重放上头拦截</button></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 300px;gap:12px;align-items:start">
      <div class="col">
        ${win('组合 NAV', `
          <div class="row"><span class="cap">净值</span><b style="font-size:16px">${last}</b>
            <span class="demo-mark">编造值</span><span class="sp"></span>
            <span class="t-xs t-dim" style="font-weight:700">40 交易日</span></div>
          <div style="margin-top:8px">${sparkHTML(nav, 380, 90, 'var(--teal)')}</div>`,
          {color:'teal', sub:'DEMO 曲线'})}
        ${win('持仓', `<table style="width:100%;font-size:10px;border-collapse:collapse">
          <tr style="font-weight:700;color:var(--dim)"><td>标的</td><td>成本</td><td>现价</td><td>仓位</td><td>来源课题</td></tr>
          ${DATA.positions.map(p=>`<tr style="border-top:2px dotted rgba(63,43,35,.25)">
            <td style="padding:4px 0;font-weight:700">${p.n}</td><td>${p.cost}</td>
            <td class="${typeof p.px==='number' && p.px>p.cost?'t-cyan':'t-rose'}">${p.px}</td>
            <td><b>${p.w}</b></td><td class="t-dim">${p.from}</td></tr>`).join('')}
        </table>
        <div class="t-xs t-dim" style="margin-top:6px;font-weight:700">A股名内部直显（外发管线才做英文化脱敏）</div>`,
          {color:'sky'})}
      </div>
      ${win('决策流水 · BLOTTER', DATA.blotter.map(b=>`
        <div class="gap-item">
          <div class="why" style="color:var(--ink)">
            <span class="t-dim">${b.t}</span> <span class="tag">${b.by}</span><br>
            <b>${b.act}</b><br>
            <span class="${b.gate.startsWith('✓')?'t-cyan':'t-rose'}">${b.gate}</span> ·
            <span class="t-dim">${b.sign}</span>
          </div>
        </div>`).join(''), {color:'coral', sub:'每一笔都有来源课题和闸结果'})}
      <div class="col">
        ${win('原则库 · 老板定的', DATA.principles.map(p=>`
          <div class="redline"><div class="txt">${p.txt}<small>${p.by}</small></div>
            <div class="sw"><i></i></div></div>`).join('') + `
          <div class="row" style="margin-top:8px">
            <input class="inp" id="newPrin" placeholder="新原则，例：ST 一律不碰" style="flex:1">
            <button class="px-btn sm" id="addPrin">+</button></div>`,
          {color:'mustard', sub:'AI 会拿这些话怼你'})}
        <div id="interceptStage"></div>
      </div>
    </div>`;
  $('#btnIntercept').onclick = playIntercept;
  $('#addPrin').onclick = ()=>{
    const v = $('#newPrin').value.trim(); if(!v) return;
    DATA.principles.push({id:'p'+Date.now(), txt:v, by:'老板 · 刚刚'});
    RENDER.trading(); toast('原则已入库：下次上头它会开口');
  };
};

async function playIntercept(){
  const host = $('#interceptStage'); if(!host) return;
  host.innerHTML = win('上头拦截 · 实况回放', '<div id="icLog"></div>', {color:'ink', sub:'2026-07-28 10:02'});
  const log = $('#icLog');
  for(const [who, txt] of DATA.intercept){
    const mine = who === '老板';
    const sys = who === '系统';
    log.insertAdjacentHTML('beforeend', sys
      ? `<div class="bridge" style="margin:6px 0">${txt}</div>`
      : `<div style="text-align:${mine?'right':'left'};margin:6px 0">
          <span style="background:${mine?'var(--coral)':'var(--teal)'};color:#fff;padding:4px 8px;
            font-size:10px;font-weight:700;display:inline-block;max-width:85%;text-align:left;
            box-shadow:inset 0 0 0 2px var(--ink)">${who}：${txt}</span></div>`);
    log.scrollTop = log.scrollHeight;
    await sleep(650);
  }
  pushDaily('block', '拦截回放已看：追高冲动 → 原则#1 → 撤单。冷静间隔 4 分钟');
}
