import type { Entry } from './store'
import type { Task } from './model'
import { today } from './utils'

export const notifySupported = () => 'Notification' in window
export async function askPermission() {
  if (!notifySupported()) return 'denied' as const
  return Notification.requestPermission()
}

const fired = new Set<string>()
// Локальные напоминания: срабатывают, пока приложение открыто или живёт в фоне.
export function checkReminders(tasks: Entry<Task>[]) {
  if (!notifySupported() || Notification.permission !== 'granted') return
  const now = new Date()
  const hm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  for (const e of tasks) {
    const t = e.data
    if (t.done || t.date !== today() || !t.time || t.time > hm) continue
    const key = `${e.id}:${t.date}:${t.time}`
    if (fired.has(key) || localStorage.getItem('fired:' + key)) continue
    fired.add(key)
    try { localStorage.setItem('fired:' + key, '1') } catch {}
    navigator.serviceWorker?.ready.then((r) => r.showNotification('Мой день', { body: `${t.time} · ${t.title}`, icon: 'icon-192.png', tag: key }))
      .catch(() => new Notification('Мой день', { body: t.title }))
  }
}
