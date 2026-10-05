"""Запись селекторов кликами.  python record.py <url-страницы-генерации>

Откроется браузер (профиль общий с run.py, логин сохраняется).
Скрипт будет просить кликнуть по элементам по очереди; селекторы пишутся в config.json.
"""
import json, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = Path(__file__).parent
CFG_PATH = BASE / "config.json"
cfg = json.loads(CFG_PATH.read_text(encoding="utf-8"))
if len(sys.argv) > 1:
    cfg["url"] = sys.argv[1]

JS = """
() => {
  window.__picked = null;
  const css = el => {
    if (el.id) return '#' + CSS.escape(el.id);
    for (const a of ['data-testid','aria-label','name','placeholder']) {
      const v = el.getAttribute(a);
      if (v) return el.tagName.toLowerCase() + '[' + a + '="' + v.replace(/"/g,'\\\\"') + '"]';
    }
    const path = [];
    while (el && el.nodeType === 1 && path.length < 5) {
      let s = el.tagName.toLowerCase(), i = 1, p = el;
      while ((p = p.previousElementSibling)) if (p.tagName === el.tagName) i++;
      path.unshift(s + ':nth-of-type(' + i + ')'); el = el.parentElement;
    }
    return path.join(' > ');
  };
  document.addEventListener('click', e => {
    if (window.__picked) return;
    window.__picked = { selector: css(e.target), text: (e.target.innerText||'').slice(0,40) };
    e.stopPropagation();
  }, true);
}
"""

STEPS = [
    ("prompt_input", "поле для ввода ПРОМПТА"),
    ("submit_button", "кнопку GENERATE (ВНИМАНИЕ: клик не нажмёт её, он только записывается)"),
    ("result_selector", "ГОТОВУЮ картинку-результат из прошлой генерации (если её нет — сгенерируйте одну вручную)"),
    ("pre:Unlimited включён", "тумблер UNLIMITED (в нужном, включённом состоянии)"),
    ("pre:Разрешение", "выбранное РАЗРЕШЕНИЕ (например 2K)"),
    ("pre:Параллельных генераций", "счётчик/выбор числа ОДНОВРЕМЕННЫХ генераций"),
]

with sync_playwright() as pw:
    ctx = pw.chromium.launch_persistent_context(str((BASE / cfg["profile_dir"]).resolve()), headless=False)
    page = ctx.pages[0] if ctx.pages else ctx.new_page()
    page.goto(cfg["url"])
    input("Залогиньтесь, откройте страницу генерации, нажмите Enter здесь...")
    cfg["pre_checks"] = []
    for key, label in STEPS:
        page.evaluate(JS)
        print(f"\n>>> Кликните на {label}")
        page.wait_for_function("window.__picked !== null", timeout=0)
        pick = page.evaluate("window.__picked")
        print("    записано:", pick["selector"], "|", pick["text"])
        if key.startswith("pre:"):
            name = key[4:]
            if "Unlimited" in name:
                cfg["pre_checks"].append({"name": name, "selector": pick["selector"], "expect": "checked"})
            else:
                val = input(f"    Какой текст должен быть в этом элементе ({name})? [{pick['text']}]: ") or pick["text"]
                cfg["pre_checks"].append({"name": name, "selector": pick["selector"], "expect": "text", "value": val})
        else:
            cfg[key] = pick["selector"]
    CFG_PATH.write_text(json.dumps(cfg, ensure_ascii=False, indent=2), encoding="utf-8")
    print("\nГотово: config.json обновлён. Проверьте и запускайте python run.py")
    ctx.close()
