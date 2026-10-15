import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import api from "../api/client"
import type { ClientListItem } from "../api/types"
import Layout from "../components/Layout"

const STATUS_LABELS: Record<string, string> = {
  draft: "Черновик",
  data_review: "Проверка данных",
  params_entry: "Параметры страхования",
  confirmed: "Подтверждено",
  generated: "Документы сформированы",
  error: "Ошибка",
}

export default function HistoryPage() {
  const [clients, setClients] = useState<ClientListItem[] | null>(null)

  useEffect(() => {
    api.get<ClientListItem[]>("/clients").then((r) => setClients(r.data))
  }, [])

  return (
    <Layout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">История клиентов</h1>
        <Link to="/clients/new" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
          + Создать нового клиента
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Клиент</th>
              <th className="px-4 py-3 font-medium">Статус</th>
              <th className="px-4 py-3 font-medium">Документы</th>
              <th className="px-4 py-3 font-medium">Дата создания</th>
              <th className="px-4 py-3 font-medium">Изменён</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {clients?.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">{c.masked_full_name}</div>
                  <div className="text-xs text-slate-400">ИИН {c.masked_iin || "—"}</div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      c.needs_review ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {STATUS_LABELS[c.status] ?? c.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {c.contract_generated ? "📄 Договор " : ""}
                  {c.poa_generated ? "📄 Доверенность" : ""}
                  {!c.contract_generated && !c.poa_generated ? "—" : ""}
                </td>
                <td className="px-4 py-3 text-slate-500">{new Date(c.created_at).toLocaleString("ru-RU")}</td>
                <td className="px-4 py-3 text-slate-500">{new Date(c.updated_at).toLocaleString("ru-RU")}</td>
                <td className="px-4 py-3 text-right">
                  <Link to={`/clients/${c.id}`} className="text-sm font-medium text-slate-900 hover:underline">
                    Открыть →
                  </Link>
                </td>
              </tr>
            ))}
            {clients && clients.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  Клиентов пока нет
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Layout>
  )
}
