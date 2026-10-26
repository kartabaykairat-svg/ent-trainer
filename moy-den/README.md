# Мой день

Личный органайзер (PWA): план дня, работа, семья, досуг, спорт, здоровье, поездки.
React + TypeScript + Tailwind + Supabase + Recharts. Работает офлайн, синхронизируется между устройствами.

## Запуск
```bash
cd moy-den
npm install
cp .env.example .env   # вписать URL и anon key из Supabase
npm run dev            # разработка
npm run build          # сборка в dist/ (PWA с service worker)
```
Без `.env` приложение работает локально (без входа и облака).

## Supabase
1. Создайте проект, в **SQL Editor** выполните `supabase.sql` (таблица `entries` + RLS: каждый видит только свои строки).
2. **Authentication → Providers → Email** включён по умолчанию.
3. Ключи — в **Project Settings → API** (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).

## Как устроена синхронизация
Данные сначала пишутся в IndexedDB (мгновенно, офлайн), помечаются `dirty` и уходят в Supabase при появлении сети
(и раз в минуту / при возврате в приложение). Конфликты — «последняя правка побеждает» по `updated_at`.

## Напоминания
Для задач со временем приложение показывает уведомления, пока оно открыто или живёт в фоне.
Настоящий push при закрытом приложении требует сервера (Supabase Edge Function + VAPID-ключи) — не реализован.
