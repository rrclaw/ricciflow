/* ricciflow — 上锁卡 / 待接线卡 / 出处登记表

   这个文件存在的理由：**这个网站不许显示拍脑袋写出来的数字。**

   所以任何一屏只有三种合法状态：
     1. 真实数据（读到了本机文件，页脚写明是哪个文件）
     2. 上锁    （数据是真的，但要老板钥匙才给看）
     3. 待接线  （本机确实有这份真数据，界面还没接上去 —— 明说没接，不拿假数字顶）

   第 3 种以前是「摆个假数字 + 挂个 DEMO 角标」。角标没人看，数字却会被当真，
   所以整条路线废掉：宁可空着写「还没接」，也不许摆一份假的。 */

/* 每个组件的数据出处 —— 页脚照这张表写，路径必须真实存在（gate 会逐个校验）。
   status: real=已接真 / pending=待接线 / play=演绎层（真实观点，化名人物） */
/* 每个组件的数据出处。reads 里每项是 [人看的说明, 可 stat 的真实路径或 null]。
   带 null 的是「不是本机文件」（比如 playbookex 的 HTTP 口径）或纯说明。
   gate 会把非 null 的逐个 os.path.exists —— 路径写错当场红。 */
const KBW = 'knowledge/knowledge/wiki';
const PROVENANCE = {
  research: {status:'partial', reads:[
    ['灵感流（已真）', 'bridge/distill.py'],
    ['课题流水线（待接线）', KBW + '/_BELIEFS.md']]},
  rack:     {status:'real', reads:[
    ['来源注册表', 'knowledge/knowledge/index/sources.jsonl'],
    ['免费接口实时探针', 'bridge/freeapi.py']]},
  atlas:    {status:'real', reads:[
    ['行业 wiki', KBW + '/industries'],
    ['缺口账本', KBW + '/_RESOLVED_GAPS.json']]},
  desk:     {status:'real', reads:[
    ['PK 榜', 'invest skills/_PLATFORM/ledger/pk_board.json'],
    ['平仓账本', 'invest skills/_PLATFORM/ledger/trades.jsonl'],
    ['净值口径 rr.playbookex.com', null]]},
  scenes:   {status:'real', reads:[
    ['brownsugar 观点与反思', 'invest skills/brownsugar/reports'],
    ['serenity 锁仓简报', 'invest skills/serenity/reports'],
    ['综合摘要（本地 Claude 产出）', null]]},
  trading:  {status:'real', reads:[
    ['跨策略风险报表', 'invest skills/_PLATFORM/riskboard/reports'],
    ['平仓流水', 'invest skills/_PLATFORM/ledger/trades.jsonl'],
    ['风控基线 R1-R10', 'invest skills/_PLATFORM/tradelib/riskrules_baseline.yaml']]},
  daily:    {status:'real', reads:[
    ['当日 summary 报告', 'invest skills/summary/reports'],
    ['审阅队列', KBW + '/_REVIEW_QUEUE.md'],
    ['待入库队列', KBW + '/_PENDING_INGEST.md']]},
  finance:  {status:'real', reads:[
    ['真实 token 用量', '.claude/projects'],
    ['计价与去重', 'bridge/token_ledger.py']]},
  settings: {status:'real', reads:[['本机配置，无外部数据', null]]},
};

const PROV_LABEL = {
  real:    ['cyan', '实盘数据'],
  partial: ['gold', '部分接真'],
  pending: ['rose', '待接线'],
  play:    ['', '演绎层'],
};

/* 页脚：写出处，不写免责声明。 */
function provenanceFoot(id){
  const p = PROVENANCE[id];
  if(!p) return '<span>里奇流资本 · 曲率即命运</span>';
  const [cls, label] = PROV_LABEL[p.status] || ['', p.status];
  const authed = (typeof REAL !== 'undefined' && REAL.on);
  return `<span class="tag ${cls}">${label}</span>
    <span class="t-xs" style="font-weight:700">读自 ${p.reads.map(r=> r[1] || r[0]).join(' · ')}</span>
    ${p.status === 'real' && !authed
      ? '<span class="t-xs t-rose" style="font-weight:700">· 未插钥匙，机密部分已上锁</span>' : ''}
    <span class="sp"></span><span>里奇流资本 · 曲率即命运</span>`;
}

/* 上锁卡：数据是真的，缺钥匙。 */
function lockedCard(title, why, reads, opt){
  opt = opt || {};
  return win(title, `
    <div style="text-align:center;padding:16px 10px">
      <div style="font-size:30px;line-height:1;margin-bottom:10px">🔒</div>
      <div style="font-weight:700;font-size:13px;margin-bottom:8px">需要老板钥匙</div>
      <div class="t-sm" style="line-height:1.9;max-width:420px;margin:0 auto 12px">${why}</div>
      <div class="t-xs t-dim" style="font-weight:700;line-height:1.8;margin-bottom:12px">
        这一屏读的是：<br>${(reads || []).map(r=> '<code>' + r + '</code>').join('<br>')}</div>
      <button class="px-btn on dotted" data-openvault="1">⚿ 转保险库输密码</button>
    </div>`, {color:'ink', sub:'真实数据 · 仅本机可见', ...opt});
}

/* 待接线卡：本机有这份真数据，界面还没接。不拿假数字顶。 */
function pendingCard(title, what, reads, opt){
  opt = opt || {};
  return win(title, `
    <div style="padding:14px 12px">
      <div class="row" style="margin-bottom:9px">
        <span class="tag rose">待接线</span>
        <span class="t-xs t-dim" style="font-weight:700">本机有真数据，界面还没接上</span></div>
      <div class="t-sm" style="line-height:1.9;margin-bottom:10px">${what}</div>
      <div class="t-xs t-dim" style="font-weight:700;line-height:1.8">
        接线后读：<br>${(reads || []).map(r=> '<code>' + r + '</code>').join('<br>')}</div>
      <div class="bridge" style="margin-top:11px">
        这里以前摆的是写死的假数字。宁可空着写「还没接」，也不摆一份假的 —— 假数字会被当真，
        角标不会有人看。</div>
    </div>`, {color:'ink', ...opt});
}

/* 把上锁卡里的按钮接上保险库（面板重画后调用） */
function bindLockedCards(){
  $$('[data-openvault]').forEach(b=> b.onclick = ()=>{
    if(typeof openVault !== 'function') return;
    openVault(()=>{
      if(typeof loadReal === 'function')
        loadReal(true).then(()=>{ if(PANEL_OPEN && RENDER[PANEL_OPEN]) RENDER[PANEL_OPEN](); });
    });
  });
}
