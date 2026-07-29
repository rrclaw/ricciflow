/* ricciflow — 老板的手机
   三个 tab：通知推送 / 公司群 / 老板圈（其他私募老板私信）。
   HUD 常驻入口，未读角标。 */

DATA.phone = {
  news: [
    {t:'09:02', src:'财联社·推送', txt:'某存储原厂上调 Q4 合约价指引，涨幅高于市场预期', hot:true},
    {t:'08:00', src:'跟踪日报', txt:'数据中心外溢·今日 4 路更新：Boden 拿地过户完成', hot:false},
    {t:'07:45', src:'巨潮公告', txt:'你自选池 2 家公司披露中报预告（1 预增 1 预亏）', hot:true},
    {t:'昨日',  src:'系统', txt:'量化研究员的挖角 offer 已处理完毕', hot:false},
    {t:'昨日',  src:'search_alpha', txt:'「玻璃基板」机构搜索量周环比 +180%，进入观察名单', hot:false}
  ],
  group: [
    {who:'风控官', txt:'早。回撤闸昨日已解除，今日恢复正常仓位权限', me:false},
    {who:'Serenity', txt:'光刻胶二供的验证公告出了，比预期早两周。窄口论文复活条件触发其一 @老板', me:false},
    {who:'科技研究员', txt:'DXI 周涨幅 2.8%，还在阈值上方。晨会我更新', me:false},
    {who:'卷王实习生', txt:'各位老师早！今日 40 页公告摘要已放共享盘', me:false},
    {who:'老登股研究员', txt:'年轻人少发点消息，多看点现金流量表', me:false}
  ],
  bosses: [
    {id:'qiaoshui', from:'断桥资本 · 桥老板', thread:[
      ['ta','里奇流的老板，久仰。你们那个「冲突必须给桥」的规矩，跟我们家名字很配'],
      ['ta','下周有个宏观闭门会，来不来？就我们几家']],
     replies:['来。发我时间地点','最近盯盘走不开，下次一定','带上我家宏观研究员一起？'],
     comeback:'爽快。周四下午两点，金陆大酒店 3 楼。别带录音笔'},
    {id:'chengbao', from:'城堡量化 · 堡主', thread:[
      ['ta','你家量化研究员，3.2 倍的 offer 他都不来。你给他灌了什么迷魂汤'],
      ['ta','这样，我们交换一个思路：你们的搜索热度因子，换我们的微观结构课件']],
     replies:['他就吃「模拟仓额度」这一套','因子不换，饭可以吃','别惦记我员工了'],
     comeback:'行吧。反正你们那个 IC 我们复现出来比你们公布的低 0.02（笑）'},
    {id:'menghu', from:'猛虎基金 · Tiger', thread:[
      ['ta','听说你们在跟数据中心外溢北欧的线？我们也在看'],
      ['ta','交换情报？我们有 Boden 市政府的一手关系']],
     replies:['可以聊。先说你们要什么','T+2 就是共识了，不着急','约饭局，茶室见'],
     comeback:'茶室好。听说你们那还能掼蛋？带上你家 Serenity，三缺一'}
  ],
  unread: 3
};
DATA.agenda = [
  {time:'08:30', what:'晨会 · 定今日 3 条主线', done:true},
  {time:'10:00', what:'审 存储外溢深研票（反路演后降级版）', done:false},
  {time:'14:00', what:'金陆大酒店 · 上市公司策略会', done:false},
  {time:'16:30', what:'处理量化研究员挖角 offer（48h 倒计时）', done:false},
  {time:'23:00', what:'晚间复盘 + 明日预案', done:false}
];
let PHONE_TAB = 'news';
let PHONE_THREAD = null;

function phoneBadge(){
  const b = $('#phoneBadge');
  if(b) b.style.display = DATA.phone.unread > 0 ? 'grid' : 'none';
  if(b) b.textContent = DATA.phone.unread;
}

function openPhone(){
  DATA.phone.unread = 0;
  const ph = $('#phone');
  ph.classList.add('open');
  walkPause(true);
  renderPhone();
  phoneBadge();
}
function closePhone(){
  $('#phone').classList.remove('open');
  if(!PANEL_OPEN) walkPause(false);
}

