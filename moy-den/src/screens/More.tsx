import { useState } from 'react'
import { Bell, LogOut, RefreshCw, Cloud, CloudOff } from 'lucide-react'
import { Bar, BarChart, ResponsiveContainer, XAxis, Tooltip, Legend } from 'recharts'
import { useTasks, useWorkouts } from '@/lib/model'
import { useStore, pendingCount, sync } from '@/lib/store'
import { cloudEnabled, supabase } from '@/lib/supabase'
import { weekBalance, balanceHint } from '@/lib/balance'
import { BalanceBar } from '@/components/BalanceBar'
import { Button } from '@/components/ui/button'
import { ScreenHead } from '@/components/ui/bits'
import { askPermission, notifySupported } from '@/lib/notify'
import { GROUPS, area, type Group } from '@/lib/areas'
import { dkey, fmtDow, lastDays } from '@/lib/utils'

export function More() {
  const tasks = useTasks()
  const workouts = useWorkouts()
  const pending = useStore(pendingCount)
  const online = useStore((s) => s.online)
  const syncing = useStore((s) => s.syncing)
  const error = useStore((s) => s.error)
  const [perm, setPerm] = useState(notifySupported() ? Notification.permission : 'denied')
  const b = weekBalance(tasks, workouts)

  const data = lastDays(7).map((d) => {
    const row: Record<string, number | string> = { d: fmtDow(d), work: 0, family: 0, me: 0 }
    for (const e of tasks) if (e.data.done && (e.data.doneAt ? dkey(new Date(e.data.doneAt)) : e.data.date) === d) row[area(e.data.area).group] = (row[area(e.data.area).group] as number) + 1
    for (const w of workouts) if (w.data.date === d) row.me = (row.me as number) + 1
    return row
  })

  return (
    <div className="pb-4">
      <ScreenHead title="Баланс" />
      <div className="space-y-4 px-4">
        <section className="card rise">
          <h2 className="mb-2">Неделя в цифрах</h2>
          <BalanceBar b={b} />
          <p className="mt-3 text-[14px] text-ink2">{balanceHint(b)}</p>
          <div className="mt-3 h-40" role="img" aria-label="Выполненные дела по дням и сферам">
            <ResponsiveContainer>
              <BarChart data={data} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
                <XAxis dataKey="d" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B6272' }} />
                <Tooltip cursor={false} contentStyle={{ borderRadius: 14, border: 'none', boxShadow: '0 4px 18px rgba(58,51,64,.12)' }} />
                <Legend iconType="circle" formatter={(v) => GROUPS[v as Group].label} wrapperStyle={{ fontSize: 12 }} />
                {(['work', 'family', 'me'] as Group[]).map((g) => <Bar key={g} dataKey={g} name={g} stackId="a" fill={GROUPS[g].hex} animationDuration={200} />)}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="card space-y-3">
          <h2>Синхронизация</h2>
          <p className="flex items-center gap-2 text-ink2">
            {cloudEnabled && online ? <Cloud size={18} className="text-leaf-strong" /> : <CloudOff size={18} />}
            {!cloudEnabled ? 'Облако не подключено — данные хранятся на этом устройстве'
              : !online ? 'Нет сети — изменения сохранятся и отправятся позже'
              : syncing ? 'Синхронизирую…' : pending ? `Ждут отправки: ${pending}` : 'Всё синхронизировано'}
          </p>
          {error && <p className="text-[13px] font-semibold text-pink-text">{error}</p>}
          {cloudEnabled && <Button variant="leaf" className="w-full" onClick={() => void sync()}><RefreshCw size={18} /> Синхронизировать сейчас</Button>}
        </section>

        <section className="card space-y-3">
          <h2>Напоминания</h2>
          <p className="text-[13px] text-ink2">Для задач со временем приложение пришлёт уведомление, пока оно открыто или работает в фоне.</p>
          <Button variant="sun" className="w-full" disabled={!notifySupported() || perm === 'granted'} onClick={async () => setPerm(await askPermission())}>
            <Bell size={18} /> {perm === 'granted' ? 'Уведомления включены' : perm === 'denied' ? 'Заблокировано в настройках' : 'Включить уведомления'}
          </Button>
        </section>

        {supabase && <Button variant="soft" className="w-full" onClick={() => supabase!.auth.signOut()}><LogOut size={18} /> Выйти</Button>}
      </div>
    </div>
  )
}
