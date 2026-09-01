import { useState } from "react"
import { useNavigate } from "react-router-dom"
import api from "../api/client"
import Layout from "../components/Layout"

export default function NewClientPage() {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)

  async function create(secondInsurer: boolean) {
    setBusy(true)
    try {
      const r = await api.post("/clients", { second_insurer: secondInsurer })
      navigate(`/clients/${r.data.id}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Layout>
      <h1 className="text-2xl font-semibold text-slate-900">Новый клиент</h1>
      <p className="mt-1 text-slate-500">Выберите, сколько страхователей участвует в договоре</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 max-w-2xl">
        <button
          disabled={busy}
          onClick={() => create(false)}
          className="rounded-xl border-2 border-slate-200 bg-white p-6 text-left hover:border-slate-900 disabled:opacity-50"
        >
          <div className="text-3xl">👤</div>
          <div className="mt-3 font-semibold text-slate-900">Один страхователь</div>
          <div className="mt-1 text-sm text-slate-500">Договор оформляется на одного человека</div>
        </button>
        <button
          disabled={busy}
          onClick={() => create(true)}
          className="rounded-xl border-2 border-slate-200 bg-white p-6 text-left hover:border-slate-900 disabled:opacity-50"
        >
          <div className="text-3xl">👥</div>
          <div className="mt-3 font-semibold text-slate-900">Два страхователя</div>
          <div className="mt-1 text-sm text-slate-500">Договор оформляется на двух человек совместно</div>
        </button>
      </div>
    </Layout>
  )
}
