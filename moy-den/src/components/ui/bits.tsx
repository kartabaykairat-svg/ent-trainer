import { Check } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function Check4({ done, onChange, tone = 'leaf' }: { done: boolean; onChange: () => void; tone?: 'leaf' | 'pink' | 'sun' }) {
  const on = { leaf: 'bg-leaf-strong border-leaf-strong', pink: 'bg-pink-strong border-pink-strong', sun: 'bg-sun-strong border-sun-strong' }[tone]
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onChange() }}
      aria-label={done ? 'Снять отметку' : 'Отметить выполненным'}
      aria-pressed={done}
      className="grid h-11 w-11 shrink-0 place-items-center"
    >
      <span className={cn('grid h-7 w-7 place-items-center rounded-full border-2 transition', done ? on : 'border-ink/20 bg-white')}>
        {done && <Check size={16} strokeWidth={3.5} className="text-white" />}
      </span>
    </button>
  )
}

export function Chip({ active, onClick, children, tone = 'pink' }: { active?: boolean; onClick?: () => void; children: ReactNode; tone?: 'pink' | 'sun' | 'leaf' }) {
  const on = { pink: 'bg-pink-strong text-white', sun: 'bg-sun text-sun-text', leaf: 'bg-leaf-strong text-white' }[tone]
  return (
    <button type="button" onClick={onClick} className={cn('h-10 shrink-0 rounded-full px-4 text-[14px] font-bold transition active:scale-95', active ? on : 'bg-white text-ink2 shadow-card')}>
      {children}
    </button>
  )
}

export function Ring({ value, size = 92, stroke = 11, children }: { value: number; size?: number; stroke?: number; children?: ReactNode }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#FFF4CC" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#4DB06E" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, value))} style={{ transition: 'stroke-dashoffset .25s ease' }} />
      </svg>
      <div className="absolute text-center">{children}</div>
    </div>
  )
}

export const Empty = ({ emoji, text }: { emoji: string; text: string }) => (
  <div className="rise py-10 text-center text-ink2"><div className="mb-2 text-4xl">{emoji}</div><p>{text}</p></div>
)
export const ScreenHead = ({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) => (
  <header className="flex items-start justify-between px-4 pb-3 pt-6 pt-safe">
    <div><h1>{title}</h1>{sub && <p className="mt-0.5 text-[13px] text-ink2 first-letter:uppercase">{sub}</p>}</div>
    {right}
  </header>
)
