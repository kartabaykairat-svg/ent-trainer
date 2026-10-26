import { area, type Group } from './areas'
import type { Entry } from './store'
import type { Task, Workout } from './model'
import { dkey, lastDays } from './utils'

export function weekBalance(tasks: Entry<Task>[], workouts: Entry<Workout>[], days = 7) {
  const range = new Set(lastDays(days))
  const c: Record<Group, number> = { work: 0, family: 0, me: 0 }
  for (const e of tasks) {
    if (!e.data.done) continue
    const k = e.data.doneAt ? dkey(new Date(e.data.doneAt)) : e.data.date
    if (k && range.has(k)) c[area(e.data.area).group]++
  }
  for (const w of workouts) if (range.has(w.data.date)) c.me++
  const total = c.work + c.family + c.me
  return { counts: c, total, pct: (g: Group) => (total ? Math.round((c[g] / total) * 100) : 0) }
}

export function balanceHint(b: ReturnType<typeof weekBalance>) {
  if (b.total < 3) return 'Отмечайте дела — и здесь появится картина недели.'
  const p = { work: b.pct('work'), family: b.pct('family'), me: b.pct('me') }
  if (p.work > 60) return 'Много работы на этой неделе. Запланируйте что-то для семьи или себя 🌿'
  if (p.family < 15) return 'Семье пока уделено мало внимания. Может, вечер вместе? 🏡'
  if (p.me < 15) return 'Для себя почти ничего. Прогулка или хобби подойдут 🎨'
  return 'Хороший баланс — так держать! ☀️'
}
