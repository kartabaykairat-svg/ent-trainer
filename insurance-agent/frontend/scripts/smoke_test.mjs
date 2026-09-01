import { chromium } from "playwright"
import path from "path"

const FIXTURES = "/home/user/ent-trainer/insurance-agent/backend/tests/fixtures"

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" })
const page = await browser.newPage()
const errors = []
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text())
})
page.on("pageerror", (err) => errors.push(String(err)))

async function shot(name) {
  await page.screenshot({ path: `/tmp/shot_${name}.png`, fullPage: true })
}

try {
  await page.goto("http://127.0.0.1:5173/login")
  await page.fill('input[type="text"], input:not([type])', "manager")
  await page.fill('input[type="password"]', "manager123")
  await shot("01_login")
  await page.click('button:has-text("Войти")')
  await page.waitForURL("**/")
  await page.waitForSelector("text=Клиентов сегодня")
  await shot("02_dashboard")

  await page.click('text=Создать нового клиента')
  await page.waitForURL("**/clients/new")
  await shot("03_new_client")
  await page.click('text=Один страхователь')
  await page.waitForURL(/\/clients\/[a-f0-9]+/)
  await shot("04_wizard_upload")

  const fileInput = await page.$('input[type="file"]')
  await fileInput.setInputFiles([path.join(FIXTURES, "c1_id.png"), path.join(FIXTURES, "c1_address.png")])
  await page.waitForTimeout(4000) // OCR takes a couple seconds
  await shot("05_after_upload")

  await page.click('text=Далее: проверить данные')
  await page.waitForTimeout(500)
  await shot("06_review")

  await page.click('text=Далее: параметры страхования')
  await page.waitForTimeout(500)
  await shot("07_insurance_empty")

  // fill required insurance fields
  async function fillByLabel(label, value) {
    const label_el = await page.locator(`label:has-text("${label}")`).first()
    const input = label_el.locator("input")
    await input.fill(value)
  }
  await fillByLabel("Номер договора", "12345")
  await fillByLabel("Дата договора", "15.09.2026")
  await fillByLabel("Город заключения", "Алматы")
  await fillByLabel("Пенсионные накопления из ЕНПФ", "4000000")
  await fillByLabel("Первая ежемесячная выплата", "50000")
  await shot("08_insurance_filled")

  await page.click('text=Далее: расчёт и график')
  await page.waitForTimeout(500)
  await shot("09_calc")

  await page.click('text=Рассчитать')
  await page.waitForTimeout(500)
  await shot("10_calc_result")

  await page.click('text=Далее: подтверждение')
  await page.waitForTimeout(500)
  await shot("11_confirm_checklist")

  const confirmBtn = page.locator('button:has-text("Подтвердить данные клиента")')
  if (await confirmBtn.isEnabled()) {
    await confirmBtn.click()
    await shot("12_confirm_warning")
    await page.click('button:has-text("Подтвердить и сформировать документы")')
    await page.waitForSelector('text=Документы сформированы', { timeout: 20000 })
    await shot("13_generated")

    // exercise the download buttons for real
    const [download1] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button:has-text("Скачать DOCX") >> nth=0'),
    ])
    console.log("downloaded contract docx:", await download1.suggestedFilename())

    const [download2] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button:has-text("Скачать PDF") >> nth=0'),
    ])
    console.log("downloaded contract pdf:", await download2.suggestedFilename())
  } else {
    await shot("12_confirm_disabled")
    console.log("CONFIRM BUTTON DISABLED - checklist not passing")
  }

  console.log("CONSOLE/PAGE ERRORS:", JSON.stringify(errors, null, 2))
} catch (e) {
  console.error("TEST FAILED:", e)
  await shot("error")
  console.log("CONSOLE/PAGE ERRORS:", JSON.stringify(errors, null, 2))
  process.exitCode = 1
} finally {
  await browser.close()
}
