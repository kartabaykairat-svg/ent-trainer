"""Очередь генераций через Playwright.

Первый запуск:  python run.py --login   (залогиньтесь вручную, закройте окно)
Дальше:         python run.py           (обрабатывает prompts.txt, можно оставить на ночь)
Если упало — запустите снова: уже готовые промпты пропускаются (done.json).
"""
import argparse, json, logging, sys, time, urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout

CFG = json.loads(Path(__file__).with_name("config.json").read_text(encoding="utf-8"))
BASE = Path(__file__).parent


def p(key):
    return (BASE / CFG[key]).resolve()


logging.basicConfig(
    level=logging.INFO, format="%(asctime)s %(message)s",
    handlers=[logging.FileHandler(p("log_file"), encoding="utf-8"), logging.StreamHandler()],
)
log = logging.getLogger("gen")


def load_prompts():
    lines = p("prompts_file").read_text(encoding="utf-8").splitlines()
    return [l.strip() for l in lines if l.strip() and not l.startswith("#")]


def load_done():
    f = p("state_file")
    return set(json.loads(f.read_text(encoding="utf-8"))) if f.exists() else set()


def save_done(done):
    p("state_file").write_text(json.dumps(sorted(done), ensure_ascii=False, indent=1), encoding="utf-8")


def pre_checks(page):
    """Перед КАЖДОЙ генерацией: все настройки должны быть как надо, иначе стоп."""
    for c in CFG["pre_checks"]:
        el = page.locator(c["selector"]).first
        if c["expect"] == "checked":
            ok = el.is_checked() if el.get_attribute("type") == "checkbox" else el.get_attribute("aria-checked") == "true"
        else:
            ok = c["value"] in (el.inner_text() or "")
        if not ok:
            raise RuntimeError(f"Проверка не пройдена: {c['name']}")


def generate(page, prompt, idx, out):
    page.goto(CFG["url"])
    pre_checks(page)
    results = page.locator(CFG["result_selector"])
    before = results.count()
    page.fill(CFG["prompt_input"], prompt)
    page.click(CFG["submit_button"])
    deadline = time.time() + CFG["timeout_sec"]
    while time.time() < deadline:
        if results.count() > before:
            src = results.first.get_attribute(CFG["result_attr"])
            if src:
                dest = out / f"{idx:04d}{Path(src.split('?')[0]).suffix or '.bin'}"
                urllib.request.urlretrieve(src, dest) if src.startswith("http") else None
                page.screenshot(path=str(out / f"{idx:04d}.png"))
                return dest
        page.wait_for_timeout(2000)
    raise PWTimeout("не дождались результата")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--login", action="store_true")
    args = ap.parse_args()
    out = p("output_dir"); out.mkdir(exist_ok=True)

    with sync_playwright() as pw:
        ctx = pw.chromium.launch_persistent_context(str(p("profile_dir")), headless=False)
        page = ctx.pages[0] if ctx.pages else ctx.new_page()
        if args.login:
            page.goto(CFG["url"])
            input("Залогиньтесь в окне браузера и нажмите Enter здесь...")
            ctx.close(); return

        done = load_done()
        prompts = load_prompts()
        log.info("Всего: %d, уже готово: %d", len(prompts), len(done))
        for i, prompt in enumerate(prompts, 1):
            if prompt in done:
                continue
            for attempt in range(1, CFG["max_retries"] + 2):
                try:
                    dest = generate(page, prompt, i, out)
                    log.info("[%d/%d] OK %s", i, len(prompts), dest.name)
                    done.add(prompt); save_done(done)
                    break
                except RuntimeError as e:  # не те настройки — дальше идти нельзя
                    log.error("СТОП: %s", e); ctx.close(); sys.exit(1)
                except Exception as e:
                    log.warning("[%d] попытка %d: %s", i, attempt, e)
                    page.screenshot(path=str(out / f"err_{i:04d}.png"))
            time.sleep(CFG["delay_between_sec"])
        log.info("Готово")
        ctx.close()


if __name__ == "__main__":
    main()
