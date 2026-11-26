'use client'

import { Pencil, Trash2, Upload, X } from 'lucide-react'
import { useEffect, useRef, useState, type DragEvent, type FormEvent } from 'react'
import useSWR from 'swr'
import { DIPLOMACY_STATUSES, EVIDENCE_CATEGORIES, EVIDENCE_MAX_BYTES, EVIDENCE_MIME, hasRank } from '@/lib/br/constants'
import { api, errorMessage, fetcher, formatDateTime, type ClientSession } from '@/lib/br/client'
import type { Diplomacy, Evidence } from '@/lib/br/types'
import { cn } from '@/lib/utils'
import { formObject, FormModal } from '../form-modal'
import {
  Badge,
  Btn,
  ConfirmDialog,
  EmptyState,
  ErrorNote,
  Field,
  FilterChips,
  IconBtn,
  Input,
  LoadingRows,
  Panel,
  SectionHeader,
  Select,
  Textarea,
} from '../ui'

const OATH = [
  ['Silencio', 'Lo que se habla en la casa, muere en la casa. Nadie de fuera escucha una palabra.'],
  ['Lealtad', 'La sangre de un cuervo es la de todos. Nunca se abandona a un hermano.'],
  ['Jerarquía', 'La palabra de la Corona es ley. El mando se respeta y no se discute en público.'],
  ['Disciplina', 'Ningún movimiento sin aprobación. La imprudencia de uno pone en peligro a todos.'],
  ['Deuda', 'Toda deuda con la casa se paga. Toda ofensa contra ella, también.'],
] as const

export function EvidenceSection({ session }: { session: ClientSession }) {
  return (
    <>
      <SectionHeader
        code="07 · Evidencias y Juramento"
        title="Archivo y palabra"
        description="Material gráfico cifrado de la casa, los principios del juramento y la diplomacia vigente."
      />
      <Evidences />
      <div className="grid gap-6 lg:grid-cols-2">
        <Oath />
        <DiplomacyPanel canEdit={hasRank(session.rank, 'Alto Mando')} />
      </div>
    </>
  )
}

