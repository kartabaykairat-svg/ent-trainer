export default function StatCard({ label, value, tone = "default" }: { label: string; value: number | string; tone?: "default" | "warning" | "danger" }) {
  const toneCls = {
    default: "text-slate-900",
    warning: "text-amber-600",
    danger: "text-red-600",
  }[tone]
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="text-sm text-slate-500">{label}</div>
      <div className={`mt-2 text-3xl font-semibold ${toneCls}`}>{value}</div>
    </div>
  )
}
