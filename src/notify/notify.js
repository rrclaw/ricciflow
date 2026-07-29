/* ricciflow — 通知层：浏览器系统通知（真）+ 外部渠道配置（UI，投产走 Worker 中继）*/

let NOTIFY_CFG = JSON.parse(localStorage.getItem('rf_notify') || 'null') ||
  {browser:true, feishu:'', email:'', whatsapp:''};
function saveNotify(){ localStorage.setItem('rf_notify', JSON.stringify(NOTIFY_CFG)); }

function notifyBoss(title, body){
  if(!NOTIFY_CFG.browser || !('Notification' in window)) return;
  if(Notification.permission === 'granted'){
    new Notification(title, {body, icon:'assets/icon.svg'});
  } else if(Notification.permission !== 'denied'){
    Notification.requestPermission().then(p=>{
      if(p === 'granted') new Notification(title, {body, icon:'assets/icon.svg'});
    });
  }
}

function renderChannelChips(root){
  if(!root) return;
  root.innerHTML = `
    <div class="gap-item"><div class="gt">通知栏推送 <span class="tag ${NOTIFY_CFG.browser?'cyan':''}">${NOTIFY_CFG.browser?'ON':'OFF'}</span></div>
      <div class="why">浏览器系统通知，重要事件（挖角 offer / 拦截）直接弹</div></div>
    <div class="gap-item"><div class="gt">飞书 <span class="tag">${NOTIFY_CFG.feishu?'已配 webhook':'未配'}</span></div>
      <div class="why">浏览器 CORS 发不出去，投产走 Cloudflare Worker 中继</div></div>
    <div class="gap-item"><div class="gt">邮件 / WhatsApp <span class="tag">规划中</span></div>
      <div class="why">同上，中继统一转发。见 docs/roadmap.md</div></div>`;
}

function notifyConfigHTML(){
  return `
    <div class="field"><label>浏览器通知</label>
      <div class="opts">
        <div class="opt ${NOTIFY_CFG.browser?'on':''}" data-nf="on">开（会请求权限）</div>
        <div class="opt ${!NOTIFY_CFG.browser?'on':''}" data-nf="off">关</div>
        <button class="px-btn sm" id="nfTest">发条测试通知</button>
      </div></div>
    <div class="field"><label>飞书 webhook（投产用，先存着）</label>
      <input class="inp" id="nfFeishu" value="${NOTIFY_CFG.feishu}" placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/…"></div>
    <div class="field"><label>邮件</label>
      <input class="inp" id="nfEmail" value="${NOTIFY_CFG.email}" placeholder="boss@ricciflow.fund"></div>
    <div class="field"><label>WhatsApp</label>
      <input class="inp" id="nfWa" value="${NOTIFY_CFG.whatsapp}" placeholder="+86…"></div>
    <button class="px-btn sm" id="nfSave">保存渠道</button>
    <div class="t-xs t-dim" style="font-weight:700;margin-top:6px;line-height:1.7">
      浏览器直发受 CORS 限制，外部渠道在投产阶段经一个 Cloudflare Worker 中继真发。demo 只有通知栏是真的。</div>`;
}
function bindNotifyConfig(root){
  $$('[data-nf]', root).forEach(o=> o.onclick = ()=>{
    NOTIFY_CFG.browser = o.dataset.nf === 'on';
    if(NOTIFY_CFG.browser && 'Notification' in window) Notification.requestPermission();
    saveNotify(); RENDER.sys();
  });
  $('#nfTest', root).onclick = ()=> notifyBoss('里奇流资本', '测试：这就是重要事件弹出来的样子。曲率即命运。');
  $('#nfSave', root).onclick = ()=>{
    NOTIFY_CFG.feishu = $('#nfFeishu').value.trim();
    NOTIFY_CFG.email = $('#nfEmail').value.trim();
    NOTIFY_CFG.whatsapp = $('#nfWa').value.trim();
    saveNotify(); toast('渠道已保存');
  };
}
