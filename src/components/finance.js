/* ricciflow — 组件: 财务处 FINANCE OFFICE
   三张账：研究员薪资（tokens 折钱）· 公司总成本 · 基金收入。
   全部 DEMO 编造值；联动：抽卡消耗→猎头费，专属 LLM→标注，沉淀数→单位产出成本 */

const FIN_PRICE = 45;    /* 混合单价 ¥/1M tokens（DEMO） */

function finTokensOf(r){
  /* 稀有度定基数，id 哈希做抖动，固定可复现 */
  let h = 0; for(const ch of r.id) h = (h * 31 + ch.charCodeAt(0)) & 0xffff;
  const base = {SSR:90, SR:52, R:18}[rarityOf(r)] || 18;
  if(r.veto) return 6;                        /* 风控官惜字如金 */
  if(r.id === 'oldmoney') return 9;           /* 只看现金流量表，不废话 */
  return base + (h % 30);
}
function finSalaryRows(){
  return DATA.researchers.filter(r=> !r.gone).map(r=>{
    const tk_ = finTokensOf(r);
    const salary = Math.round(tk_ * FIN_PRICE);
    const sinks = (DATA.reports[r.id] || []).length + Math.round((r.lv || 1) / 6);
    const own = (typeof rLLMGet === 'function' && rLLMGet(r.id)?.key);
    return {r, tk:tk_, salary, unit: Math.round(salary / Math.max(1, sinks)), own,
      model: own ? (rLLMGet(r.id).model || '专属') : '公司大脑'};
  }).sort((a, b)=> b.salary - a.salary);
}

RENDER.finance = function(){
  const root = $('#scr-finance');
  const rows = finSalaryRows();
  const salaryTotal = rows.reduce((a, x)=> a + x.salary, 0);
  const gachaUsed = (typeof GACHA_LEFT !== 'undefined') ? (5 - GACHA_LEFT) : 0;
  const costs = [
    ['模型 API（研究员大脑）', salaryTotal, 'teal'],
    ['专家库订阅（高临/久谦/AceCamp）', 26000, 'coral'],
    ['数据订阅（进门/SemiAnalysis/TrendForce）', 8800, 'coral'],
    ['行情与基建（行情源/服务器/隧道）', 3200, 'sky'],
    ['猎头费（抽卡 ' + gachaUsed + ' 次）', gachaUsed * 2000, 'mustard'],
    ['茶室掼蛋与商务饭局报销', 1350, 'pink']
  ];
  const costTotal = costs.reduce((a, c)=> a + c[1], 0);
  /* 收入：AUM 1 亿（虚构），管理费 + 业绩报酬 */
  const aum = 100000000;
  const mgmtM = Math.round(aum * 0.02 / 12);
  const nav = navSeries(42, 40, .0022);
  const ret = (nav[nav.length-1] / 100 - 1);
  const perfM = Math.round(Math.max(0, aum * ret * 0.2 / 3));
  const income = mgmtM + perfM;
  const profit = income - costTotal;
  const fmt = n=> '¥' + n.toLocaleString('zh-CN');
  const maxC = Math.max(...costs.map(c=> c[1]));

  root.innerHTML = `
    <div class="screen-head">
      <h1>财务处 · FINANCE</h1>
      <span class="sub">每一个 token 都是钱。研究员的嘴，就是成本中心</span>
      <span class="tools"><span class="demo-mark">全部编造值</span></span>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;align-items:start">
      ${win('研究员薪资单 · 本月 tokens 折算', `
        <table style="width:100%;font-size:11.5px;border-collapse:collapse">
          <tr style="font-weight:700;color:var(--dim)">
            <td>研究员</td><td>大脑</td><td style="text-align:right">消耗</td>
            <td style="text-align:right">折算薪资</td><td style="text-align:right">单位产出成本</td></tr>
          ${rows.map(x=>`<tr style="border-top:2px dotted rgba(63,43,35,.25)">
            <td style="padding:5px 0;font-weight:700">${x.r.n} ${rarityBadge(x.r)}</td>
            <td>${x.own ? '<span class="tag cyan">🧠 ' + x.model + '</span>' : '<span class="tag">公司</span>'}</td>
            <td style="text-align:right">${x.tk}M tok</td>
            <td style="text-align:right;font-weight:700">${fmt(x.salary)}</td>
            <td style="text-align:right" class="${x.unit > 600 ? 't-rose' : 't-cyan'}">${fmt(x.unit)}/条</td></tr>`).join('')}
          <tr style="border-top:3px solid var(--ink);font-weight:700">
            <td style="padding:6px 0">合计</td><td></td><td></td>
            <td style="text-align:right">${fmt(salaryTotal)}</td><td></td></tr>
        </table>
        <div class="t-xs t-dim" style="font-weight:700;margin-top:7px;line-height:1.7">
          薪资 = tokens × ¥${FIN_PRICE}/1M（混合价）。单位产出成本 = 薪资 ÷ 沉淀条数。<br>
          <span class="t-rose">SSR 贵有贵的道理；话多产出少的，绿的会变红。</span></div>`,
        {color:'teal', sub:'嘴上的成本'})}
      <div class="col">
        ${win('公司总成本 · 本月', costs.map(([n, v, c])=>`
          <div class="cover-meter" style="grid-template-columns:190px 1fr 84px">
            <span style="font-size:11px">${n}</span>
            <span class="px-bar thin"><i style="width:${Math.max(2, v / maxC * 100)}%;background:var(--${c})"></i></span>
            <span style="text-align:right">${fmt(v)}</span></div>`).join('') + `
          <div class="row" style="border-top:3px solid var(--ink);margin-top:7px;padding-top:6px;font-weight:700">
            <span>成本合计</span><span class="sp"></span><span>${fmt(costTotal)}</span></div>`,
          {color:'coral'})}
        ${win('基金收入 · 本月', `
          <div class="row" style="justify-content:space-between;font-weight:700;margin-bottom:5px">
            <span>AUM（管理规模）</span><span>${fmt(aum)}</span></div>
          <div class="row" style="justify-content:space-between;margin-bottom:5px">
            <span class="t-dim" style="font-weight:700">管理费 2%/年 · 当月</span><span>${fmt(mgmtM)}</span></div>
          <div class="row" style="justify-content:space-between;margin-bottom:5px">
            <span class="t-dim" style="font-weight:700">业绩报酬 20% 计提（组合 ${(ret*100).toFixed(1)}%）</span><span>${fmt(perfM)}</span></div>
          <div class="row" style="border-top:3px solid var(--ink);padding-top:6px;font-weight:700">
            <span>收入合计</span><span class="sp"></span><span class="t-cyan">${fmt(income)}</span></div>
          <div class="bridge" style="margin-top:9px">
            本月利润 <b>${fmt(profit)}</b>（利润率 ${(profit / income * 100).toFixed(0)}%）。
            ${profit > 0 ? '还养得起这帮嘴。' : '再这么烧 tokens，下月吃食堂。'}</div>
          <div class="t-xs t-dim" style="font-weight:700;margin-top:7px">
            高水位与费后细则从简（demo）。投产接 playbookex NAV 契约。</div>`,
          {color:'mustard', sub:'管理费 + Carry'})}
      </div>
    </div>`;
};
