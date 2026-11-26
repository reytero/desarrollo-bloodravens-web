'use client'

import { Check, Copy, Loader2, X } from 'lucide-react'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function SectionHeader({
  code,
  title,
  description,
  action,
}: {
  code: string
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <header className="flex flex-col gap-4 border-b border-border pb-5 md:flex-row md:items-end md:justify-between">
      <div className="flex flex-col gap-1.5">
        <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-blood">{code}</span>
        <h1 className="font-serif text-2xl text-foreground text-balance md:text-3xl">{title}</h1>
        {description ? <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
    </header>
  )
}

export function Panel({
  title,
  code,
  action,
  children,
  className,
}: {
  title?: string
  code?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('flex flex-col border border-border bg-card', className)}>
      {title ? (
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex items-baseline gap-2">
            {code ? <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-blood">{code}</span> : null}
            <h2 className="font-serif text-base text-foreground">{title}</h2>
          </div>
          {action}
        </div>
      ) : null}
      <div className="flex flex-1 flex-col">{children}</div>
    </section>
  )
}

type BtnVariant = 'primary' | 'ghost' | 'outline' | 'danger'

export function Btn({
  variant = 'outline',
  size = 'md',
  loading,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: 'sm' | 'md'; loading?: boolean }) {
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-mono uppercase tracking-[0.15em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'h-8 px-3 text-[10px]' : 'h-10 px-4 text-[11px]',
        variant === 'primary' && 'bg-blood text-primary-foreground hover:bg-blood-deep',
        variant === 'outline' && 'border border-border bg-raised text-foreground hover:border-muted-foreground/50',
        variant === 'ghost' && 'text-muted-foreground hover:bg-raised hover:text-foreground',
        variant === 'danger' && 'border border-blood/60 text-blood hover:bg-blood hover:text-primary-foreground',
        className,
      )}
    >
      {loading ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : null}
      {children}
    </button>
  )
}

export function IconBtn({
  label,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      {...props}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex size-8 items-center justify-center border border-transparent text-muted-foreground transition-colors hover:border-border hover:bg-raised hover:text-foreground disabled:opacity-40',
        className,
      )}
    >
      {children}
    </button>
  )
}

const inputCls =
  'w-full border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-blood/70 focus:outline-none'

export function Field({
  label,
  children,
  hint,
}: {
  label: string
  children: (id: string) => ReactNode
  hint?: string
}) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </label>
      {children(id)}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputCls, 'h-10', props.className)} />
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={4} {...props} className={cn(inputCls, 'resize-y leading-relaxed', props.className)} />
}

export function Select({
  options,
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { options: readonly string[] }) {
  return (
    <select {...props} className={cn(inputCls, 'h-10 appearance-auto', className)}>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  )
}

export function FilterChips({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly string[]
  value: string
  onChange: (v: string) => void
  label: string
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          aria-pressed={value === o}
          onClick={() => onChange(o)}
          className={cn(
            'h-8 border px-3 font-mono text-[10px] uppercase tracking-[0.15em] transition-colors',
            value === o
              ? 'border-blood bg-blood/15 text-foreground'
              : 'border-border bg-card text-muted-foreground hover:text-foreground',
          )}
        >
          {o}
        </button>
      ))}
    </div>
  )
}

const toneCls = {
  neutral: 'border-border text-muted-foreground',
  red: 'border-blood/60 bg-blood/10 text-[#e0625c]',
  gold: 'border-gold/50 bg-gold/10 text-gold',
  green: 'border-ok/50 bg-ok/10 text-[#8fb486]',
  amber: 'border-warn/50 bg-warn/10 text-warn',
} as const

export type Tone = keyof typeof toneCls

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em]',
        toneCls[tone],
      )}
    >
      {children}
    </span>
  )
}

export function riskTone(risk: string): Tone {
  if (risk === 'CRÍTICO') return 'red'
  if (risk === 'ALTO') return 'amber'
  if (risk === 'MEDIO') return 'gold'
  return 'green'
}

export function rankTone(rank: string): Tone {
  if (rank === 'Corona' || rank === 'Alto Mando') return 'gold'
  if (rank === 'Sicario') return 'red'
  return 'neutral'
}

export function memberTone(status: string): Tone {
  if (status === 'Activo') return 'green'
  if (status === 'Buscado') return 'red'
  return 'neutral'
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 border border-dashed border-border px-6 py-12 text-center">
      <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70">Sin registros</span>
      <p className="font-serif text-lg text-foreground">{title}</p>
      {description ? <p className="max-w-sm text-sm text-muted-foreground">{description}</p> : null}
      {action}
    </div>
  )
}

export function LoadingRows() {
  return (
    <div className="flex flex-col gap-2" aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando</span>
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-12 animate-pulse bg-raised" />
      ))}
    </div>
  )
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p role="alert" className="border border-blood/50 bg-blood/10 px-3 py-2 text-sm text-[#e8807a]">
      {message}
    </p>
  )
}

export function CopyButton({ value, label = 'Copiar' }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <IconBtn
      type="button"
      label={copied ? 'Copiado' : label}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        } catch {
          setCopied(false)
        }
      }}
    >
      {copied ? <Check className="size-3.5 text-ok" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
    </IconBtn>
  )
}

export function Modal({
  open,
  onClose,
  title,
  code,
  children,
  wide,
}: {
  open: boolean
  onClose: () => void
  title: string
  code?: string
  children: ReactNode
  wide?: boolean
}) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    panelRef.current?.querySelector<HTMLElement>('input, textarea, select, button')?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      prev?.focus()
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-sm sm:items-center sm:p-4">
      <button type="button" aria-label="Cerrar" tabIndex={-1} className="absolute inset-0 cursor-default" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          'relative flex max-h-[92dvh] w-full flex-col border border-border bg-card shadow-2xl',
          wide ? 'sm:max-w-2xl' : 'sm:max-w-lg',
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex flex-col gap-0.5">
            {code ? <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-blood">{code}</span> : null}
            <h2 id={titleId} className="font-serif text-lg text-foreground">
              {title}
            </h2>
          </div>
          <IconBtn type="button" label="Cerrar" onClick={onClose}>
            <X className="size-4" aria-hidden="true" />
          </IconBtn>
        </div>
        <div className="overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </div>
  )
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => Promise<void> | void
  onClose: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  return (
    <Modal open={open} onClose={onClose} title={title} code="Confirmación requerida">
      <div className="flex flex-col gap-5">
        <p className="text-sm leading-relaxed text-muted-foreground">{message}</p>
        <ErrorNote message={error} />
        <div className="flex justify-end gap-2">
          <Btn type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Btn>
          <Btn
            type="button"
            variant="primary"
            loading={busy}
            onClick={async () => {
              setBusy(true)
              setError(null)
              try {
                await onConfirm()
                onClose()
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Error inesperado')
              } finally {
                setBusy(false)
              }
            }}
          >
            {confirmLabel}
          </Btn>
        </div>
      </div>
    </Modal>
  )
}

export function StatCard({ label, value, tone }: { label: string; value: ReactNode; tone?: 'gold' | 'red' }) {
  return (
    <div className="flex flex-col gap-2 border border-border bg-card px-4 py-4">
      <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{label}</span>
      <span
        className={cn(
          'font-serif text-2xl tabular-nums',
          tone === 'gold' ? 'text-gold' : tone === 'red' ? 'text-[#e0625c]' : 'text-foreground',
        )}
      >
        {value}
      </span>
    </div>
  )
}
