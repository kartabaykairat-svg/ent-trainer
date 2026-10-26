import { useState } from 'react'
import { Bar, BarChart, ResponsiveContainer, XAxis, Tooltip } from 'recharts'
import { Plus, Trash2 } from 'lucide-react'
import { useWorkouts, useHealth, saveHealth, useHealthAll, useHabits, type Habit } from '@/lib/model'
import { upsert, remove } from '@/lib/store'
import { Sheet } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Chip, Empty, ScreenHead } from '@/components/ui/bits'
import { fmtDow, lastDays, relDay, today, cn } from '@/lib/utils'

const TYPES = ['Бег', 'Ходьба', 'Зал', 'Йога', 'Плавание', 'Велосипед', 'Другое']
const MOODS = ['😞', '😕', '😐', '🙂', '😄']

export function Body() {
  const workouts = useWorkouts()
  const habits = useHabits()
  const hAll = useHealthAll()
  const h = useHealth()
  const [wOpen, setWOpen] = useState(false)
  const [hOpen, setHOpen] = useState(false)
  const [type, setType] = useState(TYPES[0])
  const [minutes, setMinutes] = useState('30')
  const [hTitle, setHTitle] = useState('')
  const [hEmoji, setHEmoji] = useState('💧')

  const days = lastDays(7)
  const chart = days.map((d) => ({ d: fmtDow(d), min: workouts.filter((w) => w.data.date === d).reduce((s, w) => s + w.data.minutes, 0) }))
  const sleepAvg = (() => { const v = days.map((d) => hAll.find((e) => e.data.date === d)?.data.sleep ?? 0).filter(Boolean); return v.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(1) : '—' })()
  const recent = [...workouts].sort((a, b) => b.data.date.localeCompare(a.data.date)).slice(0, 8)

  return (
    <div className="pb-4">
      <ScreenHead title="Спорт и здоровье" />
      <div className="space-y-4 px-4">
        <section className="card rise space-y-4">
          <h2>Сегодня</h2>
          <div>
            <p className="label mb-2">Настроение</p>
            <div className="flex justify-between">
              {MOODS.map((m, i) => (
                <button key={m} aria-label={`Настроение ${i + 1} из 5`} aria-pressed={h.mood === i + 1} onClick={() => saveHealth({ ...h, mood: i + 1 })}
                  className={cn('grid h-14 w-14 place-items-center rounded-full text-3xl transition active:scale-90', h.mood === i + 1 ? 'bg-sun scale-110' : 'bg-bg')}>{m}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="rounded-btn bg-pink-soft p-3"><span className="label !text-pink-text">Сон, часов</span>
              <input type="number" inputMode="decimal" step="0.5" min="0" max="24" className="mt-1 w-full bg-transparent text-[22px] font-extrabold outline-none" value={h.sleep || ''} placeholder="0"
                onChange={(e) => saveHealth({ ...h, sleep: Math.min(24, Number(e.target.value) || 0) })} /></label>
            <label className="rounded-btn bg-leaf-soft p-3"><span className="label !text-leaf-text">Вес, кг</span>
              <input type="number" inputMode="decimal" step="0.1" min="0" className="mt-1 w-full bg-transparent text-[22px] font-extrabold outline-none" value={h.weight ?? ''} placeholder="—"
                onChange={(e) => saveHealth({ ...h, weight: e.target.value ? Number(e.target.value) : undefined })} /></label>
          </div>
          <p className="text-[13px] text-ink2">Средний сон за неделю: <b className="text-ink">{sleepAvg}</b> ч</p>
        </section>

        <section className="card">
          <div className="mb-2 flex items-center justify-between"><h2>Тренировки, минут</h2><Button variant="leaf" size="icon" aria-label="Добавить тренировку" onClick={() => setWOpen(true)}><Plus /></Button></div>
          <div className="h-32" role="img" aria-label="Минуты тренировок за 7 дней">
            <ResponsiveContainer>
              <BarChart data={chart} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
                <XAxis dataKey="d" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B6272' }} />
                <Tooltip cursor={false} formatter={(v) => [`${v} мин`, '']} separator="" contentStyle={{ borderRadius: 14, border: 'none', boxShadow: '0 4px 18px rgba(58,51,64,.12)' }} />
                <Bar dataKey="min" fill="#A8DDB5" radius={[8, 8, 8, 8]} animationDuration={200} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {recent.length === 0 ? <Empty emoji="👟" text="Запишите первую тренировку" /> : (
            <ul className="mt-2 divide-y divide-bg">
              {recent.map((w) => (
                <li key={w.id} className="flex items-center justify-between py-2">
                  <span><b>{w.data.type}</b> · {w.data.minutes} мин <span className="text-[12.5px] text-ink2">· {relDay(w.data.date)}</span></span>
                  <button aria-label="Удалить" onClick={() => remove(w.id)} className="grid h-11 w-11 place-items-center text-ink2/50"><Trash2 size={18} /></button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <div className="mb-2 flex items-center justify-between"><h2>Привычки</h2><Button variant="soft" size="icon" aria-label="Добавить привычку" onClick={() => setHOpen(true)}><Plus /></Button></div>
          {habits.length === 0 ? <p className="py-3 text-ink2">Например: «Витамины», «Прогулка», «Чтение».</p> : (
            <ul className="divide-y divide-bg">
              {habits.map((e) => {
                const streak = (() => { let n = 0; let d = today(); const s = new Set(e.data.doneDates); const dates = lastDays(60).reverse(); for (const x of dates) { if (s.has(x)) n++; else if (x !== d) break } return n })()
                return (
                  <li key={e.id} className="flex items-center justify-between py-2.5">
                    <span className="font-bold">{e.data.emoji} {e.data.title}</span>
                    <span className="flex items-center gap-1 text-[13px] text-ink2">🔥 {streak} дн.
                      <button aria-label="Удалить" onClick={() => remove(e.id)} className="grid h-11 w-11 place-items-center text-ink2/50"><Trash2 size={18} /></button></span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>

      <Sheet open={wOpen} onOpenChange={setWOpen} title="Тренировка">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">{TYPES.map((t) => <Chip key={t} tone="leaf" active={type === t} onClick={() => setType(t)}>{t}</Chip>)}</div>
          <label className="block"><span className="label">Длительность, минут</span>
            <input className="field mt-1" type="number" inputMode="numeric" min="1" value={minutes} onChange={(e) => setMinutes(e.target.value)} /></label>
          <Button size="lg" className="w-full" disabled={!Number(minutes)} onClick={() => { upsert('workout', { date: today(), type, minutes: Number(minutes) }); setWOpen(false) }}>Сохранить</Button>
        </div>
      </Sheet>
      <Sheet open={hOpen} onOpenChange={setHOpen} title="Новая привычка">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">{['💧', '💊', '🚶', '📖', '🧘', '🥗', '😴', '🦷'].map((e) => <button key={e} onClick={() => setHEmoji(e)} className={cn('h-12 w-12 rounded-full text-2xl', hEmoji === e ? 'bg-sun' : 'bg-bg')}>{e}</button>)}</div>
          <input className="field" placeholder="Название" value={hTitle} onChange={(e) => setHTitle(e.target.value)} />
          <Button size="lg" className="w-full" disabled={!hTitle.trim()} onClick={() => { const hb: Habit = { title: hTitle.trim(), emoji: hEmoji, area: 'health', doneDates: [] }; upsert('habit', hb); setHTitle(''); setHOpen(false) }}>Добавить</Button>
        </div>
      </Sheet>
    </div>
  )
}
