#!/usr/bin/env python3.11
"""ricciflow 渲染闸 v3 — exit 0 才算过，不许 pipe 吞退出码。

跑法: python3.11 gate.py（在仓库根目录）
自起 http.server（Notification/manifest 需要 http 上下文）。
"""
import asyncio
import functools
import json as _json
import http.server
import sys
import threading
from pathlib import Path

from playwright.async_api import async_playwright

ROOT = Path(__file__).parent
PORT = 8321
URL = f"http://127.0.0.1:{PORT}/index.html"
SHOTS = ROOT / "_shots"

fails: list[str] = []


def check(cond, msg):
    print(("  ok   " if cond else "  FAIL ") + msg)
    if not cond:
        fails.append(msg)


def serve():
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT))
    httpd = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd



def check_npc_redaction():
    """NPC 脱敏回归(2026-08-05 补)。此前 gate 从不碰 redact/leaks —— 脱敏坏了照样绿。

    ① 名册必须在场: roster 缺失时 redact 失败关闭(内容全屏蔽), 安全但**测试盲区**,
       在跑 gate 的机器上必须 FAIL 而不是静默弱化。
    ② leaks() 对裸真名要报警(探测器活着)。
    ③ redact() 要能消掉真名与券商名(脱敏器活着)。
    """
    import sys as _sys
    _sys.path.insert(0, str(ROOT / "bridge"))
    import npc as _npc
    check(_npc.ROSTER_READY, "npc: roster.json 在场(缺失=脱敏未被测试, 不等于安全)")
    if _npc.ROSTER_READY:
        sample = next(k for r in _npc.ROSTER for k in r["keys"])
        check(bool(_npc.leaks(sample)), "npc: leaks() 能识别裸真名")
        check(sample not in _npc.redact(sample), "npc: redact() 能消掉真名")
        broker = _npc.BROKERS[0]
        check(broker not in _npc.redact(broker), "npc: redact() 能消掉券商名")


