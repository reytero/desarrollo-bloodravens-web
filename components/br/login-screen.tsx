'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { api, errorMessage } from '@/lib/br/client'
import { cn } from '@/lib/utils'
import { Btn, ErrorNote, Field, Input } from './ui'

type Tab = 'login' | 'register'

export function LoginScreen() {
  const [tab, setTab] = useState<Tab>('login')

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,#b91c1c1f,transparent_60%)]"
      />
      <div className="relative flex w-full max-w-md flex-col gap-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <Image
            src="/images/bloodravens-shield.png"
            alt="Escudo de la casa BloodRavens"
            width={112}
            height={112}
            priority
            className="h-28 w-auto object-contain"
          />
          <div className="flex flex-col gap-1">
            <h1 className="font-serif text-3xl tracking-wide text-foreground">BloodRavens</h1>
            <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-blood">Red encriptada · Los Santos</p>
          </div>
        </div>

        <div className="border border-border bg-card">
          <div role="tablist" aria-label="Acceso a la red" className="grid grid-cols-2 border-b border-border">
            {(
              [
                ['login', 'Iniciar sesión'],
                ['register', 'Solicitar ingreso'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                role="tab"
                type="button"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={cn(
                  'h-12 border-b-2 font-mono text-[11px] uppercase tracking-[0.2em] transition-colors',
                  tab === key ? 'border-blood text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="p-6">{tab === 'login' ? <LoginForm /> : <RegisterForm onDone={() => setTab('login')} />}</div>
        </div>

        <p className="text-center font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground/70">
          Canal privado · Toda actividad queda registrada
        </p>
      </div>
    </main>
  )
}

function LoginForm() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setBusy(true)
    setError(null)
    try {
      await api('POST', '/api/auth/login', { alias: form.get('alias'), password: form.get('password') })
      router.refresh()
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Field label="Alias:">{(id) => <Input id={id} name="alias" autoComplete="username" required maxLength={40} />}</Field>
      <Field label="Contraseña:">
        {(id) => <Input id={id} name="password" type="password" autoComplete="current-password" required />}
      </Field>
      <ErrorNote message={error} />
      <Btn type="submit" variant="primary" loading={busy} className="mt-2 w-full">
        Entrar a la red
      </Btn>
    </form>
  )
}

function RegisterForm({ onDone }: { onDone: () => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setBusy(true)
    setError(null)
    try {
      await api('POST', '/api/auth/register', {
        alias: form.get('alias'),
        ic_name: form.get('ic_name'),
        password: form.get('password'),
      })
      setSent(true)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold">Solicitud enviada</span>
        <p className="text-sm leading-relaxed text-muted-foreground">
          La Corona revisará tu solicitud. Podrás iniciar sesión cuando tu ingreso sea aprobado.
        </p>
        <Btn type="button" onClick={onDone}>
          Volver al acceso
        </Btn>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Field label="Alias:">
        {(id) => <Input id={id} name="alias" autoComplete="username" required minLength={3} maxLength={40} />}
      </Field>
      <Field label="Nombre IC:">{(id) => <Input id={id} name="ic_name" required maxLength={80} />}</Field>
      <Field label="Contraseña:" hint="Mínimo 8 caracteres.">
        {(id) => <Input id={id} name="password" type="password" autoComplete="new-password" required minLength={8} />}
      </Field>
      <ErrorNote message={error} />
      <Btn type="submit" variant="primary" loading={busy} className="mt-2 w-full">
        Enviar solicitud
      </Btn>
    </form>
  )
}
