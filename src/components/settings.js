/* ricciflow — 组件: 系统/纪律红线
   加载方式: 传统 <script> 顺序加载（零构建、file:// 可直开）。
   模块间通过顶层声明共享（var/function 提升到全局作用域）。 */

/* ==========================================================================
   SECTION 16 — 系统
   纪律红线只读展示：这些不是可配置项，是硬编码。
   ========================================================================== */
const REDLINES = [
  {k:'A股名外发英文化', d:'外发内容里 A 股公司名自动换英文 / 拼音。机构中文付费交付除外。'},
  {k:'不暴露内资券商名', d:'任何外发物不出现内资券商署名。'},
  {k:'付费源永不外露', d:'高临 / 久谦 / AceCamp / 进门财经 可入库可内部引用，外发一律剥名。'},
  {k:'受限题材秒拒', d:'触及国家利益的题材在选题阶段直接拒绝，不进入生产管线。'},
  {k:'对立判断必须给桥', d:'任何冲突结论都要写明「什么数据出来能判谁对」，否则不许进纪要。'},
  {k:'战绩数字不可外发', d:'本 demo 的等级 / 命中率是编造值，永不进入任何对外材料。'}
];

RENDER.sys = function(){
  const scr = $('#scr-sys');
  scr.innerHTML = `
    <div class="screen-head">
      <h1>SETTINGS</h1>
      <span class="sub">系统 · 能关的和不能关的</span>
    </div>
    <div class="grid" style="grid-template-columns:1fr 1fr 1fr">
      <div class="col">
        ${win('LLM 接入 · 自带钥匙', llmConfigHTML(), {color:'teal', sub:'key 只存本机'})}
        ${win('通知渠道', notifyConfigHTML(), {color:'sky', sub:'重要事件推到真实世界'})}
      </div>
      ${win('纪律红线 · 只读', REDLINES.map(r=>`
        <div class="redline">
          <div class="txt">${r.k}<small>${r.d}</small></div>
          <div class="sw" title="硬编码，关不掉"><i></i></div>
        </div>`).join('') + `<div class="t-xs t-dim" style="line-height:1.65;font-weight:700">
        这些开关画出来是让你知道它们存在，不是让你关的。<br>
        真实系统里它们是代码闸：违反就 raise，不是提醒。</div>`, {color:'coral'})}
      <div class="col">
        ${win('装修模式 · 组件启停', `
          <div class="t-xs t-dim" style="font-weight:700;margin-bottom:8px;line-height:1.7">
            关掉的组件：办公室家具变灰、HUD 图标消失、热点失效。像卖家具，但可以随时买回来。</div>
          <div id="decorList"></div>`, {color:'pink'})}
        ${win('这个 demo 是什么', `
          <div class="t-sm" style="line-height:1.85">
            这是<b>产品形态验证</b>，不是能用的系统。<br><br>
            四层结构：<br>
            <span class="tag cyan">数据源</span> 决定你能看到什么<br>
            <span class="tag cyan">知识库</span> 决定你<b>知道</b>什么、以及<b>不知道</b>什么<br>
            <span class="tag cyan">研究员</span> 决定同一份材料被怎么解读<br>
            <span class="tag cyan">场景</span> 决定这些解读怎么碰撞成一个决定<br><br>
            <span class="t-dim">缺口能派单、冲突必须给桥、风控能一票降级 —— 这三处是这个 demo 真正想验证的东西，其余都是壳。</span>
          </div>`, {color:'teal'})}
        ${win('演示数据说明', `
          <div class="t-sm" style="line-height:1.8">
            <b>真的：</b>源名、研究员原型、产业链环节名、流程节点。<br>
            <b>假的：</b>所有数字。篇数、置信度、等级、命中率、回撤、条数，全是编的。<br><br>
            <span class="t-rose"><b>为什么要强调：</b></span><span class="t-dim">
            伪造的命中率看久了会变成心里的锚。回测禁未来函数、验证要 ≥6 个月窗口 —— demo 不能偷偷破这条。</span>
          </div>
          <button class="px-btn danger dotted" style="width:100%;margin-top:11px" id="btnReset">↺ 重置 demo 状态</button>`,
          {color:'mustard'})}
      </div>
    </div>`;
  $('#btnReset').onclick = ()=>{
    localStorage.removeItem('rf_llm'); localStorage.removeItem('rf_llm_live');
    localStorage.removeItem('rf_notify'); localStorage.removeItem('rf_theme');
    location.reload();
  };
  bindLLMConfig(scr);
  bindNotifyConfig(scr);
  drawDecorList();
};

/* 装修模式：组件启停联动（家具变灰 + HUD 图标隐藏） */
function drawDecorList(){
  const box = $('#decorList'); if(!box) return;
  box.innerHTML = COMPONENTS.map(c=>`
    <div class="redline">
      <div class="txt">${c.icon} ${c.n}<small>家具：${c.furn || '—'}</small></div>
      <button class="px-btn sm ${c.enabled?'on':''}" data-decor="${c.id}">${c.enabled?'启用中':'已停用'}</button>
    </div>`).join('');
  $$('[data-decor]').forEach(b=> b.onclick = ()=>{
    const c = compById(b.dataset.decor);
    if(c.id === 'settings'){ toast('系统组件不能拆，不然你怎么把它开回来'); return; }
    c.enabled = !c.enabled;
    drawHUD(); drawDecorList();
    if(typeof WALK !== 'undefined' && WALK.room && GAME.location === 'office')
      WALK.base = renderRoomBase(WALK.room, WALK.hour, WALK.plantFrame);
    toast(c.enabled ? `已启用「${c.n}」，家具归位` : `已停用「${c.n}」，家具打包变灰`);
  });
}

/* @@APPEND@@ */

