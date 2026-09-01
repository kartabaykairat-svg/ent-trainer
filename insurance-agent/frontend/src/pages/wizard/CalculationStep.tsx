import { useEffect, useState } from "react"
import api from "../../api/client"
import type { ClientDetail } from "../../api/types"

interface Formula {
  id: string
  label: string
  description: string
  enabled: boolean
}

interface SchedulePersonForm {
  start_date: string
  periodicity: string
  initial_amount: string
  term_years: string
  indexation_percent: string
  indexation_confirmed: boolean
  initial_buyout: string
}

const emptyForm = (): SchedulePersonForm => ({
  start_date: "",
  periodicity: "ежемесячно",
  initial_amount: "",
  term_years: "5",
  indexation_percent: "7",
  indexation_confirmed: false,
  initial_buyout: "",
})

export default function CalculationStep({
  client,
  onChange,
  onNext,
}: {
  client: ClientDetail
  onChange: () => void
  onNext: () => void
}) {
  const [formulas, setFormulas] = useState<Formula[]>([])
  const [formulaId, setFormulaId] = useState("")
  const [targetAge, setTargetAge] = useState("63")
  const [calcResult, setCalcResult] = useState(client.data.calculation)
  const [busy, setBusy] = useState(false)

  const [c1Form, setC1Form] = useState<SchedulePersonForm>({
    ...emptyForm(),
    start_date: client.data.insurance.guarantee_c1_from,
    initial_amount: client.data.insurance.first_payment_c1,
    indexation_percent: client.data.insurance.indexation_rate,
    indexation_confirmed: client.data.insurance.indexation_confirmed,
  })
  const [c2Form, setC2Form] = useState<SchedulePersonForm>({
    ...emptyForm(),
    start_date: client.data.insurance.guarantee_c2_from,
    initial_amount: client.data.insurance.first_payment_c2,
    indexation_percent: client.data.insurance.indexation_rate,
    indexation_confirmed: client.data.insurance.indexation_confirmed,
  })

  useEffect(() => {
    api.get(`/clients/${client.id}/insurance/formulas`).then((r) => setFormulas(r.data))
  }, [client.id])

  async function runCalculation() {
    setBusy(true)
    try {
      const r = await api.post(`/clients/${client.id}/insurance/calculate`, {
        calculation_date: "",
        target_retirement_age: targetAge ? Number(targetAge) : null,
        formula_id: formulaId,
        extra: {},
      })
      setCalcResult(r.data.result)
      onChange()
    } finally {
      setBusy(false)
    }
  }

  async function generateSchedule() {
    setBusy(true)
    try {
      await api.post(`/clients/${client.id}/insurance/schedule`, {
        c1: {
          ...c1Form,
          initial_amount: Number(c1Form.initial_amount || 0),
          term_years: Number(c1Form.term_years || 0),
          indexation_percent: Number(c1Form.indexation_percent || 0),
          initial_buyout: c1Form.initial_buyout ? Number(c1Form.initial_buyout) : null,
        },
        c2: client.second_insurer
          ? {
              ...c2Form,
              initial_amount: Number(c2Form.initial_amount || 0),
              term_years: Number(c2Form.term_years || 0),
              indexation_percent: Number(c2Form.indexation_percent || 0),
              initial_buyout: c2Form.initial_buyout ? Number(c2Form.initial_buyout) : null,
            }
          : null,
      })
      onChange()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="mb-1 font-semibold text-slate-900">Расчёт пенсионного аннуитета</h3>
        <p className="mb-4 text-sm text-slate-500">
          Возраст и срок до выхода на выплаты рассчитываются автоматически. Формула расчёта суммы выплаты
          загружается из конфигурации — если формула не выбрана или не настроена, суммы выплат нужно ввести вручную.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Целевой возраст выхода на выплаты</span>
            <input value={targetAge} onChange={(e) => setTargetAge(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-sm font-medium text-slate-700">Формула расчёта выплаты</span>
            <select value={formulaId} onChange={(e) => setFormulaId(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
              <option value="">— не выбрана (только расчёт возраста) —</option>
              {formulas.map((f) => (
                <option key={f.id} value={f.id} disabled={!f.enabled}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button onClick={runCalculation} disabled={busy} className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          Рассчитать
        </button>

        {calcResult && (
          <div className="mt-5 rounded-lg bg-slate-50 p-4 text-sm">
            <div className="grid gap-2 sm:grid-cols-2">
              <div>Возраст первого страхователя: <b>{calcResult.age_c1 ?? "—"}</b></div>
              <div>Лет до целевого возраста: <b>{calcResult.years_to_target_c1 ?? "—"}</b></div>
              {client.second_insurer && (
                <>
                  <div>Возраст второго страхователя: <b>{calcResult.age_c2 ?? "—"}</b></div>
                  <div>Лет до целевого возраста: <b>{calcResult.years_to_target_c2 ?? "—"}</b></div>
                </>
              )}
              {calcResult.monthly_payment_c1 && <div>Оценка ежемесячной выплаты (1): <b>{calcResult.monthly_payment_c1} тенге</b></div>}
              {calcResult.monthly_payment_c2 && <div>Оценка ежемесячной выплаты (2): <b>{calcResult.monthly_payment_c2} тенге</b></div>}
            </div>
            {calcResult.warnings.length > 0 && (
              <ul className="mt-3 space-y-1 text-amber-700">
                {calcResult.warnings.map((w, i) => (
                  <li key={i}>⚠️ {w}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="mb-1 font-semibold text-slate-900">График страховых выплат</h3>
        <p className="mb-4 text-sm text-slate-500">Формирует приложение 1 к договору. Индексация применяется только если подтверждена ниже.</p>

        <ScheduleForm title={client.second_insurer ? "Первый застрахованный" : "Застрахованный"} form={c1Form} setForm={setC1Form} />
        {client.second_insurer && <ScheduleForm title="Второй застрахованный" form={c2Form} setForm={setC2Form} />}

        <button onClick={generateSchedule} disabled={busy} className="mt-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          Сформировать график
        </button>

        {client.data.schedule.length > 0 && (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="py-1 pr-4">Дата (1)</th>
                  <th className="py-1 pr-4">Выплата (1)</th>
                  <th className="py-1 pr-4">Выкупная сумма (1)</th>
                  {client.second_insurer && (
                    <>
                      <th className="py-1 pr-4">Дата (2)</th>
                      <th className="py-1 pr-4">Выплата (2)</th>
                      <th className="py-1 pr-4">Выкупная сумма (2)</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {client.data.schedule.slice(0, 12).map((s, i) => (
                  <tr key={i}>
                    <td className="py-1 pr-4">{s.date_c1}</td>
                    <td className="py-1 pr-4">{s.amount_c1}</td>
                    <td className="py-1 pr-4">{s.buyout_c1}</td>
                    {client.second_insurer && (
                      <>
                        <td className="py-1 pr-4">{s.date_c2}</td>
                        <td className="py-1 pr-4">{s.amount_c2}</td>
                        <td className="py-1 pr-4">{s.buyout_c2}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {client.data.schedule.length > 12 && (
              <p className="mt-2 text-xs text-slate-400">Показаны первые 12 из {client.data.schedule.length} строк.</p>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button onClick={onNext} className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
          Далее: подтверждение →
        </button>
      </div>
    </div>
  )
}

function ScheduleForm({ title, form, setForm }: { title: string; form: SchedulePersonForm; setForm: (f: SchedulePersonForm) => void }) {
  return (
    <div className="mb-4 rounded-lg bg-slate-50 p-4">
      <div className="mb-2 text-sm font-semibold text-slate-700">{title}</div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-xs text-slate-500">Дата начала выплат</span>
          <input value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} placeholder="ДД.ММ.ГГГГ" className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-slate-500">Периодичность</span>
          <select value={form.periodicity} onChange={(e) => setForm({ ...form, periodicity: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm">
            <option>ежемесячно</option>
            <option>ежеквартально</option>
            <option>раз в полгода</option>
            <option>ежегодно</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-slate-500">Первоначальная сумма</span>
          <input value={form.initial_amount} onChange={(e) => setForm({ ...form, initial_amount: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-slate-500">Срок графика, лет</span>
          <input value={form.term_years} onChange={(e) => setForm({ ...form, term_years: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-slate-500">Начальная выкупная сумма (необязательно)</span>
          <input value={form.initial_buyout} onChange={(e) => setForm({ ...form, initial_buyout: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
        </label>
        <label className="flex items-end gap-2 pb-1.5 text-sm text-slate-600">
          <input type="checkbox" checked={form.indexation_confirmed} onChange={(e) => setForm({ ...form, indexation_confirmed: e.target.checked })} />
          Применить индексацию {form.indexation_percent}%
        </label>
      </div>
    </div>
  )
}
