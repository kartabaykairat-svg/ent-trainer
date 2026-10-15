import { useRef, useState } from "react"
import api from "../../api/client"
import { DOC_TYPE_LABELS, type ClientDetail } from "../../api/types"

const DOC_TYPE_OPTIONS = Object.entries(DOC_TYPE_LABELS)

export default function UploadStep({
  client,
  onChange,
  onNext,
}: {
  client: ClientDetail
  onChange: () => void
  onNext: () => void
}) {
  const [belongsTo, setBelongsTo] = useState<"c1" | "c2">("c1")
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [lastUnrecognized, setLastUnrecognized] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  async function uploadFiles(files: FileList | File[]) {
    if (!files || (files as FileList).length === 0) return
    setUploading(true)
    setLastUnrecognized([])
    const form = new FormData()
    Array.from(files).forEach((f) => form.append("files", f))
    try {
      const r = await api.post(`/clients/${client.id}/documents?belongs_to=${belongsTo}`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      const unrecognized = (r.data.uploaded as any[]).filter((u) => !u.error && !u.doc_type_recognized).map((u) => u.filename)
      setLastUnrecognized(unrecognized)
      onChange()
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  async function setDocType(docId: string, docType: string) {
    await api.post(`/clients/${client.id}/documents/${docId}/type`, { doc_type: docType })
    onChange()
  }

  async function deleteDoc(docId: string) {
    await api.delete(`/clients/${client.id}/documents/${docId}`)
    onChange()
  }

  const docsFor = (who: "c1" | "c2") => client.documents.filter((d) => d.belongs_to === who)

  return (
    <div className="space-y-8">
      {client.second_insurer && (
        <div className="flex gap-2">
          {(["c1", "c2"] as const).map((who) => (
            <button
              key={who}
              onClick={() => setBelongsTo(who)}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${
                belongsTo === who ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600"
              }`}
            >
              {who === "c1" ? "Первый страхователь" : "Второй страхователь"}
            </button>
          ))}
        </div>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          uploadFiles(e.dataTransfer.files)
        }}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center transition-colors ${
          dragOver ? "border-slate-900 bg-slate-50" : "border-slate-300 bg-white hover:border-slate-400"
        }`}
      >
        <div className="text-4xl">📄</div>
        <p className="mt-3 font-medium text-slate-900">Перетащите документы клиента сюда</p>
        <p className="mt-1 text-sm text-slate-500">или нажмите, чтобы выбрать файлы · JPG, JPEG, PNG, PDF, DOCX</p>
        {uploading && <p className="mt-3 text-sm text-slate-500">Загрузка и распознавание...</p>}
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.pdf,.docx"
          className="hidden"
          onChange={(e) => e.target.files && uploadFiles(e.target.files)}
        />
      </div>

      {lastUnrecognized.length > 0 && (
        <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Не удалось определить тип документа: {lastUnrecognized.join(", ")}. Выберите тип документа вручную ниже.
        </div>
      )}

      {(client.second_insurer ? (["c1", "c2"] as const) : (["c1"] as const)).map((who) => {
        const docs = docsFor(who)
        if (docs.length === 0) return null
        return (
          <div key={who}>
            {client.second_insurer && (
              <h3 className="mb-2 text-sm font-semibold text-slate-700">
                {who === "c1" ? "Документы первого страхователя" : "Документы второго страхователя"}
              </h3>
            )}
            <div className="space-y-2">
              {docs.map((d) => (
                <div key={d.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3">
                  <div>
                    <div className="font-medium text-slate-900">{d.filename}</div>
                    <div className="text-xs text-slate-500">
                      OCR-уверенность: {Math.round(d.ocr_confidence)}% {!d.has_file ? "· файл удалён" : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={d.doc_type}
                      onChange={(e) => setDocType(d.id, e.target.value)}
                      className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                    >
                      {DOC_TYPE_OPTIONS.map(([val, label]) => (
                        <option key={val} value={val}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <button onClick={() => deleteDoc(d.id)} className="text-sm text-red-500 hover:underline">
                      Удалить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      <div className="flex justify-end">
        <button
          onClick={onNext}
          disabled={client.documents.length === 0}
          className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-40"
        >
          Далее: проверить данные →
        </button>
      </div>
    </div>
  )
}
