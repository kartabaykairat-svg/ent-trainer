import { useState } from 'react'
import { Sheet } from './ui/sheet'
import { Button } from './ui/button'
import { Chip } from './ui/bits'
import { AREAS, type AreaId } from '@/lib/areas'
import { upsert } from '@/lib/store'
import type { Task } from '@/lib/model'
import { addDays, today } from '@/lib/utils'

export function QuickAdd({ open, onOpenChange, defaultArea = 'work' }: { open: boolean; onOpenChange: (o: boolean) => void; defaultArea?: AreaId }) {
  const [title, setTitle] = useState('')
  const [areaId, setAreaId] = useState<AreaId>(defaultArea)
  const [when, setWhen] = useState<'today' | 'tomorrow' | 'later' | 'custom'>('today')
  const [custom, setCustom] = useState(addDays(today(), 2))
  const [time, setTime] = useState('')

  const save = () => {
    if (!title.trim()) return
    const date = when === 'today' ? today() : when === 'tomorrow' ? addDays(today(), 1) : when === 'custom' ? custom : null
    const t: Task = { title: title.trim(), area: areaId, date, done: false, ...(time && date ? { time } : {}) }
    upsert('task', t)
    setTitle(''); setTime(''); setWhen('today')
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Новая задача">
      <form onSubmit={(e) => { e.preventDefault(); save() }} className="space-y-4">
        <input autoFocus className="field" placeholder="Что нужно сделать?" value={title} onChange={(e) => setTitle(e.target.value)} />
        <div>
          <p className="label mb-2">Сфера</p>
          <div className="flex flex-wrap gap-2">
            {AREAS.map((a) => <Chip key={a.id} active={areaId === a.id} onClick={() => setAreaId(a.id)}>{a.emoji} {a.label}</Chip>)}
          </div>
        </div>
        <div>
          <p className="label mb-2">Когда</p>
          <div className="flex flex-wrap gap-2">
            <Chip tone="sun" active={when === 'today'} onClick={() => setWhen('today')}>Сегодня</Chip>
            <Chip tone="sun" active={when === 'tomorrow'} onClick={() => setWhen('tomorrow')}>Завтра</Chip>
            <Chip tone="sun" active={when === 'custom'} onClick={() => setWhen('custom')}>Дата…</Chip>
            <Chip tone="sun" active={when === 'later'} onClick={() => setWhen('later')}>Без даты</Chip>
          </div>
          {when === 'custom' && <input type="date" className="field mt-3" value={custom} onChange={(e) => setCustom(e.target.value)} />}
          {when !== 'later' && (
            <label className="mt-3 flex items-center gap-3">
              <span className="label">Напомнить в</span>
              <input type="time" className="field !w-auto" value={time} onChange={(e) => setTime(e.target.value)} />
            </label>
          )}
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={!title.trim()}>Добавить</Button>
      </form>
    </Sheet>
  )
}
