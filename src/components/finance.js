/* ricciflow — 组件: 财务处 FINANCE OFFICE

   薪资 = 真实 token 消耗折钱，读 ~/.claude/projects 的会话转录（bridge/token_ledger.py）。
   没有钥匙就上锁，不再显示写死的薪资单与假 AUM 收入表。 */

RENDER.finance = function(){
  const root = $('#scr-finance');
  if(typeof REAL !== 'undefined' && REAL.on && REAL.finance) return renderRealFinance(root);
  root.innerHTML = `
    <div class="screen-head"><h1>财务处 · FINANCE</h1>
      <span class="sub">每一个 token 都是真花出去的钱</span></div>
    ${lockedCard('薪资与成本', `
      薪资是把每个研究员真实消耗的 token 按公开价目表折成钱算出来的，
      不是拍出来的档位。金额属于机密层，要钥匙。`,
      ['~/.claude/projects/**/*.jsonl（真实 usage，去重后计价）',
       'bridge/token_ledger.py'])}`;
};

/* ==========================================================================
   真实账：token 消耗 → 钱。数据来自 bridge/token_ledger.py 扫出来的会话转录。
   薪资只算得清那几位：有独立工作目录的策略才有独立账单，其余诚实写「无独立账单」。
   ========================================================================== */
