/* ricciflow — INQUIRY 提问台（真实蒸馏）
   接 kb-bridge /api/inquiry → 从本地券商/公司/AceCamp纪要问答里蒸馏真实专家问题
   分七层：现状/产能/良率/价格/竞争/边际/证伪。不会问时照着问，补盲、延展。 */

const INQ_LAYER_COLOR = {现状定位:'sky', 产能供给:'teal', 良率技术:'mustard',
  价格盈利:'coral', 竞争格局:'pink', 边际变化:'teal', 证伪风险:'coral'};

async function openInquiry(theme){
  if(!vaultUnlocked()){
    toast('提问库读的是内部纪要，需要老板钥匙。去保险库开锁');
    if(typeof openVault === 'function') openVault(()=> openInquiry(theme));
    return;
  }
  openModal(`
    <div class="win-bar" style="background:var(--mustard);color:var(--ink)">
      <span>提问台 · 抽丝剥茧地问「${theme}」</span>
      <span class="dots" id="mClose" style="cursor:pointer">_ □ ×</span></div>
    <div style="padding:13px;max-height:76vh;overflow-y:auto" id="inqBody">
      <div class="t-dim" style="font-weight:700">从纪要问答里蒸馏专家真实问过的问题…</div>
    </div>`);
  $('#mClose').onclick = closeModal;
  let d = null;
  try {
    const qs = new URLSearchParams({theme, key: VAULT.key});
    d = await (await fetch(BRIDGE + '/api/inquiry?' + qs, {signal:AbortSignal.timeout(8000)})).json();
  } catch(e){}
  const body = $('#inqBody');
  if(!d || !d.ok){
    body.innerHTML = `<div class="bridge">提问库暂时读不到（本地桥未运行或话题为空）。
      跑起 kb-bridge 后，这里会是从你 1000+ 条真实纪要问答里蒸馏的专业追问。</div>`;
    return;
  }
  body.innerHTML = `
    <div class="row" style="margin-bottom:9px">
      <span class="tag cyan">🟢 ${d.thin_topic?'话题偏新':'命中 '+d.total_hits+' 条真实问题'}</span>
      <span class="t-xs t-dim" style="font-weight:700">语料 ${d.corpus} 条 · 券商/公司/AceCamp 纪要问答</span></div>
    <div class="saybox" style="margin-bottom:11px">${d.opener}</div>
    ${d.thin_topic?`<div class="bridge" style="margin-bottom:11px">
      ⚡ 语料里专家还没怎么问过「${theme}」——<b>这可能意味着你抓到了更早的萌芽</b>。
      下面是万能起手七问，先照这个框架搭起来。</div>`:''}
    ${d.layers.map((L, i)=>`
      <div style="margin-bottom:11px">
        <div class="row" style="margin-bottom:5px">
          <span class="tag ${INQ_LAYER_COLOR[L.layer]||''}">第${i+1}层 · ${L.layer}</span>
          <span class="t-xs t-dim" style="font-weight:700">${L.hint}</span></div>
        ${L.questions.map(q=>`
          <div class="gap-item" style="margin-bottom:5px">
            <div class="why" style="color:var(--ink);font-size:11.5px">${q.q}</div>
            <div class="row" style="gap:5px;margin-top:3px">
              <span class="tag ${q.generic?'':'gold'}" style="font-size:9px">${q.src}</span>
              ${q.title?`<span class="t-xs t-dim" style="font-weight:700">← ${q.title}</span>`:''}
              <span class="sp"></span>
              <button class="px-btn sm ghost" data-inq-use="${encodeURIComponent(q.q)}">▸ 用它追问</button>
            </div>
          </div>`).join('')}
      </div>`).join('')}
    <div class="t-xs t-dim" style="font-weight:700;line-height:1.7;margin-top:6px">
      这些不是模板，是真人在调研里问过的问题。带 <span class="tag gold" style="font-size:9px">来源</span> 的是原话，
      <span class="tag" style="font-size:9px">通用起手式</span> 的是话题太新时的框架。照着问，补盲又延展。</div>`;
  $$('[data-inq-use]').forEach(b=> b.onclick = ()=>{
    const q = decodeURIComponent(b.dataset.inqUse);
    /* 若研究对话框开着，填进去；否则复制提示 */
    const ci = $('#chatInput');
    if(ci){ ci.value = q; closeModal(); toast('已填入研究对话框，点发问'); }
    else { navigator.clipboard && navigator.clipboard.writeText(q); toast('问题已复制'); }
  });
}
