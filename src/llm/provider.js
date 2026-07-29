/* ricciflow — LLM 接入层：自配 provider + API key，剧本模式 ⇄ 实时模式
   Anthropic 支持浏览器直连（CORS header）；其余走 OpenAI 兼容 chat/completions。
   key 只存 localStorage，永不出现在代码库。 */

const LLM_PRESETS = {
  anthropic: {n:'Anthropic', baseURL:'https://api.anthropic.com', model:'claude-sonnet-5'},
  deepseek:  {n:'DeepSeek',  baseURL:'https://api.deepseek.com',  model:'deepseek-chat'},
  openai:    {n:'OpenAI 兼容', baseURL:'https://api.openai.com',   model:'gpt-5.2'},
  custom:    {n:'自定义 baseURL', baseURL:'', model:''}
};

let LLM_CFG = JSON.parse(localStorage.getItem('rf_llm') || 'null') ||
  {provider:'anthropic', baseURL:LLM_PRESETS.anthropic.baseURL, model:LLM_PRESETS.anthropic.model, key:''};
window.LLM_LIVE = !!(localStorage.getItem('rf_llm_live') === '1' && LLM_CFG.key);

function saveLLM(){
  localStorage.setItem('rf_llm', JSON.stringify(LLM_CFG));
  localStorage.setItem('rf_llm_live', window.LLM_LIVE ? '1' : '0');
}

async function llmAsk(userText, systemText){
  if(!LLM_CFG.key) throw new Error('没配 API key');
  if(LLM_CFG.provider === 'anthropic'){
    const res = await fetch(LLM_CFG.baseURL + '/v1/messages', {
      method:'POST',
      headers:{
        'content-type':'application/json',
        'x-api-key': LLM_CFG.key,
        'anthropic-version':'2023-06-01',
        'anthropic-dangerous-direct-browser-access':'true'
      },
      body: JSON.stringify({model: LLM_CFG.model, max_tokens: 700,
        system: systemText, messages:[{role:'user', content:userText}]})
    });
    if(!res.ok) throw new Error('HTTP ' + res.status);
    const j = await res.json();
    return j.content.map(c=>c.text || '').join('');
  }
  /* OpenAI 兼容 */
  const res = await fetch(LLM_CFG.baseURL + '/v1/chat/completions', {
    method:'POST',
    headers:{'content-type':'application/json', 'authorization':'Bearer ' + LLM_CFG.key},
    body: JSON.stringify({model: LLM_CFG.model,
      messages:[{role:'system', content:systemText},{role:'user', content:userText}]})
  });
  if(!res.ok) throw new Error('HTTP ' + res.status);
  const j = await res.json();
  return j.choices[0].message.content;
}

/* 设置抽屉里的配置块（settings.js 调用） */
function llmConfigHTML(){
  return `
    <div class="field"><label>PROVIDER</label>
      <div class="opts">${Object.entries(LLM_PRESETS).map(([k,v])=>
        `<div class="opt ${LLM_CFG.provider===k?'on':''}" data-llm-p="${k}">${v.n}</div>`).join('')}</div></div>
    <div class="field"><label>BASE URL</label>
      <input class="inp" id="llmBase" value="${LLM_CFG.baseURL}"></div>
    <div class="field"><label>MODEL</label>
      <input class="inp" id="llmModel" value="${LLM_CFG.model}"></div>
    <div class="field"><label>API KEY（只存本机 localStorage）</label>
      <input class="inp" id="llmKey" type="password" placeholder="${LLM_CFG.key ? '已保存 · ' + LLM_CFG.key.slice(0,6) + '****' : '粘贴你的 key'}"></div>
    <div class="row" style="gap:6px">
      <button class="px-btn sm ${!window.LLM_LIVE?'on':''}" data-llm-mode="0">剧本模式</button>
      <button class="px-btn sm ${window.LLM_LIVE?'on':''}" data-llm-mode="1">实时模式</button>
      <span class="sp"></span>
      <button class="px-btn sm" id="llmSave">保存</button>
    </div>
    <div class="t-xs t-dim" style="font-weight:700;margin-top:6px;line-height:1.7" id="llmHint">
      实时模式下，研究对话框真调大模型。没 key 会自动回落剧本，不报错。</div>`;
}
function bindLLMConfig(root){
  $$('[data-llm-p]', root).forEach(o=> o.onclick = ()=>{
    LLM_CFG.provider = o.dataset.llmP;
    const p = LLM_PRESETS[LLM_CFG.provider];
    LLM_CFG.baseURL = p.baseURL; LLM_CFG.model = p.model;
    saveLLM(); RENDER.sys();
  });
  $$('[data-llm-mode]', root).forEach(o=> o.onclick = ()=>{
    const want = o.dataset.llmMode === '1';
    if(want && !LLM_CFG.key){
      $('#llmHint').innerHTML = '<span class="t-rose">还没配 key。先粘贴 API key 再开实时。当前继续用剧本模式。</span>';
      return;
    }
    window.LLM_LIVE = want; saveLLM(); RENDER.sys();
  });
  $('#llmSave', root).onclick = ()=>{
    LLM_CFG.baseURL = $('#llmBase').value.trim();
    LLM_CFG.model = $('#llmModel').value.trim();
    const k = $('#llmKey').value.trim();
    if(k) LLM_CFG.key = k;
    saveLLM(); toast('LLM 配置已保存（仅本机）');
  };
}

