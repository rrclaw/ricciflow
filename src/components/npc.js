/* ricciflow — NPC：化名角色 + 真实公开发言蒸馏

   规则一句话：**说的话是真的，说话的人是化名。**

   界面上只出现化名（老黄·黄仁训 / 山姆·奥特蛮 / 中鑫证券…）。真名与内资券商名
   在桥那侧就换成了化名，前端拿到的文本里不该再有真名 —— gate 会扫。

   每条发言带日期、出处（本机 KB 路径或 URL）、以及「一手 / 转述 / 卖方观点」标签。
   >90 天的不进对话池，只留在「历史立场」折叠区；全都过期就说他最近没公开表态，
   不拿旧话充数。

   两层人设分开标：
     · 一贯立场 —— 从长期表态归纳的骨架，写死在 roster 里，保证性格连贯
     · 最近说的 —— 当期真实引述，保证内容新
   不许把前者说成后者。 */

const NPC = {roster:null, one:{}, err:'', loading:false};

async function loadNpcRoster(force){
  if(NPC.roster && !force) return true;
  if(!realAuthed()){ NPC.err = '需要老板钥匙'; return false; }
  try{
    const d = await (await fetch(BRIDGE + '/api/npc?key=' + encodeURIComponent(VAULT.key),
      {signal:AbortSignal.timeout(40000)})).json();
    if(!d || !d.ok) throw new Error(d && d.error || '空响应');
    NPC.roster = d; NPC.err = '';
    return true;
  }catch(e){ NPC.err = String(e.message || e); return false; }
}

async function loadNpc(id){
  if(NPC.one[id]) return NPC.one[id];
  if(!realAuthed()) return null;
  try{
    const d = await (await fetch(BRIDGE + '/api/npc_one?id=' + encodeURIComponent(id) +
      '&key=' + encodeURIComponent(VAULT.key), {signal:AbortSignal.timeout(30000)})).json();
    if(!d || !d.ok) return null;
    NPC.one[id] = d;
    return d;
  }catch(e){ return null; }
}

const TIER_TAG = {fresh:['cyan','新'], old:['gold','稍旧'], archive:['','已归档']};
const KIND_TAG = {'一手':'gold', '转述':'', '卖方观点':'', '公开发言':'cyan'};

/* 走到 NPC 面前 → 弹他的引述卡。不是聊天窗，是一份带出处的摘录。 */
async function openNpcCard(id){
  if(!realAuthed()) return toast('NPC 的发言素材读自本机知识库，要老板钥匙');
  openModal(`<div class="win-bar" style="background:var(--teal)"><span>读取中…</span>
      <span class="dots" id="mClose" style="cursor:pointer">_ □ ×</span></div>
    <div style="padding:13px"><div class="t-sm">正在翻他最近说过什么…</div></div>`);
  $('#mClose').onclick = closeModal;
  const d = await loadNpc(id);
  if(!d){
    $('#modalBox').innerHTML = `<div class="win-bar" style="background:var(--coral)"><span>读不到</span>
      <span class="dots" id="mClose2" style="cursor:pointer">×</span></div>
      <div style="padding:13px"><div class="t-sm t-rose" style="font-weight:700">${NPC.err || '桥没返回'}</div></div>`;
    $('#mClose2').onclick = closeModal;
    return;
  }
  const q = x=>`<div class="gap-item">
      <div class="gt">
        <span class="tag ${KIND_TAG[x.kind] || ''}">${x.kind}</span>
        <span class="tag ${TIER_TAG[x.tier][0]}">${x.date} · ${x.age}天前</span>
      </div>
      <div class="why" style="color:var(--ink);line-height:1.8">${x.text}</div>
      <div class="why t-dim">${x.url
        ? '<a href="' + x.url + '" target="_blank" rel="noopener" style="color:var(--ink)">' + x.url + '</a>'
        : x.src || ''}</div>
    </div>`;
  $('#modalBox').innerHTML = `
    <div class="win-bar" style="background:var(--teal)">
      <span>${d.alias}</span><span class="sub">${d.org}</span>
      <span class="dots" id="mClose3" style="cursor:pointer">_ □ ×</span></div>
    <div style="padding:13px;max-height:76vh;overflow:auto">
      <div class="bridge" style="margin-bottom:10px">${d.note}</div>
      <div class="cap" style="margin-bottom:5px">一贯立场（归纳，不是他今天说的）</div>
      <div class="t-sm" style="font-weight:700;line-height:1.9;margin-bottom:11px">
        ${d.stance.map(s=> '· ' + s).join('<br>')}</div>
      <div class="cap" style="margin-bottom:5px">最近说的
        <span class="t-dim">${d.pool.length} 条 · 最新 ${d.latest || '—'}</span></div>
      ${d.silent
        ? `<div class="t-sm t-rose" style="font-weight:700;line-height:1.9">
            他最近没公开表态（本机素材里 90 天内没有）。<br>
            <span class="t-dim">这里不拿半年前的话充数。要新的就跑一次素材刷新例程。</span></div>`
        : d.pool.map(q).join('')}
      ${d.archive.length ? `<details style="margin-top:10px">
        <summary class="cap" style="cursor:pointer">历史立场（>90 天，${d.archive.length} 条）</summary>
        <div style="margin-top:6px">${d.archive.map(q).join('')}</div></details>` : ''}
      <div class="t-xs t-dim" style="font-weight:700;margin-top:10px;line-height:1.7">
        这里只做引述，不做对话。让他「回答你的提问」就必然要替他编话 ——
        那是伪造言论，不做。</div>
    </div>`;
  $('#mClose3').onclick = closeModal;
}

/* 地图上的 NPC 名录 */
async function openNpcRoster(){
  if(!realAuthed()) return toast('NPC 素材读自本机知识库，要老板钥匙');
  if(!NPC.roster) await loadNpcRoster();
  const R = NPC.roster;
  if(!R) return toast('读不到：' + NPC.err);
  openDrawer(`
    <div class="win-bar" style="background:var(--teal)"><span>圈内人</span>
      <span class="dots" id="dwClose" style="cursor:pointer">_ □ ×</span></div>
    <div style="padding:12px">
      <div class="bridge" style="margin-bottom:10px">${R.note}<br>
        <span class="t-dim">扫了最近 ${R.scanned} 份原始材料（${R.cutoff} 起）</span></div>
      ${R.npcs.map(n=>`
        <div class="gap-item" style="cursor:pointer" data-npc="${n.id}">
          <div class="gt"><span class="tag ${n.house ? '' : 'cyan'}">${n.house ? '卖方' : '人物'}</span>
            <b>${n.alias}</b> <span class="t-dim">${n.org}</span></div>
          <div class="why">${n.silent
            ? '<span class="t-rose">最近没公开表态</span>'
            : `可引 ${n.n_pool} 条 · 最新 ${n.latest}`}</div>
        </div>`).join('')}
      <div class="t-xs t-dim" style="font-weight:700;margin-top:9px;line-height:1.7">
        素材来自本机知识库；网页搜来的那部分要本地例程跑完落在
        <code>${R.local_dir}</code> 才会出现 —— 桥自己上不了网。</div>
    </div>`);
  $('#dwClose').onclick = closeDrawer;
  $$('[data-npc]').forEach(b=> b.onclick = ()=> openNpcCard(b.dataset.npc));
}