function renderPhone(){
  const body = $('#phoneBody');
  $$('#phoneTabs .ph-tab').forEach(t=> t.classList.toggle('on', t.dataset.pt === PHONE_TAB));
  if(PHONE_TAB === 'news'){
    body.innerHTML = DATA.phone.news.map(n=>`
      <div class="ph-msg ${n.hot ? 'hot' : ''}">
        <div class="ph-meta"><span class="tag ${n.hot ? 'rose' : ''}">${n.src}</span> <span class="t-dim">${n.t}</span></div>
        ${n.txt}</div>`).join('');
  } else if(PHONE_TAB === 'todo'){
    // 老板日报 = 等你拍板的事 + 待办 + 日程，从研究台搬来
    body.innerHTML = (typeof renderDailyItems === 'function'
      ? '<div class="ph-msg" style="background:var(--cream2)"><b>等你拍板的事</b></div>' + renderDailyItems(false)
      : '<div class="ph-msg">日报加载中…</div>')
      + `<div class="ph-msg" style="background:var(--cream2);margin-top:8px"><b>今日日程</b></div>`
      + DATA.agenda.map(a=>`<div class="ph-msg ${a.done?'':'hot'}">
          <div class="ph-meta"><span class="tag ${a.done?'':'gold'}">${a.time}</span> ${a.done?'已完成':''}</div>${a.what}</div>`).join('');
    if(typeof bindDailyItems === 'function') bindDailyItems(body);
  } else if(PHONE_TAB === 'group'){
    body.innerHTML = DATA.phone.group.map(m=>`
      <div class="ph-msg ${m.me ? 'me' : ''}">
        <div class="ph-meta"><b>${m.who}</b></div>${m.txt}</div>`).join('') + `
      <div class="row" style="gap:5px;margin-top:8px">
        ${['收到','晨会见','@Serenity 复活就重开评审','都去干活'].map((q, i)=>
          `<button class="px-btn sm" data-phq="${i}" style="font-size:10px">${q}</button>`).join('')}
      </div>`;
    $$('#phoneBody [data-phq]').forEach(b=> b.onclick = ()=>{
      const txt = b.textContent;
      DATA.phone.group.push({who:'老板（你）', txt, me:true});
      renderPhone();
      setTimeout(()=>{
        DATA.phone.group.push({who:'卷王实习生', txt:'收到收到！', me:false});
        if(PHONE_TAB === 'group') renderPhone();
      }, 900);
    });
  } else {
    if(PHONE_THREAD){
      const th = DATA.phone.bosses.find(b=> b.id === PHONE_THREAD);
      body.innerHTML = `
        <button class="px-btn sm ghost" id="phBack">← 老板圈</button>
        <div class="ph-meta" style="margin:8px 0 6px"><b>${th.from}</b></div>` +
        th.thread.map(([w, t])=>`
          <div class="ph-msg ${w === 'me' ? 'me' : ''}">${t}</div>`).join('') +
        (th.replied ? '' : `<div class="col" style="gap:5px;margin-top:8px">
          ${th.replies.map((r, i)=>`<button class="px-btn sm" data-phr="${i}" style="text-align:left">「${r}」</button>`).join('')}
        </div>`);
      $('#phBack').onclick = ()=>{ PHONE_THREAD = null; renderPhone(); };
      $$('#phoneBody [data-phr]').forEach(b=> b.onclick = ()=>{
        th.thread.push(['me', th.replies[+b.dataset.phr]]);
        th.replied = true;
        renderPhone();
        setTimeout(()=>{
          th.thread.push(['ta', th.comeback]);
          if(PHONE_TAB === 'bosses' && PHONE_THREAD === th.id) renderPhone();
          if(typeof pushDaily === 'function')
            pushDaily('intel', `老板圈：${th.from.split(' ')[0]} 回复了你（手机可查）`);
        }, 1100);
      });
    } else {
      body.innerHTML = DATA.phone.bosses.map(b=>`
        <div class="ph-msg" style="cursor:pointer" data-pht="${b.id}">
          <div class="ph-meta"><b>${b.from}</b> <span class="t-dim">${b.replied ? '' : '● 新'}</span></div>
          <span class="t-dim">${b.thread[b.thread.length-1][1].slice(0, 26)}…</span></div>`).join('');
      $$('#phoneBody [data-pht]').forEach(el2=> el2.onclick = ()=>{
        PHONE_THREAD = el2.dataset.pht; renderPhone();
      });
    }
  }
}

/* 手机壳 DOM（一次性注入） */
(function initPhone(){
  document.body.insertAdjacentHTML('beforeend', `
    <div class="phone" id="phone">
      <div class="ph-frame">
        <div class="ph-status"><span id="phClock"></span><span>里奇流 5G · 100%</span>
          <span class="dots" id="phClose" style="cursor:pointer">×</span></div>
        <div class="ph-tabs" id="phoneTabs">
          <button class="ph-tab on" data-pt="news">通知</button>
          <button class="ph-tab" data-pt="todo">待办</button>
          <button class="ph-tab" data-pt="group">公司群</button>
          <button class="ph-tab" data-pt="bosses">老板圈</button>
        </div>
        <div class="ph-body" id="phoneBody"></div>
      </div>
    </div>`);
  $('#phClose').onclick = closePhone;
  $$('#phoneTabs .ph-tab').forEach(t=> t.onclick = ()=>{
    PHONE_TAB = t.dataset.pt; PHONE_THREAD = null; renderPhone();
  });
  const tick = ()=>{ const d = new Date();
    const el2 = $('#phClock');
    if(el2) el2.textContent = String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0'); };
  tick(); setInterval(tick, 20000);
})();
