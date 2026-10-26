import { Trash2 } from 'lucide-react'
import { Check4 } from './ui/bits'
import { area, GROUPS } from '@/lib/areas'
import { patch, remove, type Entry } from '@/lib/store'
import type { Task } from '@/lib/model'
import { cn, relDay, today } from '@/lib/utils'

export function TaskRow({ e, showDate }: { e: Entry<Task>; showDate?: boolean }) {
  const t = e.data
  const a = area(t.area)
  const g = GROUPS[a.group]
  const overdue = !t.done && t.date && t.date < today()
  return (
    <div className="rise flex items-center gap-1 rounded-card bg-white pr-2 shadow-card">
      <Check4 done={t.done} tone={a.group === 'work' ? 'sun' : a.group === 'family' ? 'pink' : 'leaf'}
        onChange={() => patch<Task>(e.id, { done: !t.done, doneAt: !t.done ? new Date().toISOString() : undefined })} />
      <div className="min-w-0 flex-1 py-3">
        <p className={cn('truncate font-bold transition', t.done && 'text-ink2 line-through opacity-60')}>{t.title}</p>
        <div className="mt-1 flex items-center gap-2 text-[12.5px]">
          <span className={cn('rounded-full px-2 py-0.5 font-bold', g.soft, g.text)}>{a.emoji} {a.label}</span>
          {(showDate || overdue) && t.date && <span className={cn('font-semibold', overdue ? 'text-pink-text' : 'text-ink2')}>{overdue ? 'Просрочено · ' : ''}{relDay(t.date)}</span>}
          {t.time && <span className="text-ink2">⏰ {t.time}</span>}
        </div>
      </div>
      <button onClick={() => remove(e.id)} aria-label="Удалить" className="grid h-11 w-11 place-items-center text-ink2/50 active:text-pink-strong"><Trash2 size={18} /></button>
    </div>
  )
}
