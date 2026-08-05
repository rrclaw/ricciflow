/* ricciflow — 日报数据加载器（组件已并入档案室）

   「日报」这一屏原来既放 summary 正文、又放待办，还和老板手机重复。已拆开：
     · 档案室 archive.js —— 全量留痕按日期归档 + 当日 summary 正文
     · 老板手机 phone.js —— 只看最新一天
   这里只保留取数：summary 原文与各账本待办，两边共用同一份，不各算一套。 */

const BRIEF = {data:null, err:'', loading:false};

async function loadBriefing(force){
  if(BRIEF.loading) return !!BRIEF.data;
  if(BRIEF.data && !force) return true;
  if(!realAuthed()){ BRIEF.err = '需要老板钥匙'; return false; }
  BRIEF.loading = true;
  try{
    const d = await (await fetch(BRIDGE + '/api/briefing?key=' + encodeURIComponent(VAULT.key),
      {signal:AbortSignal.timeout(30000)})).json();
    if(!d || !d.summary) throw new Error(d && d.error || '空响应');
    BRIEF.data = d; BRIEF.err = '';
  }catch(e){ BRIEF.err = String(e.message || e); BRIEF.data = null; }
  finally{ BRIEF.loading = false; }
  return !!BRIEF.data;
}
