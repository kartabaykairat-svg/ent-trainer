import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export const cn = (...v: ClassValue[]) => twMerge(clsx(v))
export const uid = () => crypto.randomUUID()

const pad = (n: number) => String(n).padStart(2, '0')
export const dkey = (d: Date = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const fromKey = (k: string) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d) }
export const addDays = (k: string, n: number) => { const d = fromKey(k); d.setDate(d.getDate() + n); return dkey(d) }
export const today = () => dkey()

export const fmtLong = (k: string) =>
  fromKey(k).toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })
export const fmtShort = (k: string) =>
  fromKey(k).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
export const fmtDow = (k: string) => fromKey(k).toLocaleDateString('ru-RU', { weekday: 'short' })

export function relDay(k: string) {
  const t = today()
  if (k === t) return 'Сегодня'
  if (k === addDays(t, 1)) return 'Завтра'
  if (k === addDays(t, -1)) return 'Вчера'
  return fmtShort(k)
}
export function greeting() {
  const h = new Date().getHours()
  return h < 5 ? 'Доброй ночи' : h < 12 ? 'Доброе утро' : h < 18 ? 'Добрый день' : 'Добрый вечер'
}
export const lastDays = (n: number) => Array.from({ length: n }, (_, i) => addDays(today(), i - (n - 1)))