function renderRealFinance(root){
  const F = REAL.finance;
  const cny = u=> '¥' + Math.round(u * F.usd_cny).toLocaleString('zh-CN');
  const usd = u=> '$' + u.toLocaleString('en-US', {maximumFractionDigits:0});
  const byId = {};
  (REAL.roster.researchers || []).forEach(r=> byId[r.id] = r);
  const maxSal = Math.max(1, ...F.salaries.map(x=> x.usd));
  const maxOv  = Math.max(1, ...F.overhead.map(x=> x.usd));
  const tok = n=> n >= 1e9 ? (n/1e9).toFixed(1) + 'B' : n >= 1e6 ? (n/1e6).toFixed(0) + 'M' : (n/1e3).toFixed(0) + 'K';

  root.innerHTML = `
    <div class="screen-head">
      <h1>财务处 · FINANCE</h1>
      <span class="sub">每一个 token 都是真花出去的钱。这里每一分钱都能溯源</span>
      <span class="tools"><span class="tag cyan" title="${F.note}">实账 · ${F.built_at}</span></span>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;align-items:start">
      ${win('研究员薪资单 · 逐条按真实用量计价', `
        <table style="width:100%;font-size:11px;border-collapse:collapse">
          <tr style="font-weight:700;color:var(--dim)">
            <td>研究员</td><td>主用模型</td>
            <td style="text-align:right" title="新输入 token">输入</td>
            <td style="text-align:right" title="生成 token，单价最贵">输出</td>
            <td style="text-align:right" title="缓存写入，比普通输入贵">缓存写</td>
            <td style="text-align:right" title="缓存读取，只要基础价的 1/10">缓存读</td>
            <td style="text-align:right" title="缓存读取占全部输入侧的比例">命中率</td>
            <td style="text-align:right">折算薪资</td></tr>
          ${F.salaries.map(x=>{
            const r = byId[x.id] || {}, c = x.cost || {};
            return `<tr style="border-top:2px dotted rgba(63,43,35,.25)">
              <td style="padding:5px 0;font-weight:700">${x.n}
                ${r.status ? `<span class="tag ${REAL_STATUS_TAG[r.status.code]||''}">${r.status.label}</span>` : ''}</td>
              <td class="t-xs">${(x.top_model||'').replace('claude-','').replace(/-\d{8}$/,'')}</td>
              <td style="text-align:right" title="${cny(c.in||0)}">${tok(x.t_in)}</td>
              <td style="text-align:right;font-weight:700" title="${cny(c.out||0)}">${tok(x.t_out)}</td>
              <td style="text-align:right" title="${cny(c.cw||0)}">${tok(x.t_cw)}</td>
              <td style="text-align:right;color:var(--dim)" title="${cny(c.cr||0)}">${tok(x.t_cr)}</td>
              <td style="text-align:right" class="${x.cache_hit>=0.9?'t-cyan':''}">${(x.cache_hit*100).toFixed(0)}%</td>
              <td style="text-align:right;font-weight:700">${cny(x.usd)}</td></tr>`;
          }).join('')}
          <tr style="border-top:3px solid var(--ink);font-weight:700">
            <td style="padding:6px 0">薪资合计</td><td colspan="6"></td>
            <td style="text-align:right">${cny(F.salary_usd)}</td></tr>
        </table>
        <div class="t-xs t-dim" style="font-weight:700;margin-top:8px;line-height:1.8">
          鼠标停在数字上看那一类花了多少钱。<b>四类 token 单价不同</b>，
          所以「消耗多」不等于「花得多」——
          缓存读取只要基础价的 1/10，命中率高的那几位其实很省。</div>
        <div class="bridge" style="margin-top:9px">
          只有自己开过工作目录的策略才有独立账单。以下 ${F.no_bill.length} 位<b>没有独立账单</b>，
          开销混在研究部公共开销里，拆不出来：
          <span class="t-dim">${F.no_bill.map(x=>x.n).join('、')}</span>。
          拆不出来就写拆不出来，不按人头摊派。</div>`,
        {color:'teal', sub:'四类 token 分开计价'})}
      ${win('单价表 · USD / 1M tokens', `
        <table style="width:100%;font-size:11px;border-collapse:collapse">
          <tr style="font-weight:700;color:var(--dim)">
            <td>档位</td><td style="text-align:right">输入</td><td style="text-align:right">输出</td>
            <td style="text-align:right">缓存写 1h</td><td style="text-align:right">缓存写 5m</td>
            <td style="text-align:right">缓存读</td></tr>
          ${Object.entries(F.prices || {}).map(([t, p])=>`
            <tr style="border-top:2px dotted rgba(63,43,35,.25)">
              <td style="padding:4px 0;font-weight:700">${t}</td>
              <td style="text-align:right">${p.in}</td>
              <td style="text-align:right"><b>${p.out}</b></td>
              <td style="text-align:right">${p.cache_write_1h}</td>
              <td style="text-align:right">${p.cache_write_5m}</td>
              <td style="text-align:right" class="t-cyan">${p.cache_read}</td></tr>`).join('')}
        </table>
        <div class="t-xs t-dim" style="font-weight:700;margin-top:8px;line-height:1.8">
          输出是输入的 5 倍价；缓存写入比普通输入还贵（1h 档 2 倍、5m 档 1.25 倍），
          但读取只要 1/10。所以<b>长会话一次写、多次读</b>是最省的形状，
          反复重开新会话最烧钱。<br>
          <span class="t-rose">未列出的模型按同档兜底，账面会标出来，不假装知道。</span></div>`,
        {color:'sky', sub:'公开价目表'})}
      <div class="col">
        ${win('公司总成本 · 按项目', F.overhead.map(x=>`
          <div class="cover-meter" style="grid-template-columns:150px 1fr 96px">
            <span style="font-size:11px">${x.n}</span>
            <span class="px-bar thin"><i style="width:${Math.max(2, x.usd / maxOv * 100)}%;background:var(--coral)"></i></span>
            <span style="text-align:right">${cny(x.usd)}</span></div>`).join('') + `
          <div class="row" style="border-top:3px solid var(--ink);margin-top:7px;padding-top:6px;font-weight:700">
            <span>非研究员开销</span><span class="sp"></span><span>${cny(F.overhead_usd)}</span></div>
          <div class="row" style="font-weight:700;margin-top:4px">
            <span>全公司合计</span><span class="sp"></span><span class="t-rose">${cny(F.total_usd)} / ${usd(F.total_usd)}</span></div>`,
          {color:'coral', sub:'总部自己烧得比研究员多'})}
        ${win('这笔账怎么算出来的', `
          <div class="t-sm" style="font-weight:700;line-height:1.9">
            扫 <code>~/.claude/projects</code> 下每一条 assistant 消息的 usage，按工作目录归属到研究员。<br>
            <span class="t-rose">三个坑，踩错就是账目失真：</span></div>
          <div class="t-xs t-dim" style="font-weight:700;line-height:1.9;margin-top:6px">
            ① 流式落盘会把同一条消息写多遍 —— 不按 message.id+requestId 去重会<b>高估 2.5 倍</b><br>
            ② <code>&lt;synthetic&gt;</code> 是本地合成的零成本记录，必须排除<br>
            ③ 缓存写入要拆 1h（2×）和 5m（1.25×）两档，混着算会把长缓存算便宜</div>
          <div class="bridge" style="margin-top:9px">
            账期从 ${(F.salaries[0]||{}).first || '—'} 起 —— 更早的转录已被轮转清掉，那部分钱查不回来了。</div>`,
          {color:'mustard', sub:'口径公开，可复核'})}
      </div>
    </div>`;
}