function Evidences() {
  const { data, mutate } = useSWR<Evidence[]>('/api/evidences', fetcher)
  const [filter, setFilter] = useState('Todas')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [drag, setDrag] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<Evidence | null>(null)
  const [toDelete, setToDelete] = useState<Evidence | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (!file) {
      setPreview(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  useEffect(() => {
    if (!lightbox) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setLightbox(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox])

  function pick(f: File | undefined | null) {
    setError(null)
    if (!f) return
    if (!EVIDENCE_MIME.includes(f.type as (typeof EVIDENCE_MIME)[number])) return setError('Formato no permitido (PNG, JPG, WEBP o GIF)')
    if (f.size > EVIDENCE_MAX_BYTES) return setError('La imagen supera los 5 MB')
    setFile(f)
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDrag(false)
    pick(e.dataTransfer.files[0])
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!file) return setError('Adjunta una imagen')
    const form = new FormData(e.currentTarget)
    form.set('file', file)
    setBusy(true)
    setError(null)
    try {
      await api('POST', '/api/evidences', form)
      setFile(null)
      formRef.current?.reset()
      await mutate()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const rows = (data ?? []).filter((e) => filter === 'Todas' || e.category === filter)

  return (
    <Panel title="Evidencias" code="EVD">
      <div className="flex flex-col gap-5 p-4">
        <form ref={formRef} onSubmit={onSubmit} className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDrag(true)
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={onDrop}
            className={cn(
              'relative flex min-h-40 flex-col items-center justify-center gap-2 border border-dashed p-4 text-center transition-colors',
              drag ? 'border-blood bg-blood/10' : 'border-border bg-surface',
            )}
          >
            {preview ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
                <img src={preview} alt="Vista previa de la evidencia" className="max-h-40 object-contain" />
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
                >
                  Quitar imagen
                </button>
              </>
            ) : (
              <>
                <Upload className="size-5 text-muted-foreground" aria-hidden="true" />
                <p className="text-sm text-muted-foreground">Arrastra una imagen aquí</p>
                <Btn type="button" size="sm" onClick={() => inputRef.current?.click()}>
                  Seleccionar archivo
                </Btn>
                <span className="font-mono text-[10px] text-muted-foreground/70">PNG · JPG · WEBP · GIF · máx. 5 MB</span>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              accept={EVIDENCE_MIME.join(',')}
              className="sr-only"
              aria-label="Archivo de evidencia"
              onChange={(e) => pick(e.target.files?.[0])}
            />
          </div>
          <div className="flex flex-col gap-4">
            <Field label="Título">{(id) => <Input id={id} name="title" required maxLength={140} />}</Field>
            <Field label="Categoría">{(id) => <Select id={id} name="category" options={EVIDENCE_CATEGORIES} />}</Field>
            <ErrorNote message={error} />
            <Btn type="submit" variant="primary" loading={busy} disabled={!file}>
              Subir evidencia
            </Btn>
          </div>
        </form>

        <FilterChips label="Filtrar evidencias" options={['Todas', ...EVIDENCE_CATEGORIES]} value={filter} onChange={setFilter} />

        {!data ? (
          <LoadingRows />
        ) : rows.length === 0 ? (
          <EmptyState title="Sin evidencias archivadas" />
        ) : (
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {rows.map((ev) => (
              <li key={ev.id} className="group relative flex flex-col border border-border bg-raised">
                <button type="button" onClick={() => setLightbox(ev)} className="aspect-square overflow-hidden bg-surface">
                  {ev.url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- short-lived signed storage URL
                    <img src={ev.url} alt={ev.title} className="size-full object-cover transition-transform group-hover:scale-105" />
                  ) : (
                    <span className="text-xs text-muted-foreground">No disponible</span>
                  )}
                </button>
                <div className="flex items-start justify-between gap-2 p-2">
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-xs text-foreground">{ev.title}</span>
                    <span className="truncate font-mono text-[10px] text-muted-foreground">{ev.author_ic ?? '—'}</span>
                  </div>
                  {ev.canDelete ? (
                    <IconBtn label={`Eliminar ${ev.title}`} onClick={() => setToDelete(ev)}>
                      <Trash2 className="size-3.5" aria-hidden="true" />
                    </IconBtn>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {lightbox ? (
        <div role="dialog" aria-modal="true" aria-label={lightbox.title} className="fixed inset-0 z-50 flex flex-col bg-black/95 p-4">
          <div className="flex items-center justify-between gap-3 pb-3">
            <div className="flex min-w-0 flex-col">
              <span className="truncate font-serif text-foreground">{lightbox.title}</span>
              <span className="font-mono text-[11px] text-muted-foreground">
                {[lightbox.category, lightbox.author_ic, formatDateTime(lightbox.created_at)].filter(Boolean).join(' · ')}
              </span>
            </div>
            <IconBtn label="Cerrar visor" onClick={() => setLightbox(null)} autoFocus>
              <X className="size-5" aria-hidden="true" />
            </IconBtn>
          </div>
          <button type="button" aria-label="Cerrar visor" className="flex flex-1 items-center justify-center overflow-hidden" onClick={() => setLightbox(null)}>
            {lightbox.url ? (
              // eslint-disable-next-line @next/next/no-img-element -- short-lived signed storage URL
              <img src={lightbox.url} alt={lightbox.title} className="max-h-full max-w-full object-contain" />
            ) : null}
          </button>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Eliminar evidencia"
        message={`Se eliminará "${toDelete?.title ?? ''}" y su archivo de forma permanente.`}
        confirmLabel="Eliminar"
        onClose={() => setToDelete(null)}
        onConfirm={async () => {
          if (!toDelete) return
          await api('DELETE', `/api/evidences/${toDelete.id}`)
          await mutate()
        }}
      />
    </Panel>
  )
}

function Oath() {
  return (
    <Panel title="El Juramento" code="JUR">
      <ol className="flex flex-col divide-y divide-border">
        {OATH.map(([name, text], i) => (
          <li key={name} className="flex gap-4 px-4 py-4">
            <span className="font-mono text-sm text-blood">{String(i + 1).padStart(2, '0')}</span>
            <div className="flex flex-col gap-1">
              <span className="font-serif text-base text-foreground">{name}</span>
              <p className="text-sm leading-relaxed text-muted-foreground">{text}</p>
            </div>
          </li>
        ))}
      </ol>
    </Panel>
  )
}

function DiplomacyPanel({ canEdit }: { canEdit: boolean }) {
  const { data, mutate } = useSWR<Diplomacy[]>('/api/diplomacy', fetcher)
  const [editing, setEditing] = useState(false)
  const byStatus = new Map((data ?? []).map((d) => [d.status, d.names]))
  const tones = { ALIADOS: 'green', NEUTRALES: 'neutral', ENEMIGOS: 'red' } as const

  return (
    <Panel
      title="Diplomacia"
      code="DIP"
      action={
        canEdit ? (
          <IconBtn label="Editar diplomacia" onClick={() => setEditing(true)}>
            <Pencil className="size-3.5" aria-hidden="true" />
          </IconBtn>
        ) : null
      }
    >
      {!data ? (
        <div className="p-4">
          <LoadingRows />
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {DIPLOMACY_STATUSES.map((s) => {
            const names = (byStatus.get(s) ?? '')
              .split(/[\n,]/)
              .map((n) => n.trim())
              .filter(Boolean)
            return (
              <li key={s} className="flex flex-col gap-2 px-4 py-4">
                <Badge tone={tones[s]}>{s}</Badge>
                {names.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {names.map((n) => (
                      <span key={n} className="border border-border bg-raised px-2 py-1 text-sm text-foreground">
                        {n}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground/70">Sin registros</span>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <FormModal
        open={editing}
        onClose={() => setEditing(false)}
        title="Diplomacia de la casa"
        code="Separa los nombres por comas o líneas"
        onSubmit={async (f) => {
          await api('PUT', '/api/diplomacy', formObject(f, [...DIPLOMACY_STATUSES]))
          await mutate()
        }}
      >
        {DIPLOMACY_STATUSES.map((s) => (
          <Field key={s} label={s}>
            {(id) => <Textarea id={id} name={s} rows={3} maxLength={2000} defaultValue={byStatus.get(s) ?? ''} />}
          </Field>
        ))}
      </FormModal>
    </Panel>
  )
}
