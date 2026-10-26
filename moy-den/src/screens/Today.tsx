import { useState } from 'react'
import { Droplets, Plus } from 'lucide-react'
import { greeting, fmtLong, today, cn } from '@/lib/utils'
import { useTasks, useHabits, useWorkouts, useHealth, saveHealth, type Habit } from '@/lib/model'
import { patch } from '@/lib/store'
import { weekBalance, balanceHint } from '@/lib/balance'
import { Ring, Empty, ScreenHead } from '@/components/ui/bits'
import { TaskRow } from '@/components/TaskRow'
import { BalanceBar } from '@/components/BalanceBar'
import { QuickAdd } from '@/components/QuickAdd'
import { Button } from '@/components/ui/button'

export function Today() {
  const tasks = useTasks()
  const habits = useHabits()
  const workouts = useWorkouts()
  const h = useHealth()
  const [add, setAdd] = useState(false)
  const t = today()

  const list = tasks
    .filter((e) => e.data.date === t || (!e.data.done && e.data.date && e.data.date < t))
    .sort((a, b) => Number(a.data.done) - Number(b.data.done) || (a.data.time ?? '99').localeCompare(b.data.time ?? '99'))
  const done = list.filter((e) => e.data.done).length
  const bal = weekBalance(tasks, workouts)

  const toggleHabit = (id: string, hb: Habit) =>
    patch<Habit>(id, { doneDates: hb.doneDates.includes(t) ? hb.doneDates.filter((d) => d !== t) : [...hb.doneDates, t] })

  return (
    <div className="pb-4">
      <ScreenHead title={`${greeting()}!`} sub={fmtLong(t)} />
      <div className="space-y-4 px-4">
        <section className="card rise flex items-center gap-4">
          <Ring value={list.length ? done / list.length : 0}>
            <div className="text-[22px] font-extrabold leading-none">{done}/{list.length}</div>
            <div className="text-[11px] font-semibold text-ink2">дел</div>
          </Ring>
          <div className="min-w-0 flex-1">
            <h2>Баланс недели</h2>
            <div className="mt-2"><BalanceBar b={bal} /></div>
          </div>
        </section>
        <p className="rise -mt-1 rounded-card bg-sun-soft px-4 py-3 text-[14px] font-semibold text-sun-text">{balanceHint(bal)}</p>

        {habits.length > 0 && (
          <section>
            <h2 className="mb-2">Привычки</h2>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
              {habits.map((e) => {
                const on = e.data.doneDates.includes(t)
                return (
                  <button key={e.id} onClick={() => toggleHabit(e.id, e.data)} aria-pressed={on}
                    className={cn('flex h-14 shrink-0 items-center gap-2 rounded-btn px-4 font-bold shadow-card transition active:scale-95', on ? 'bg-leaf text-leaf-text' : 'bg-white')}>
                    <span className="text-xl">{e.data.emoji}</span>{e.data.title}
                  </button>
                )
              })}
            </div>
          </section>
        )}

        <section className="card flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-full bg-pink-soft text-pink-strong"><Droplets size={22} /></div>
          <div className="flex-1">
            <p className="font-bold">Вода: {h.water} / 8 стаканов</p>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-bg"><div className="h-full rounded-full bg-pink transition-all" style={{ width: `${Math.min(100, (h.water / 8) * 100)}%` }} /></div>
          </div>
          <Button variant="soft" size="icon" aria-label="Добавить стакан" onClick={() => saveHealth({ ...h, water: h.water + 1 })}><Plus /></Button>
        </section>

        <section>
          <h2 className="mb-2">План на сегодня</h2>
          {list.length === 0 ? <Empty emoji="🌼" text="На сегодня пока пусто. Добавьте первое дело!" /> : <div className="space-y-2">{list.map((e) => <TaskRow key={e.id} e={e} />)}</div>}
        </section>
      </div>
      <button onClick={() => setAdd(true)} aria-label="Добавить задачу"
        className="fixed bottom-[calc(84px+env(safe-area-inset-bottom))] right-[max(1rem,calc(50%-224px))] z-20 grid h-16 w-16 place-items-center rounded-full bg-pink-strong text-white shadow-[0_8px_22px_rgba(231,84,128,.4)] transition active:scale-90">
        <Plus size={30} strokeWidth={3} />
      </button>
      <QuickAdd open={add} onOpenChange={setAdd} />
    </div>
  )
}
