# Личный ИИ-ассистент Акмарал

Системный промпт лежит в [`system-prompt.md`](./system-prompt.md).

## Как подключить

- **Claude Projects** (claude.ai): создайте проект → «Project instructions» →
  вставьте текст из `system-prompt.md` (без заголовка первой строки).
- **ChatGPT**: «Мои GPTs» → «Создать» → вкладка «Configure» → поле
  «Instructions».
- **Telegram-бот / API**: передайте текст как `system`-сообщение при каждом
  запросе к модели.

Чтобы обновить ассистента — правьте `system-prompt.md` и заново вставьте
текст в выбранный инструмент.
