import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'

export function Auth() {
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    setBusy(true); setMsg('')
    const { data, error } = mode === 'in'
      ? await supabase.auth.signInWithPassword({ email, password: pass })
      : await supabase.auth.signUp({ email, password: pass })
    setBusy(false)
    if (error) setMsg(error.message.includes('Invalid login') ? 'Неверная почта или пароль' : error.message)
    else if (mode === 'up' && !data.session) setMsg('Проверьте почту — мы отправили письмо для подтверждения.')
  }

  return (
    <div className="mx-auto flex min-h-full max-w-[480px] flex-col justify-center px-6 py-10">
      <div className="rise mb-8 text-center">
        <img src="icon.svg" alt="" className="mx-auto mb-4 h-24 w-24" />
        <h1>Мой день</h1>
        <p className="mt-1 text-ink2">Спокойный органайзер для всей жизни</p>
      </div>
      <form onSubmit={submit} className="card space-y-3">
        <input className="field" type="email" required autoComplete="email" placeholder="Электронная почта" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="field" type="password" required minLength={6} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} placeholder="Пароль (от 6 символов)" value={pass} onChange={(e) => setPass(e.target.value)} />
        {msg && <p className="text-[13px] font-semibold text-pink-text">{msg}</p>}
        <Button size="lg" className="w-full" disabled={busy}>{mode === 'in' ? 'Войти' : 'Создать аккаунт'}</Button>
        <button type="button" className="w-full py-2 text-[14px] font-bold text-ink2" onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setMsg('') }}>
          {mode === 'in' ? 'Впервые здесь? Регистрация' : 'Уже есть аккаунт? Войти'}
        </button>
      </form>
    </div>
  )
}