/* ==========================================================================
   每研究员独立大脑：各配各的 provider/key，没配的回落公司公共配置
   ========================================================================== */
function rLLMGet(id){
  return JSON.parse(localStorage.getItem('rf_llm_r_' + id) || 'null');
}
function rLLMSave(id, cfg){
  if(cfg) localStorage.setItem('rf_llm_r_' + id, JSON.stringify(cfg));
  else localStorage.removeItem('rf_llm_r_' + id);
}
async function llmAskFor(researcherId, userText, systemText){
  const own = rLLMGet(researcherId);
  if(own && own.key){
    const saved = {...LLM_CFG};
    Object.assign(LLM_CFG, own);
    try { return await llmAsk(userText, systemText); }
    finally { Object.assign(LLM_CFG, saved); }
  }
  return llmAsk(userText, systemText);   /* 回落公司公共大脑 */
}
function rLLMConfigHTML(id){
  const own = rLLMGet(id) || {provider:'anthropic', baseURL:LLM_PRESETS.anthropic.baseURL,
    model:LLM_PRESETS.anthropic.model, key:''};
  return `
    <div class="t-xs t-dim" style="font-weight:700;line-height:1.7;margin-bottom:8px">
      不配 = 用「系统」里的公司公共大脑。配了 = 这位研究员自带大脑，实时模式对话走他自己的 key。</div>
    <div class="field"><label>PROVIDER</label>
      <div class="opts">${Object.entries(LLM_PRESETS).map(([k, v])=>
        `<div class="opt ${own.provider === k ? 'on' : ''}" data-rllm-p="${k}">${v.n}</div>`).join('')}</div></div>
    <div class="field"><label>MODEL</label>
      <input class="inp" id="rllmModel" value="${own.model || ''}"></div>
    <div class="field"><label>BASE URL</label>
      <input class="inp" id="rllmBase" value="${own.baseURL || ''}"></div>
    <div class="field"><label>API KEY（只存本机）</label>
      <input class="inp" id="rllmKey" type="password"
        placeholder="${own.key ? '已保存 · ' + own.key.slice(0, 6) + '****' : '粘贴这位研究员专属的 key'}"></div>
    <div class="row" style="gap:6px">
      <button class="px-btn sm on" id="rllmSave">保存专属大脑</button>
      <button class="px-btn sm ghost danger" id="rllmClear">拆除 · 回公司大脑</button>
    </div>`;
}
function bindRLLMConfig(id, refresh){
  let sel = (rLLMGet(id) || {}).provider || 'anthropic';
  $$('#panelBody [data-rllm-p]').forEach(o=> o.onclick = ()=>{
    sel = o.dataset.rllmP;
    $$('#panelBody [data-rllm-p]').forEach(x=> x.classList.toggle('on', x === o));
    const p = LLM_PRESETS[sel];
    $('#rllmModel').value = p.model; $('#rllmBase').value = p.baseURL;
  });
  $('#rllmSave').onclick = ()=>{
    const prev = rLLMGet(id) || {};
    const k = $('#rllmKey').value.trim();
    rLLMSave(id, {provider:sel, model:$('#rllmModel').value.trim(),
      baseURL:$('#rllmBase').value.trim(), key: k || prev.key || ''});
    toast('已保存：他现在用自己的脑子了');
    if(refresh) refresh();
  };
  $('#rllmClear').onclick = ()=>{
    rLLMSave(id, null);
    toast('已拆除：回公司公共大脑');
    if(refresh) refresh();
  };
}
