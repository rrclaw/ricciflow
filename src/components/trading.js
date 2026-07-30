/* ricciflow — 组件: 交易台 TRADING DESK

   全部读自 ~/invest skills/_PLATFORM，无一处写死：
     · riskboard/reports/<最新>.md        跨策略合并风险报表
     · ledger/trades.jsonl                真实平仓流水（退出理由原文）
     · tradelib/riskrules_baseline.yaml   R1–R10 统一风控基线

   这一屏是**只读观测**。riskboard 自己第一行就写着「不构成任何 skill 的仓位指令」，
   界面上照抄这句话 —— 看得见和管得着是两件事，别让人误以为这里能下单。

   以前这里是写死的假持仓、假 blotter、假「上头拦截剧场」。那些常量已删。 */

/* 纯绘图工具，real.js 的净值曲线在用，保留 */
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

const DESK = {data:null, err:'', loading:false};

async function loadDesk(force){
  if(DESK.loading) return !!DESK.data;
  if(DESK.data && !force) return true;
  if(!realAuthed()){ DESK.err = '需要老板钥匙'; return false; }
  DESK.loading = true;
  try{
    const d = await (await fetch(BRIDGE + '/api/desk?key=' + encodeURIComponent(VAULT.key),
      {signal:AbortSignal.timeout(30000)})).json();
    if(!d || (!d.riskboard && !d.blotter)) throw new Error(d && d.error || '空响应');
    DESK.data = d; DESK.err = '';
  }catch(e){ DESK.err = String(e.message || e); DESK.data = null; }
  finally{ DESK.loading = false; }
  return !!DESK.data;
}

RENDER.trading = function(){
  const root = $('#scr-trading');
  if(!realAuthed()){
    root.innerHTML = `
      <div class="screen-head"><h1>交易台 · TRADING DESK</h1>
        <span class="sub">跨策略合并风险报表 · 只读观测</span></div>
      ${lockedCard('合并持仓与风险', `
        这一屏是本机 10 个真实策略的合并敞口、合并净值、熔断状态与告警。
        持仓和净值属于机密层，没有钥匙不给看 —— 但它<b>不是编的</b>，它就在下面这些文件里。`,
        ['invest skills/_PLATFORM/riskboard/reports/&lt;date&gt;.md',
         'invest skills/_PLATFORM/ledger/trades.jsonl',
         'invest skills/_PLATFORM/tradelib/riskrules_baseline.yaml'])}`;
    return;
  }
  if(!DESK.data){
    root.innerHTML = `
      <div class="screen-head"><h1>交易台 · TRADING DESK</h1>
        <span class="sub">正在读 _PLATFORM 风险报表…</span></div>
      ${win('读取中', '<div class="t-sm" style="font-weight:700">正在解析 riskboard…</div>', {color:'ink'})}`;
    loadDesk().then(ok=> ok ? RENDER.trading() : renderDeskErr(root));
    return;
  }
  drawDesk_(root);
};

function renderDeskErr(root){
  root.innerHTML = `
    <div class="screen-head"><h1>交易台 · TRADING DESK</h1>
      <span class="sub">读不到</span></div>
    ${win('读不到风险报表', `<div class="t-sm t-rose" style="font-weight:700;line-height:1.9">
      ${DESK.err}</div>
      <div class="t-xs t-dim" style="font-weight:700;margin-top:8px">
        这里不会拿假数字顶替。修好数据源再来。</div>`, {color:'coral'})}`;
}