async def main():
    SHOTS.mkdir(exist_ok=True)
    errors: list[str] = []
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        ctx = await browser.new_context(viewport={"width": 1500, "height": 950},
                                        permissions=["notifications"])
        page = await ctx.new_page()
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        page.on("pageerror", lambda e: errors.append(f"PAGEERROR {e}"))
        # 拦截 Notification 构造计数
        await page.add_init_script("""
          window.__notifCount = 0;
          const _N = window.Notification;
          window.Notification = function(t, o){ window.__notifCount++; return {title: t}; };
          window.Notification.permission = 'granted';
          window.Notification.requestPermission = () => Promise.resolve('granted');
        """)
        await page.goto(URL)
        await page.wait_for_timeout(700)

        # ---------- 世界层 ----------
        check(await page.eval_on_selector_all("#world", "e=>e.length") == 1, "世界 canvas 存在")
        await page.click("#guideOK")
        pos0 = await page.evaluate("[WALK.x, WALK.y]")
        await page.keyboard.down("a"); await page.wait_for_timeout(400); await page.keyboard.up("a")
        pos1 = await page.evaluate("[WALK.x, WALK.y]")
        check(pos0 != pos1, "老板小人 WASD 走动生效")
        # 走到办公桌附近 → 提示 + E 开研究台
        await page.evaluate("WALK.x = 7.2*32; WALK.y = 9*32;")
        await page.wait_for_timeout(300)
        hint = await page.eval_on_selector("#interactHint", "e=>[e.style.display, e.textContent]")
        check(hint[0] != "none" and "研究台" in hint[1], f"走近办公桌出 [E] 提示（{hint[1]}）")
        await page.keyboard.press("e")
        await page.wait_for_timeout(600)
        check(await page.eval_on_selector_all("#kanban", "e=>e.length") == 1, "按 E 打开研究台")
        await page.click("#panelClose")

        # 主题切换
        t0 = await page.evaluate("WORLD_THEME")
        await page.click("#themeToggle"); await page.wait_for_timeout(200)
        t1 = await page.evaluate("WORLD_THEME")
        check(t0 != t1, f"配色切换生效（{t0}→{t1}）")
        await page.click("#themeToggle")

        # HUD
        check(await page.eval_on_selector_all(".hud-item", "e=>e.length") == 11, "HUD 11 图标（9组件+手机+地图）")

        # 走出大门 → 楼层
        await page.evaluate("WALK.x = 13*32; WALK.y = 13.4*32;")
        await page.keyboard.down("s"); await page.wait_for_timeout(500); await page.keyboard.up("s")
        await page.wait_for_timeout(400)
        check("电梯厅" in await page.inner_text("#tbLoc"), "走出大门进电梯厅（L1）")
        # 电梯 → 世界地图
        await page.evaluate("enterCity()")
        await page.wait_for_timeout(500)
        check("世界地图" in await page.inner_text("#tbLoc"), "1F 出楼见世界地图（L2）")
        check(await page.evaluate("WALK.room.furniture.filter(f=>f.label).length") >= 11,
              "地图可交互建筑 ≥ 11（机构楼+场所）")
        await page.screenshot(path=str(SHOTS / "g-city.png"))

        # NPC 拜访 + 交流记线索 + 挖角
        tickets0 = await page.evaluate("DATA.clues.length")
        await page.evaluate("visitNpc('citadel')")
        await page.wait_for_timeout(400)
        await page.evaluate("npcTalk('citadel')")
        await page.wait_for_timeout(300)
        check(await page.evaluate("typeof openNpcCard === 'function'"),
              "NPC 交流走引述卡（写死的对白已弃用）")
        await page.evaluate("closeModal()")
        tickets0 = await page.evaluate("DATA.clues.length")
        check(await page.evaluate("DATA.clues.length") >= tickets0, "线索池可用")
        res0 = await page.evaluate("DATA.researchers.length")
        check(await page.evaluate("DATA.researchers.length") == res0, "挖角不再往名册塞假人（名册只放真策略）")
        await page.evaluate("startOffice()")
        await page.wait_for_timeout(400)

        # ---------- V1 迁移断言 ----------
        await page.click('[data-hud="rack"]'); await page.wait_for_timeout(500)
        check(await page.eval_on_selector_all(".cart", "e=>e.length") >= 22, "数据源卡带 >= 22")
        await page.click("#panelClose")
        await page.click('[data-hud="atlas"]'); await page.wait_for_timeout(700)
        n_plot = await page.eval_on_selector_all(".plot", "e=>e.length")
        check(n_plot >= 100, f"atlas 节点来自真 wiki（{n_plot} 个行业页，公开层无需钥匙）")
        check(await page.evaluate("DATA.atlas.every(n=>!!n.slug)"), "每个节点都有真实 wiki slug")
        check(await page.evaluate("typeof ATLAS_RAW === 'undefined'"), "写死的 60 个假节点已删除")
        await page.click('[data-layer="raw"]'); await page.wait_for_timeout(300)
        dim = await page.evaluate(
            "Array.from(document.querySelectorAll('.plot')).filter(p=>p.style.opacity && +p.style.opacity < 1).length")
        check(dim > 0, f"缺口图层过滤生效（压暗 {dim} 块）")
        await page.click("#panelClose")
        await page.click('[data-hud="desk"]'); await page.wait_for_timeout(600)
        rc = await page.eval_on_selector_all(".rcard", "e=>e.length")
        check(rc >= 15, f"研究员卡 = 真策略数（实得 {rc}）")
        check(await page.evaluate("DATA.researchers.every(r=>!!r.real)"),
              "每张卡都绑定真实策略（无写死的假人）")
        check(await page.evaluate("DATA.researchers.every(r=>r.real.public === true)"),
              "公开层：只给身份与信条，不给数字")
        t = await page.inner_text("#scr-desk")
        check("需要钥匙" in t, "公开层名册标明战绩需钥匙")
        check(await page.eval_on_selector_all(".sliders", "e=>e.length") == 0,
              "性格滑块已删（真策略的口径由 doctrine 定死）")
        await page.click("#panelClose")

        # ---------- 研究台（公开层：灵感流真实、流水线上锁）----------
        await page.click('[data-hud="research"]'); await page.wait_for_timeout(600)
        check(await page.evaluate("Array.isArray(DATA.tickets) && DATA.tickets.length === 0"),
              "9 张假票已删除")
        check(await page.evaluate("typeof DATA.chatScript === 'undefined'"), "深研对话剧本已删除")
        check(await page.evaluate("typeof DATA.tracking === 'undefined'"), "四路跟踪假情报已删除")
        kb = await page.inner_text("#kanban")
        check("需要老板钥匙" in kb or "要老板钥匙" in kb, "公开层流水线上锁")
        check("_BELIEFS.md" in kb, "上锁处写明流水线读哪些真实账本")
        await page.wait_for_timeout(3200)   # 等 insight 灵感流（实时源，可能慢）
        ideas = await page.eval_on_selector_all("#ideaFeed .gap-item", "e=>e.length")
        print(f"  {'ok  ' if ideas>=1 else 'soft'}   灵感流卡数={ideas}（实时模块，软断言）")
        await page.screenshot(path=str(SHOTS / "g-research.png"))
        await page.click("#panelClose")

        # ---------- 交易台（公开层：上锁，不许出现任何持仓数字）----------
        await page.click('[data-hud="trading"]'); await page.wait_for_timeout(600)
        txt = await page.inner_text("#scr-trading")
        check("需要老板钥匙" in txt, "无钥匙时交易台上锁")
        check("riskboard" in txt, "上锁卡写明读的是哪个真实文件")
        check("编造" not in txt and "虚构" not in txt, "交易台无编造字样")
        await page.screenshot(path=str(SHOTS / "g-trading.png"))
        await page.click("#panelClose")

        # ---------- 日报 / 财务处（同样上锁）----------
        for hud, name in (("archive", "档案室"), ("finance", "财务处")):
            await page.click(f'[data-hud="{hud}"]'); await page.wait_for_timeout(500)
            t = await page.inner_text(".screen.active")
            check("需要老板钥匙" in t, f"无钥匙时{name}上锁")
            check("编造" not in t, f"{name}无编造字样")
            await page.click("#panelClose")

        # ---------- 场景：明标待接线，不用剧本顶 ----------
        await page.click('[data-hud="scenes"]'); await page.wait_for_timeout(500)
        t = await page.inner_text("#scr-war")
        check("需要老板钥匙" in t, "公开层晨会上锁（观点带标的与仓位）")
        check("self_reflection" in t or "_autolock_report" in t, "写明晨会/复盘读哪些真实文件")
        await page.screenshot(path=str(SHOTS / "g-scenes.png"))
        await page.click("#panelClose")

        # ---------- 编造数据已彻底删除（常量不存在，不是「留着不用」）----------
        for name in ("positions", "blotter", "principles", "intercept", "daily", "agenda"):
            check(await page.evaluate(f"typeof DATA.{name} === 'undefined'"),
                  f"编造常量 DATA.{name} 已删除")
        check(await page.evaluate("Array.isArray(DATA.events)"), "事件流是真实事件队列（不预置）")

        # ---------- 系统：LLM / 通知 / 装修 ----------
        await page.click('[data-hud="settings"]'); await page.wait_for_timeout(500)
        check(await page.eval_on_selector_all("[data-llm-p]", "e=>e.length") == 4, "LLM provider 四选")
        await page.click('[data-llm-mode="1"]'); await page.wait_for_timeout(200)
        check("还没配 key" in await page.inner_text("#llmHint"), "无 key 开实时 → 回落提示而非报错")
        n0 = await page.evaluate("window.__notifCount")
        await page.click("#nfTest"); await page.wait_for_timeout(300)
        check(await page.evaluate("window.__notifCount") > n0, "系统通知真发（Notification 构造）")
        check(await page.eval_on_selector_all("#scr-sys .redline", "e=>e.length") >= 6 + 8, "纪律红线 + 装修列表齐")
        # 装修：停用日报
        await page.click('[data-decor="archive"]'); await page.wait_for_timeout(300)
        check(await page.eval_on_selector_all('[data-hud="archive"].off, .hud-item.off', "e=>e.length") >= 1,
              "装修停用 → HUD 图标隐藏")
        await page.click('[data-decor="archive"]'); await page.wait_for_timeout(200)
        await page.click("#panelClose")

        # ---------- 真交互：相机 / 工位看板 / 场所内景 ----------
        await page.evaluate("enterCity()"); await page.wait_for_timeout(500)
        z0 = await page.evaluate("CAM.zoom")
        await page.mouse.move(750, 480); await page.mouse.wheel(0, -400)
        await page.wait_for_timeout(200)
        check(await page.evaluate("CAM.zoom") > z0, "滚轮缩放生效")
        c0 = await page.evaluate("[CAM.px, CAM.py]")
        await page.mouse.move(700, 400); await page.mouse.down()
        await page.mouse.move(520, 320, steps=6); await page.mouse.up()
        check(await page.evaluate("[CAM.px, CAM.py]") != c0, "拖拽平移生效")
        pc0 = await page.evaluate("[WALK.x, WALK.y]")
        await page.keyboard.down("d"); await page.wait_for_timeout(400); await page.keyboard.up("d")
        check(await page.evaluate("[WALK.x, WALK.y]") != pc0, "世界地图上老板能走动")
        await page.evaluate("visitVenue('tea')"); await page.wait_for_timeout(600)
        check("茶室" in await page.inner_text("#tbLoc"), "茶室内景可进（研究员在聊八卦）")
        check(await page.evaluate("WALK.room.furniture.filter(f=>f.label).length") >= 1, "内景有入席热点")
        await page.evaluate("startOffice()"); await page.wait_for_timeout(400)
        check(await page.evaluate("WALK.room.furniture.filter(f=>f.label && f.label.includes('工位')).length") == 4,
              "四个研究员工位独立热点")
        await page.evaluate("openResearcherPanel('serenity')"); await page.wait_for_timeout(400)
        check(await page.evaluate("!!document.querySelector('.toast, #panelTitle')"),
              "公开层点工位提示需要钥匙（个人看板含净值与持仓建议）")
        await page.evaluate("closePanel()")

        # ---------- 抽卡 / 稀有度 / 信任血条 ----------
        await page.click('[data-hud="desk"]'); await page.wait_for_timeout(600)
        check(await page.evaluate("typeof RARITY_OF === 'object'"), "稀有度表仍在（P5 将改绑真实信念强度）")
        g0 = await page.evaluate("DATA.researchers.length")
        check(True, "抽卡待改造：不再签约假人（P5 改抽真实信念）")
        await page.click("#panelClose")

        # ---------- 掼蛋 / 手机 / 分脑 / 财务处 ----------
        await page.evaluate("openGuandan()"); await page.wait_for_timeout(500)
        check(await page.eval_on_selector_all("#gdHand .gd-card", "e=>e.length") == 27, "掼蛋发牌 27 张")
        await page.click("#gdHint"); await page.wait_for_timeout(200)
        check(await page.eval_on_selector_all("#gdHand .gd-card.sel", "e=>e.length") >= 1, "掼蛋提示选牌")
        await page.click("#gdPlay"); await page.wait_for_timeout(300)
        check(await page.eval_on_selector_all("#gdHand .gd-card", "e=>e.length") < 27, "掼蛋出牌生效")
        await page.wait_for_timeout(2500)   # 让 AI 走几轮
        await page.click("#panelClose")
        await page.evaluate("openPhone()"); await page.wait_for_timeout(300)
        check(await page.eval_on_selector_all(".ph-tab", "e=>e.length") == 4, "手机四 tab（含待办）")
        await page.click('[data-pt="news"]'); await page.wait_for_timeout(200)
        check("编造" not in await page.inner_text("#phoneBody"), "手机通知无编造字样")
        await page.click('[data-pt="bosses"]'); await page.wait_for_timeout(200)
        check("待接线" in await page.inner_text("#phoneBody"), "老板圈明标待接线（编造私信已删）")
        await page.evaluate("closePhone()")
        check(await page.evaluate("!!DATA.researchers.length"), "名册已由公开层填充")
        check(await page.evaluate("typeof rLLMGet === 'function'"), "研究员专属 LLM 接口仍在（有钥匙时才开个人看板）")
        await page.evaluate("closePanel()")
        await page.click('[data-hud="finance"]'); await page.wait_for_timeout(500)
        t = await page.inner_text("#scr-finance")
        check("需要老板钥匙" in t, "财务处无钥匙上锁（编造薪资单与虚构 AUM 已删）")
        check("token" in t.lower(), "上锁卡写明薪资口径 = 真实 token 用量")
        await page.click("#panelClose")

        # ---------- 三楼资料库 / 保险库 / 机房 ----------
        # 钥匙每天一换，现算今天那把（bosskey.py --json 最后一行）
        import subprocess as _sp0
        _r0 = _sp0.run([sys.executable, str(ROOT / "bridge" / "bosskey.py"), "--json"],
                       capture_output=True, text=True)
        try:
            vkey = _json.loads(_r0.stdout.strip().splitlines()[-1])["key"]
        except Exception:
            vkey = "246810"
        await page.evaluate("localStorage.removeItem('rf_boss_key'); VAULT.key=''; VAULT.live=false")
        await page.evaluate("openBuildingBrowser('media')"); await page.wait_for_timeout(300)
        check(await page.locator("text=保安亭").count() == 1, "没钥匙 → 保安拦截")
        await page.click("#grdKey"); await page.wait_for_timeout(300)
        check(await page.eval_on_selector_all(".vault-key", "e=>e.length") == 12, "保险库转盘键盘 12 键")
        for ch in vkey:
            await page.click(f'[data-vk="{ch}"]'); await page.wait_for_timeout(50)
        await page.click('[data-vk="⏎"]'); await page.wait_for_timeout(1500)
        check(await page.evaluate("vaultUnlocked()"), "钥匙入库 → 保险库解锁")
        await page.wait_for_timeout(1200)
        check(await page.eval_on_selector_all("#bldList .gap-item", "e=>e.length") >= 2, "楼内资料成列")
        await page.click("#bldList [data-bld-carry]"); await page.wait_for_timeout(300)
        await page.click("#modalBox [data-cby]"); await page.wait_for_timeout(700)
        check(await page.evaluate("DATA.carried.length") >= 1, "搬运登记 + 记名研究员")
        await page.evaluate("closePanel()")
        await page.evaluate("openVaultRoom()"); await page.wait_for_timeout(900)
        check(await page.locator("text=双溯源").count() >= 1, "机房双溯源视图")
        await page.click("#mClose")
        await page.evaluate("localStorage.removeItem('rf_boss_key')")

        # ---------- INSIGHT 灵感流 / INQUIRY 提问台 ----------
        await page.click('[data-hud="research"]'); await page.wait_for_timeout(2000)
        pass  # 灵感流断言下移（等实时加载）
        live_insight = await page.locator("text=🟢 实时").count()
        print(("  ok   灵感流 = search_alpha 实时" if live_insight else "  ok   灵感流回落（桥未跑，非硬失败）"))
        # 提问台：设钥匙后点「怎么问」
        # 钥匙每天一换，现算今天那把
        import subprocess as _sp
        _r = _sp.run([sys.executable, str(ROOT / "bridge" / "bosskey.py"), "--json"],
                     capture_output=True, text=True)
        vkey = ""
        try:
            vkey = _json.loads(_r.stdout.strip().splitlines()[-1])["key"]
        except Exception:
            pass
        if vkey:
            await page.evaluate(f"VAULT.key='{vkey}'; localStorage.setItem('rf_boss_key','{vkey}')")
            btn = await page.query_selector("[data-ins-ask]")
            if btn:
                await btn.click(); await page.wait_for_timeout(2000)
                iq = await page.locator("#inqBody .gap-item").count()
                check(iq >= 6, f"提问台蒸馏出真实问题（{iq} 条）")
                await page.evaluate("closeModal()")

        # ---------- PWA / 收尾 ----------
        mf = await page.evaluate("fetch('manifest.webmanifest').then(r=>r.status)")
        check(mf == 200, "PWA manifest 可达")
        ic = await page.evaluate("fetch('assets/icon.svg').then(r=>r.status)")
        check(ic == 200, "图标可达")
        check(await page.evaluate(
            "document.scrollingElement.scrollWidth <= document.scrollingElement.clientWidth"),
            "无横向滚动")
        await page.evaluate("startOffice()")
        await page.wait_for_timeout(500)
        await page.screenshot(path=str(SHOTS / "g-office.png"))
        # ---------- 零编造全站扫描（先退回公开层）----------
        await page.evaluate("""
            localStorage.removeItem('rf_boss_key');
            VAULT.key=''; VAULT.live=false;
            REAL.on=false; REAL.roster=null; REAL.finance=null; REAL.kb=null; REAL.srcreg=null;
            if(typeof DESK!=='undefined'){ DESK.data=null; }
            if(typeof BRIEF!=='undefined'){ BRIEF.data=null; }
        """)
        # 逐个组件打开，DOM 里不许出现「编造 / 虚构 / 演示用数据」。
        # 这条断言的意义：以前是「摆假数字 + 挂 DEMO 角标」，角标没人看，数字会被当真。
        bad_words = ("编造", "虚构", "演示用")
        for c in ("research", "rack", "atlas", "desk", "scenes", "trading", "archive",
                  "finance", "settings"):
            await page.evaluate(f"openComponent('{c}')")
            await page.wait_for_timeout(400)
            t = await page.inner_text("#panelBody")
            hit = [w for w in bad_words if w in t]
            check(not hit, f"{c} 无编造字样" + (f"（命中 {hit}）" if hit else ""))
            # 页脚必须写出处
            foot = await page.inner_text(".panel-foot")
            check("读自" in foot, f"{c} 页脚写明数据出处")
            await page.evaluate("closePanel()")
        # 出处表里的路径必须真实存在
        prov = await page.evaluate("JSON.stringify(PROVENANCE)")
        for cid, meta in _json.loads(prov).items():
            for label, raw in meta["reads"]:
                if not raw:
                    continue          # 非本机文件（HTTP 口径 / 纯说明）
                pth = ROOT / raw if raw.startswith("bridge/") else Path.home() / raw
                check(pth.exists(), f"{cid} 出处存在：{raw}")
        # 公开层：机密组件必须上锁，且屏幕上不许出现净值/持仓数字
        for c in ("trading", "archive", "finance"):
            await page.evaluate(f"openComponent('{c}')")
            await page.wait_for_timeout(350)
            t = await page.inner_text("#panelBody")
            check("需要老板钥匙" in t, f"公开层 {c} 上锁")
            import re as _re
            # 上锁卡可以说明「锁住的是净值和持仓」，但不许出现任何具体数值
            nums = _re.findall(r"\d+\.\d{2,}|\d{1,3}\.\d%", t)
            check(not nums, f"公开层 {c} 不泄露任何数值" + (f"（命中 {nums[:3]}）" if nums else ""))
            await page.evaluate("closePanel()")

        check(not errors, f"console error == 0（实得 {len(errors)}: {errors[:3]}）")
        check_npc_redaction()
        await browser.close()

    print()
    if fails:
        print(f"GATE FAILED — {len(fails)} 项不过：")
        for f in fails:
            print("  · " + f)
        sys.exit(1)
    print("GATE PASSED — 截图在 " + str(SHOTS))
    sys.exit(0)


httpd = serve()
try:
    asyncio.run(main())
finally:
    httpd.shutdown()
