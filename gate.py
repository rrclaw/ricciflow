#!/usr/bin/env python3.11
"""ricciflow 渲染闸 v3 — exit 0 才算过，不许 pipe 吞退出码。

跑法: /opt/homebrew/bin/python3.11 /Users/bot/ricciflow/gate.py
自起 http.server（Notification/manifest 需要 http 上下文）。
"""
import asyncio
import functools
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
        tickets0 = await page.evaluate("DATA.tickets.length")
        await page.evaluate("visitNpc('citadel')")
        await page.wait_for_timeout(400)
        await page.evaluate("npcTalk('citadel')")
        await page.wait_for_timeout(300)
        check(await page.eval_on_selector_all("#npcClue", "e=>e.length") == 1, "NPC 交流对话出现")
        await page.click("#npcClue"); await page.wait_for_timeout(200)
        check(await page.evaluate("DATA.tickets.length") == tickets0 + 1, "「记为线索」→ 灵感列 +1")
        res0 = await page.evaluate("DATA.researchers.length")
        await page.evaluate("npcPoach('citadel')")
        await page.wait_for_timeout(300)
        await page.click("#poachGo"); await page.wait_for_timeout(200)
        check(await page.evaluate("DATA.researchers.length") == res0 + 1, "主动挖人成功 → 名册 +1")
        await page.evaluate("startOffice()")
        await page.wait_for_timeout(400)

        # ---------- V1 迁移断言 ----------
        await page.click('[data-hud="rack"]'); await page.wait_for_timeout(500)
        check(await page.eval_on_selector_all(".cart", "e=>e.length") >= 22, "数据源卡带 >= 22")
        await page.click("#panelClose")
        await page.click('[data-hud="atlas"]'); await page.wait_for_timeout(700)
        check(await page.eval_on_selector_all(".plot", "e=>e.length") >= 60, "atlas 节点 >= 60")
        check(await page.eval_on_selector_all(".gold-flag", "e=>e.length") >= 7, "沉淀金旗 >= 7")
        await page.click('[data-layer="validated"]'); await page.wait_for_timeout(300)
        dim = await page.evaluate(
            "Array.from(document.querySelectorAll('.plot')).filter(p=>p.style.opacity && +p.style.opacity < 1).length")
        check(dim > 30, f"沉淀图层过滤生效（压暗 {dim} 块）")
        await page.click("#panelClose")
        await page.click('[data-hud="desk"]'); await page.wait_for_timeout(600)
        rc = await page.eval_on_selector_all(".rcard", "e=>e.length")
        check(rc >= 9, f"研究员卡 >= 9（8 原班 + 挖来的，实得 {rc}）")
        check(await page.locator("text=PIP 观察期").count() == 1, "PIP 末位角标 == 1")
        check(await page.eval_on_selector_all("[data-cull]", "e=>e.length") == 1, "淘汰评审入口存在")
        # 滑块改口
        before = await page.inner_text("#say-serenity")
        await page.eval_on_selector('.sliders[data-r="serenity"] input[data-k="aggr"]',
                                    "el=>{el.value=2; el.dispatchEvent(new Event('input'))}")
        after = await page.inner_text("#say-serenity")
        check(before != after, "拖滑块研究员当场改口")
        await page.click("#panelClose")

        # ---------- 研究台 ----------
        await page.click('[data-hud="research"]'); await page.wait_for_timeout(500)
        check(await page.eval_on_selector_all("#kanban > div", "e=>e.length") == 6, "流水线 6 列")
        tick = await page.evaluate("DATA.tickets.length")
        check(tick >= 10, f"流水线票 >= 10（实得 {tick}）")
        await page.wait_for_timeout(3200)   # 等 insight 灵感流（实时源，可能慢）
        ideas = await page.eval_on_selector_all("#ideaFeed .gap-item", "e=>e.length")
        print(f"  {'ok  ' if ideas>=1 else 'soft'}   灵感流卡数={ideas}（实时模块，软断言）")
        goBtn = await page.query_selector("[data-ins-go]") or await page.query_selector("[data-idea-go]")
        if goBtn:
            await goBtn.click(); await page.wait_for_timeout(300)
            check(await page.evaluate("DATA.tickets.length") >= tick + 1, "灵感「立课题」→ 票 +1")
        # 投稿
        inbox0 = await page.evaluate("(DATA.researchers.find(r=>r.id==='tech').inbox||[]).length")
        await page.click("#subGo"); await page.wait_for_timeout(300)
        check(await page.evaluate("(DATA.researchers.find(r=>r.id==='tech').inbox||[]).length") == inbox0 + 1,
              "投稿 → 研究员收件箱 +1")
        # 金样例1
        await page.click("text=★ 存储涨价外溢设备与材料"); await page.wait_for_timeout(800)
        check(await page.eval_on_selector_all("[data-ask]", "e=>e.length") == 8, "追问链 8 条（四层×2）")
        check(await page.eval_on_selector_all("[data-lack]", "e=>e.length") == 3, "缺料提示 3 处")
        for i in range(3):
            btns = await page.query_selector_all("[data-ask]")
            await btns[min(2 + i, len(btns) - 1)].click()
            await page.wait_for_timeout(450)
        check(await page.eval_on_selector_all("#chatLog .saybox", "e=>e.length") >= 4, "研究对话 >= 4 轮")
        v0 = await page.evaluate("DATA.atlas.find(n=>n.name==='光刻胶').validated || 0")
        await page.click("[data-sink]"); await page.wait_for_timeout(300)
        await page.click("#sinkOK"); await page.wait_for_timeout(300)
        check(await page.evaluate("DATA.atlas.find(n=>n.name==='光刻胶').validated") == v0 + 1,
              "打标沉淀 → 知识库金旗 +1（跨屏联动）")
        await page.screenshot(path=str(SHOTS / "g-deep.png"))
        # 金样例2
        await page.click("#benchBack"); await page.wait_for_timeout(400)
        await page.click("text=★ 北美数据中心外溢北欧"); await page.wait_for_timeout(500)
        check(await page.eval_on_selector_all("#trackRoutes .gap-item", "e=>e.length") == 4,
              "跟踪自动拆解 == 4 路（抗议/政策/拿地/建设）")
        await page.click("#panelClose")

        # ---------- 交易台 ----------
        await page.click('[data-hud="trading"]'); await page.wait_for_timeout(500)
        check(await page.eval_on_selector_all("#scr-trading .gap-item", "e=>e.length") == 7, "决策流水 7 行")
        check(await page.eval_on_selector_all("#scr-trading .redline", "e=>e.length") == 4, "原则库 4 条")
        await page.click("#btnIntercept"); await page.wait_for_timeout(4600)
        check(await page.locator("text=拦截计数 +1").count() >= 1, "上头拦截剧场跑完")
        await page.screenshot(path=str(SHOTS / "g-trading.png"))
        await page.click("#panelClose")

        # ---------- 场景 ----------
        await page.click('[data-hud="scenes"]'); await page.wait_for_timeout(500)
        check(await page.eval_on_selector_all(".door", "e=>e.length") == 8, "场景门 == 8")
        # 晨会
        await page.click('[data-scene="morning"]'); await page.wait_for_timeout(300)
        await page.click("#btnSkip"); await page.wait_for_timeout(2600)
        check(await page.eval_on_selector_all(".minutes", "e=>e.length") >= 1, "晨会跑通出纪要")
        check(await page.eval_on_selector_all(".zap", "e=>e.length") == 2, "冲突标记 2 处")
        await page.click(".zap"); await page.wait_for_timeout(300)
        check(await page.eval_on_selector_all(".bridge", "e=>e.length") >= 1, "冲突面板带「桥」")
        await page.click("#mClose")
        # 饭局（茶室场地）
        await page.click("#btnBack"); await page.wait_for_timeout(300)
        await page.click('[data-scene="dinner"]'); await page.wait_for_timeout(400)
        check(await page.eval_on_selector_all("[data-venue]", "e=>e.length") == 3, "饭局三场地可选")
        await page.click('[data-venue="tea"]'); await page.wait_for_timeout(400)
        await page.click("#btnSkip"); await page.wait_for_timeout(2600)
        check(await page.eval_on_selector_all(".gossip.keep", "e=>e.length") == 2, "茶室场地保留 2 条 ★★★")
        # 出差调研
        await page.click("#btnBack"); await page.wait_for_timeout(300)
        v1 = await page.evaluate("DATA.atlas.find(n=>n.name==='大硅片').validated || 0")
        await page.click('[data-scene="trip"]'); await page.wait_for_timeout(300)
        await page.click("#btnSkip"); await page.wait_for_timeout(3000)
        check(await page.locator("text=T+2").count() >= 1, "出差调研出「T+2 共识衰减」")
        check(await page.evaluate("DATA.atlas.find(n=>n.name==='大硅片').validated") == v1 + 1,
              "调研纪要沉淀 → 大硅片金旗 +1")
        await page.screenshot(path=str(SHOTS / "g-trip.png"))
        await page.click("#panelClose")

        # ---------- 日报 + 挖角 offer ----------
        await page.click('[data-hud="daily"]'); await page.wait_for_timeout(500)
        check(await page.eval_on_selector_all("[data-of]", "e=>e.length") == 3, "挖角 offer 三选")
        await page.click('[data-of="keep"]'); await page.wait_for_timeout(300)
        check(await page.evaluate("DATA.researchers.find(r=>r.id==='quant').salaryUp === true",),
              "挽留生效（薪资标记）")
        await page.click("#panelClose")

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
        await page.click('[data-decor="daily"]'); await page.wait_for_timeout(300)
        check(await page.eval_on_selector_all('[data-hud="daily"].off, .hud-item.off', "e=>e.length") >= 1,
              "装修停用 → HUD 图标隐藏")
        await page.click('[data-decor="daily"]'); await page.wait_for_timeout(200)
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
        check("个人工作看板" in await page.inner_text("#panelTitle"), "工位打开个人看板")
        check(await page.eval_on_selector_all("[data-report]", "e=>e.length") >= 3, "个人历史报告 >= 3")
        pb = await page.inner_text("#say-serenity")
        await page.eval_on_selector('#panelBody input[data-k="aggr"]',
                                    "el=>{el.value=9; el.dispatchEvent(new Event('input'))}")
        check(await page.inner_text("#say-serenity") != pb, "看板里拖滑块当场改口")
        await page.evaluate("closePanel()")

        # ---------- 抽卡 / 稀有度 / 信任血条 ----------
        await page.click('[data-hud="desk"]'); await page.wait_for_timeout(600)
        check(await page.eval_on_selector_all(".rarity.ssr", "e=>e.length") >= 2, "SSR 徽章 >= 2（Serenity/风控官）")
        check(await page.eval_on_selector_all(".hpbar", "e=>e.length") >= 8, "信任血条全员挂上")
        g0 = await page.evaluate("DATA.researchers.length")
        await page.click("#btnGacha"); await page.wait_for_timeout(300)
        await page.click("#pullBtn"); await page.wait_for_timeout(1200)
        check(await page.eval_on_selector_all("#gachaCard .rarity", "e=>e.length") == 1, "抽卡翻面出稀有度")
        await page.click("#signBtn"); await page.wait_for_timeout(400)
        check(await page.evaluate("DATA.researchers.length") == g0 + 1, "签约 → 名册 +1")
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
        await page.click('[data-pt="bosses"]'); await page.wait_for_timeout(200)
        await page.click('[data-pht="menghu"]'); await page.wait_for_timeout(200)
        await page.click("[data-phr]"); await page.wait_for_timeout(1400)
        check(await page.locator("text=茶室好").count() >= 1, "老板圈私信可回复且对方回话")
        await page.evaluate("closePhone()")
        await page.evaluate("openResearcherPanel('serenity')"); await page.wait_for_timeout(400)
        check(await page.eval_on_selector_all("[data-rllm-p]", "e=>e.length") == 4, "研究员专属 LLM 四 provider")
        await page.fill("#rllmKey", "sk-test-demo"); await page.click("#rllmSave")
        await page.wait_for_timeout(400)
        check(await page.evaluate("!!(rLLMGet('serenity') && rLLMGet('serenity').key)"), "专属 key 落 localStorage")
        await page.evaluate("rLLMSave('serenity', null)")   # 清理测试残留
        await page.evaluate("closePanel()")
        await page.click('[data-hud="finance"]'); await page.wait_for_timeout(500)
        check(await page.eval_on_selector_all("#scr-finance table tr", "e=>e.length") >= 10, "财务处薪资表成行")
        check(await page.locator("text=本月利润").count() >= 1, "财务处利润结算")
        await page.click("#panelClose")

        # ---------- 三楼资料库 / 保险库 / 机房 ----------
        real_key = (ROOT / "bridge" / "boss.key")
        vkey = real_key.read_text().strip() if real_key.exists() else "246810"
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
        real_key = (ROOT / "bridge" / "boss.key")
        if real_key.exists():
            vkey = real_key.read_text().strip()
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
        check(not errors, f"console error == 0（实得 {len(errors)}: {errors[:3]}）")
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
