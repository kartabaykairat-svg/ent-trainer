# ЕНТ — тренажёр

Простое веб-приложение: тесты (история) + статистика.

## Запуск (рекомендуется)
1. Откройте PowerShell в папке `ent-trainer`:
   `cd "C:\Users\Home\Desktop\ent-trainer"`
2. Запустите локальный сервер:
   `python -m http.server 5173`
3. Откройте в браузере:
   `http://localhost:5173`

## Данные
Вопросы лежат в `data/questions.json`.

## Добавить вопрос
Нужно добавить объект в массив `questions`:
```json
{
  "id": "my-1",
  "topic": "Тема",
  "question": "Текст вопроса?",
  "options": ["A", "B", "C", "D"],
  "answerIndex": 0
}
```

