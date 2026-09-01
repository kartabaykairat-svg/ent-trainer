import type { Confidence } from "../api/types"

const CONFIG: Record<Confidence, { label: string; cls: string; dot: string }> = {
  high: { label: "Высокая уверенность", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200", dot: "🟢" },
  medium: { label: "Требует проверки", cls: "bg-amber-50 text-amber-700 ring-amber-200", dot: "🟡" },
  low: { label: "Низкая уверенность", cls: "bg-red-50 text-red-700 ring-red-200", dot: "🔴" },
  missing: { label: "Данные отсутствуют — требуется ввод менеджера", cls: "bg-slate-100 text-slate-500 ring-slate-200", dot: "⚪" },
}

export default function ConfidenceBadge({ confidence, compact = false }: { confidence: Confidence; compact?: boolean }) {
  const c = CONFIG[confidence] ?? CONFIG.missing
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${c.cls}`}>
      <span>{c.dot}</span>
      {!compact && <span>{c.label}</span>}
    </span>
  )
}
