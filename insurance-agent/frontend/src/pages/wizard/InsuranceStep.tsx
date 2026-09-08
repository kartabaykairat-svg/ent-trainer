import { useState } from "react"
import api from "../../api/client"
import type { BeneficiaryData, ClientDetail, InsuranceParams } from "../../api/types"

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
      />
    </label>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="mb-4 font-semibold text-slate-900">{title}</h3>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </div>
  )
}

export default function InsuranceStep({
  client,
  onChange,
  onNext,
}: {
  client: ClientDetail
  onChange: () => void
  onNext: () => void
}) {
  const [ins, setIns] = useState<InsuranceParams>(client.data.insurance)
  const [beneficiary, setBeneficiary] = useState<BeneficiaryData>(client.data.beneficiary)
  const [repEnabled, setRepEnabled] = useState(client.data.representative_override_enabled)
  const [rep, setRep] = useState(client.data.representative)
  const [saving, setSaving] = useState(false)

  function set<K extends keyof InsuranceParams>(key: K, value: InsuranceParams[K]) {
    setIns((prev) => ({ ...prev, [key]: value }))
  }

  async function saveAll() {
    setSaving(true)
    try {
      await api.put(`/clients/${client.id}/insurance`, ins)
      await api.put(`/clients/${client.id}/insurance/beneficiary`, beneficiary)
      await api.put(`/clients/${client.id}/insurance/representative`, { enabled: repEnabled, representative: rep })
      onChange()
      onNext()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <Section title="Договор">
        <Field label="Номер договора" value={ins.contract_number} onChange={(v) => set("contract_number", v)} />
        <Field label="Дата договора (ДД.ММ.ГГГГ)" value={ins.contract_date} onChange={(v) => set("contract_date", v)} />
        <Field label="Город заключения" value={ins.contract_city} onChange={(v) => set("contract_city", v)} />
      </Section>

      <Section title="Страховая премия — первый страхователь">
        <Field label="Выкупная сумма из другой СК" value={ins.premium_other_org_c1} onChange={(v) => set("premium_other_org_c1", v)} />
        <Field label="Пенсионные накопления из ЕНПФ" value={ins.premium_enpf_c1} onChange={(v) => set("premium_enpf_c1", v)} />
        <Field label="Собственные средства" value={ins.premium_own_c1} onChange={(v) => set("premium_own_c1", v)} />
        <Field label="Первая ежемесячная выплата" value={ins.first_payment_c1} onChange={(v) => set("first_payment_c1", v)} />
        <Field label="Гарантированный период — с" value={ins.guarantee_c1_from} onChange={(v) => set("guarantee_c1_from", v)} />
        <Field label="Гарантированный период — по" value={ins.guarantee_c1_to} onChange={(v) => set("guarantee_c1_to", v)} />
      </Section>

      {client.second_insurer && (
        <Section title="Страховая премия — второй страхователь">
          <Field label="Выкупная сумма из другой СК" value={ins.premium_other_org_c2} onChange={(v) => set("premium_other_org_c2", v)} />
          <Field label="Пенсионные накопления из ЕНПФ" value={ins.premium_enpf_c2} onChange={(v) => set("premium_enpf_c2", v)} />
          <Field label="Собственные средства" value={ins.premium_own_c2} onChange={(v) => set("premium_own_c2", v)} />
          <Field label="Первая ежемесячная выплата" value={ins.first_payment_c2} onChange={(v) => set("first_payment_c2", v)} />
          <Field label="Гарантированный период — с" value={ins.guarantee_c2_from} onChange={(v) => set("guarantee_c2_from", v)} />
          <Field label="Гарантированный период — по" value={ins.guarantee_c2_to} onChange={(v) => set("guarantee_c2_to", v)} />
        </Section>
      )}

      <Section title="Страховые выплаты">
        <Field label="Срок гарантированных выплат (лет)" value={ins.guarantee_years} onChange={(v) => set("guarantee_years", v)} />
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Периодичность выплат</span>
          <select
            value={ins.payment_periodicity}
            onChange={(e) => set("payment_periodicity", e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option>ежемесячно</option>
            <option>ежеквартально</option>
            <option>раз в полгода</option>
            <option>ежегодно</option>
          </select>
        </label>
        <Field label="Единовременная выплата на погребение" value={ins.death_benefit} onChange={(v) => set("death_benefit", v)} />
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Ставка индексации, %</span>
          <div className="flex items-center gap-2">
            <input
              value={ins.indexation_rate}
              onChange={(e) => set("indexation_rate", e.target.value)}
              className="w-24 rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <label className="flex items-center gap-1.5 text-sm text-slate-600">
              <input type="checkbox" checked={ins.indexation_confirmed} onChange={(e) => set("indexation_confirmed", e.target.checked)} />
              Подтверждаю применение индексации
            </label>
          </div>
        </label>
      </Section>

      <Section title="Банковские реквизиты">
        <Field label="Банк (первый страхователь)" value={ins.bank_name_c1} onChange={(v) => set("bank_name_c1", v)} />
        <Field label="IBAN / счёт (первый страхователь)" value={ins.bank_account_c1} onChange={(v) => set("bank_account_c1", v)} />
        {client.second_insurer && (
          <>
            <Field label="Банк (второй страхователь)" value={ins.bank_name_c2} onChange={(v) => set("bank_name_c2", v)} />
            <Field label="IBAN / счёт (второй страхователь)" value={ins.bank_account_c2} onChange={(v) => set("bank_account_c2", v)} />
          </>
        )}
      </Section>

      <Section title="Получатель гарантированных выплат (по желанию страхователя)">
        <Field label="ФИО" value={beneficiary.full_name} onChange={(v) => setBeneficiary({ ...beneficiary, full_name: v })} />
        <Field label="Адрес" value={beneficiary.address} onChange={(v) => setBeneficiary({ ...beneficiary, address: v })} />
        <Field label="ИИН" value={beneficiary.iin} onChange={(v) => setBeneficiary({ ...beneficiary, iin: v })} />
        <Field label="Документ" value={beneficiary.document} onChange={(v) => setBeneficiary({ ...beneficiary, document: v })} />
      </Section>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <label className="flex items-center gap-2 font-semibold text-slate-900">
          <input type="checkbox" checked={repEnabled} onChange={(e) => setRepEnabled(e.target.checked)} />
          Изменить представителя в доверенности
        </label>
        <p className="mt-1 text-sm text-slate-500">
          По умолчанию в доверенности используется представитель, уже указанный в шаблоне (УНДИЗОВА ФАГИЛЯМ МУХАМЕТЖАНОВНА).
        </p>
        {repEnabled && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="ФИО представителя" value={rep.full_name} onChange={(v) => setRep({ ...rep, full_name: v })} />
            <Field label="Дата рождения" value={rep.birth_date} onChange={(v) => setRep({ ...rep, birth_date: v })} />
            <Field label="ИИН" value={rep.iin} onChange={(v) => setRep({ ...rep, iin: v })} />
            <Field label="Место рождения" value={rep.birth_place} onChange={(v) => setRep({ ...rep, birth_place: v })} />
            <Field label="Адрес регистрации" value={rep.address} onChange={(v) => setRep({ ...rep, address: v })} />
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button onClick={saveAll} disabled={saving} className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
          {saving ? "Сохранение..." : "Далее: расчёт и график →"}
        </button>
      </div>
    </div>
  )
}