function drawDesk_(root){
  const D = DESK.data, rb = D.riskboard || {}, bl = D.blotter || {}, pr = D.principles || {};
  const nav = rb.nav || {}, conc = rb.conc || {};
  const bad = (nav.dd_now || 0) < -5;

  /* riskboard 解析失败必须显式报出来 —— 静默给空表会看着像「一切正常」 */
  const rbBody = rb.ok ? `
      <div class="row wrap" style="gap:8px;margin-bottom:9px">
        <span class="cap">合并净值</span>
        <b style="font-size:17px" class="${(nav.nav||0) >= 1 ? 't-cyan' : 't-rose'}">${nav.nav ?? '—'}</b>
        <span class="t-xs t-dim" style="font-weight:700">${nav.days ?? '—'} 交易日 · 10 策略等本金 1/N</span>
        <span class="sp"></span>
        <span class="tag ${bad ? 'rose' : ''}">当前回撤 ${nav.dd_now ?? '—'}%</span>
        <span class="tag">最大回撤 ${nav.maxdd ?? '—'}%</span>
      </div>
      ${nav.breaker ? `<div class="bridge" style="margin-bottom:9px"><b>熔断</b> · ${nav.breaker}</div>` : ''}
      <div class="stat3">
        <div><div class="k">合并 gross</div><div class="v">${conc.gross ?? '—'}%</div></div>
        <div><div class="k">合并 net</div><div class="v">${conc.net ?? '—'}%</div></div>
        <div title="集中度，阈值 0.15"><div class="k">HHI(已投)</div>
          <div class="v ${(conc.hhi||0) > .15 ? 't-rose' : ''}">${conc.hhi ?? '—'}</div></div>
      </div>`
    : `<div class="t-sm t-rose" style="font-weight:700;line-height:1.9">${rb.error || '解析失败'}</div>`;

  root.innerHTML = `
    <div class="screen-head">
      <h1>交易台 · TRADING DESK</h1>
      <span class="sub">${rb.ok ? `riskboard ${rb.date} · 只读观测，不构成任何 skill 的仓位指令`
                                : '风险报表解析失败'}</span>
      <div class="tools"><button class="px-btn" id="deskReload">↻ 重读报表</button></div>
    </div>
    <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) minmax(0,300px);gap:12px;align-items:start">
      <div class="col">
        ${win('合并风险 · 等本金 1/N 口径', rbBody, {color: bad ? 'coral' : 'teal',
          sub: rb.ok ? rb.file.replace(/^.*_PLATFORM/, '_PLATFORM') : ''})}
        ${win('各策略在仓', rb.ok ? `
          <table style="width:100%;font-size:10.5px;border-collapse:collapse">
            <tr style="font-weight:700;color:var(--dim)">
              <td>策略</td><td>决策日</td><td style="text-align:right">腿</td>
              <td style="text-align:right">gross</td><td style="text-align:right">net</td><td>市场</td></tr>
            ${rb.skills.map(s=>`<tr style="border-top:2px dotted rgba(63,43,35,.25)">
              <td style="padding:4px 0;font-weight:700">${s.skill}</td>
              <td class="t-xs t-dim">${s.decision}</td>
              <td style="text-align:right">${s.legs}</td>
              <td style="text-align:right"><b>${s.gross}</b></td>
              <td style="text-align:right">${s.net}</td>
              <td class="t-xs t-dim">${s.market}</td></tr>`).join('')}
          </table>` : '<div class="t-xs t-rose" style="font-weight:700">解析不到</div>',
          {color:'sky', sub:'book 内口径 · 各策略互不配资'})}
        ${win('合并敞口 Top 20', rb.ok ? `
          <div style="max-height:300px;overflow:auto">
          <table style="width:100%;font-size:10.5px;border-collapse:collapse">
            <tr style="font-weight:700;color:var(--dim)">
              <td>标的</td><td style="text-align:right">gross</td><td>持有者</td></tr>
            ${rb.exposure.map(e=>`<tr style="border-top:2px dotted rgba(63,43,35,.25)">
              <td style="padding:4px 0"><b>${e.name}</b> <span class="t-dim">${e.ticker}</span></td>
              <td style="text-align:right"><b>${e.gross}</b></td>
              <td class="t-xs t-dim">${e.holders}</td></tr>`).join('')}
          </table></div>
          <div class="t-xs t-dim" style="font-weight:700;margin-top:6px">
            A股名内部直显 —— 外发管线才做英文化脱敏</div>`
          : '<div class="t-xs t-rose" style="font-weight:700">解析不到</div>',
          {color:'mustard', sub:'占总本金 · 等本金折算'})}
      </div>
      <div class="col">
        ${win('告警', rb.ok ? (rb.alerts.length ? rb.alerts.map(a=>`
            <div class="gap-item"><div class="why" style="color:var(--ink)">
              <span class="tag ${a.level === 'red' ? 'rose' : 'gold'}">${a.level === 'red' ? '红' : '黄'}</span>
              ${a.txt}</div></div>`).join('')
            : '<div class="t-sm t-cyan" style="font-weight:700">今日无告警</div>')
          : '<div class="t-xs t-rose" style="font-weight:700">解析不到</div>',
          {color:'coral', sub: rb.ok ? rb.alerts.length + ' 条' : ''})}
        ${win('闸活性', rb.ok && rb.gates.length ? rb.gates.map(g=>`
            <div class="row" style="gap:6px;border-bottom:2px dotted rgba(63,43,35,.22);padding:4px 0">
              <span class="tag ${g.ok ? 'cyan' : 'rose'}">${g.ok ? '活' : '死'}</span>
              <span class="t-xs" style="font-weight:700;line-height:1.6">${g.txt}</span></div>`).join('')
          : '<div class="t-xs t-dim" style="font-weight:700">报表里没有闸活性小节</div>',
          {color:'ink', sub:'闸死了比亏钱更危险'})}
        ${win('平仓流水 · BLOTTER', bl.ok ? `
          <div class="row" style="margin-bottom:7px">
            <span class="cap">累计</span><b>${bl.total}</b> 笔
            <span class="sp"></span>
            <span class="t-xs t-dim" style="font-weight:700">盈利 ${bl.wins} 笔</span></div>
          <div style="max-height:340px;overflow:auto">
          ${bl.rows.map(b=>`<div class="gap-item">
            <div class="why" style="color:var(--ink)">
              <span class="t-dim">${b.exit}</span>
              <span class="tag">${b.skill}</span>
              <b class="${(b.pnl||0) >= 0 ? 't-cyan' : 't-rose'}">${(b.pnl||0) >= 0 ? '+' : ''}${b.pnl ?? '—'}%</b><br>
              <b>${b.name || b.ticker}</b>
              <span class="t-dim">${b.entry} → ${b.exit} · 持 ${b.hold ?? '—'} 天</span>
              ${b.rule ? `<br><span class="t-dim">退出理由（原文）：${b.rule}</span>` : ''}
            </div></div>`).join('')}</div>`
          : `<div class="t-sm t-rose" style="font-weight:700">${bl.error || '读不到'}</div>`,
          {color:'pink', sub: bl.ok ? '退出理由为原文，不改写' : ''})}
      </div>
      <div class="col">
        ${win('风控基线 R1–R10', pr.ok ? pr.rules.map(r=>`
            <div class="redline"><div class="txt">${r.title}
              <small>${r.why || r.fields.join(' · ')}</small></div>
              <div class="sw on"><i></i></div></div>`).join('') + `
            <div class="bridge" style="margin-top:9px">${pr.hard}</div>
            <div class="t-xs t-dim" style="font-weight:700;margin-top:7px">
              改阈值要走 _PROPOSALS 提案 + 法庭，禁止盘中或回撤中临时改参数
              —— 那是情绪交易的代码版。</div>`
          : `<div class="t-sm t-rose" style="font-weight:700">${pr.error || '读不到'}</div>`,
          {color:'mustard', sub: pr.ok ? pr.n + ' 条 · 只允许收紧' : ''})}
        ${win('这一屏能做什么', `
          <div class="t-sm" style="font-weight:700;line-height:1.9">
            只读。riskboard 第一行就写着<b>「本表不构成任何 skill 的仓位指令」</b>，
            这里照抄。</div>
          <div class="t-xs t-dim" style="font-weight:700;line-height:1.8;margin-top:8px">
            要动仓位，去各策略自己的终端跑它自己的闸。网站不给下单按钮，
            也不给绕闸的口子。</div>`, {color:'ink'})}
      </div>
    </div>`;
  const rl = $('#deskReload');
  if(rl) rl.onclick = ()=> loadDesk(true).then(()=> RENDER.trading());
}
