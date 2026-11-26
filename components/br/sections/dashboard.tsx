'use client'

import { Pencil, Plus, Radio, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import useSWR from 'swr'
import { ANNOUNCEMENT_PRIORITIES, hasRank, RISK_LEVELS } from '@/lib/br/constants'
import { api, errorMessage, fetcher, formatMoney, relativeTime, type ClientSession } from '@/lib/br/client'
import type { Announcement, DashboardData, Tactical } from '@/lib/br/types'
import {
  Badge,
  Btn,
  ConfirmDialog,
  CopyButton,
  EmptyState,
  ErrorNote,
  Field,
  IconBtn,
  Input,
  LoadingRows,
  Modal,
  Panel,
  riskTone,
  SectionHeader,
  Select,
  StatCard,
  Textarea,
} from '../ui'

export function DashboardSection({ session }: { session: ClientSession }) {
  const canCommand = hasRank(session.rank, 'Alto Mando')
  const dash = useSWR<DashboardData>('/api/dashboard', fetcher, { refreshInterval: 15000 })
  const tactical = useSWR<Tactical>('/api/tactical', fetcher, { refreshInterval: 15000 })
  const [editTactical, setEditTactical] = useState(false)
  const [newAnnouncement, setNewAnnouncement] = useState(false)
  const [toDelete, setToDelete] = useState<Announcement | null>(null)

  const stats = dash.data?.stats

  return (
    <>
      <SectionHeader
        code="00 · Cuartel general"
        title={`Bienvenido, ${session.ic}`}
        description="Estado de la casa, movimientos recientes y comunicados del mando."
      />

      <TacticalWidget data={tactical.data} canEdit={canCommand} onEdit={() => setEditTactical(true)} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Miembros activos" value={stats ? stats.activeMembers : '—'} />
        <StatCard label="Fondo común" value={stats ? formatMoney(stats.fund) : '—'} tone="gold" />
        <StatCard label="Operaciones abiertas" value={stats ? stats.openOperations : '—'} />
        <StatCard label="Zonas registradas" value={stats ? stats.zones : '—'} />
        {stats && stats.pendingRequests !== null ? (
          <StatCard label="Solicitudes pendientes" value={stats.pendingRequests} tone="red" />
        ) : null}
      </div>

      <Panel
        title="Comunicado de inteligencia"
        code="INT"
        action={
          canCommand ? (
            <Btn size="sm" onClick={() => setNewAnnouncement(true)}>
              <Plus className="size-3.5" aria-hidden="true" />
              Nuevo
            </Btn>
          ) : null
        }
      >
        <div className="p-4">
          {!dash.data ? (
            <LoadingRows />
          ) : dash.data.announcements.length === 0 ? (
            <EmptyState title="Sin comunicados" description="El mando no ha emitido comunicados." />
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {dash.data.announcements.map((a) => (
                <li key={a.id} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={a.priority === 'ALTA' ? 'red' : a.priority === 'MEDIA' ? 'gold' : 'neutral'}>
                      {a.priority}
                    </Badge>
                    <h3 className="font-serif text-base text-foreground">{a.title}</h3>
                    <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                      {a.author_ic ?? '—'} · {relativeTime(a.created_at)}
                    </span>
                    {canCommand ? (
                      <IconBtn label="Eliminar comunicado" onClick={() => setToDelete(a)}>
                        <Trash2 className="size-3.5" aria-hidden="true" />
                      </IconBtn>
                    ) : null}
                  </div>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{a.body}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Próximas operaciones" code="OPS">
          <div className="p-4">
            {!dash.data ? (
              <LoadingRows />
            ) : dash.data.upcoming.length === 0 ? (
              <EmptyState title="Sin operaciones abiertas" />
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {dash.data.upcoming.map((op) => (
                  <li key={op.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate text-sm text-foreground">{op.name}</span>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {op.scheduled_time || 'Sin horario'} · {op.team.length} asignados
                      </span>
                    </div>
                    <Badge tone={op.status === 'En curso' ? 'red' : 'neutral'}>{op.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Panel>

        <Panel title="Actividad reciente" code="LOG">
          <div className="p-4">
            {!dash.data ? (
              <LoadingRows />
            ) : dash.data.activity.length === 0 ? (
              <EmptyState title="Sin actividad registrada" />
            ) : (
              <ul className="flex max-h-80 flex-col gap-3 overflow-y-auto pr-1">
                {dash.data.activity.map((a) => (
                  <li key={a.id} className="flex gap-3 text-sm">
                    <span className="w-16 shrink-0 font-mono text-[10px] leading-5 text-muted-foreground">
                      {relativeTime(a.created_at)}
                    </span>
                    <p className="leading-5 text-muted-foreground">
                      <span className="text-foreground">{a.actor_ic ?? '—'}</span> {a.action}
                      {a.target ? <span className="text-foreground"> {a.target}</span> : null}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Panel>
      </div>

      <TacticalModal
        open={editTactical}
        data={tactical.data}
        onClose={() => setEditTactical(false)}
        onSaved={() => {
          tactical.mutate()
          dash.mutate()
        }}
      />
      <AnnouncementModal open={newAnnouncement} onClose={() => setNewAnnouncement(false)} onSaved={() => dash.mutate()} />
      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Eliminar comunicado"
        message={`Se eliminará "${toDelete?.title ?? ''}" de forma permanente.`}
        confirmLabel="Eliminar"
        onClose={() => setToDelete(null)}
        onConfirm={async () => {
          if (!toDelete) return
          await api('DELETE', `/api/announcements/${toDelete.id}`)
          await dash.mutate()
        }}
      />
    </>
  )
}

function TacticalWidget({ data, canEdit, onEdit }: { data?: Tactical; canEdit: boolean; onEdit: () => void }) {
  return (
    <section className="grid gap-px border border-border bg-border md:grid-cols-[1fr_1fr_2fr]">
      <div className="flex flex-col gap-2 bg-card px-4 py-4">
        <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          <Radio className="size-3.5 text-blood" aria-hidden="true" />
          Frecuencia activa
        </span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-2xl tabular-nums text-foreground">{data?.radio_freq || '— — —'}</span>
          {data?.radio_freq ? <CopyButton value={data.radio_freq} label="Copiar frecuencia" /> : null}
        </div>
      </div>
      <div className="flex flex-col gap-2 bg-card px-4 py-4">
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Calor policial</span>
        <div>
          <Badge tone={riskTone(data?.heat_level ?? 'BAJO')}>{data?.heat_level ?? 'BAJO'}</Badge>
        </div>
      </div>
      <div className="flex items-start justify-between gap-3 bg-card px-4 py-4">
        <div className="flex flex-col gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Nota táctica</span>
          <p className="text-sm leading-relaxed text-muted-foreground">{data?.status_note || 'Sin novedades.'}</p>
          {data?.updated_by ? (
            <span className="font-mono text-[10px] text-muted-foreground/70">
              {data.updated_by} · {relativeTime(data.updated_at)}
            </span>
          ) : null}
        </div>
        {canEdit ? (
          <IconBtn label="Editar estado táctico" onClick={onEdit}>
            <Pencil className="size-3.5" aria-hidden="true" />
          </IconBtn>
        ) : null}
      </div>
    </section>
  )
}

function TacticalModal({
  open,
  data,
  onClose,
  onSaved,
}: {
  open: boolean
  data?: Tactical
  onClose: () => void
  onSaved: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setBusy(true)
    setError(null)
    try {
      await api('PATCH', '/api/tactical', {
        radio_freq: f.get('radio_freq'),
        heat_level: f.get('heat_level'),
        status_note: f.get('status_note'),
      })
      onSaved()
      onClose()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Estado táctico" code="Mando">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label="Frecuencia de radio">
          {(id) => <Input id={id} name="radio_freq" defaultValue={data?.radio_freq ?? ''} maxLength={20} />}
        </Field>
        <Field label="Nivel de calor">
          {(id) => <Select id={id} name="heat_level" defaultValue={data?.heat_level ?? 'BAJO'} options={RISK_LEVELS} />}
        </Field>
        <Field label="Nota táctica">
          {(id) => <Textarea id={id} name="status_note" defaultValue={data?.status_note ?? ''} maxLength={280} rows={3} />}
        </Field>
        <ErrorNote message={error} />
        <div className="flex justify-end gap-2">
          <Btn type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Btn>
          <Btn type="submit" variant="primary" loading={busy}>
            Guardar
          </Btn>
        </div>
      </form>
    </Modal>
  )
}

function AnnouncementModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setBusy(true)
    setError(null)
    try {
      await api('POST', '/api/announcements', {
        title: f.get('title'),
        body: f.get('body'),
        priority: f.get('priority'),
      })
      onSaved()
      onClose()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nuevo comunicado" code="Inteligencia">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label="Título">{(id) => <Input id={id} name="title" required maxLength={140} />}</Field>
        <Field label="Prioridad">
          {(id) => <Select id={id} name="priority" defaultValue="INFORMATIVA" options={ANNOUNCEMENT_PRIORITIES} />}
        </Field>
        <Field label="Contenido">{(id) => <Textarea id={id} name="body" required maxLength={4000} rows={6} />}</Field>
        <ErrorNote message={error} />
        <div className="flex justify-end gap-2">
          <Btn type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Btn>
          <Btn type="submit" variant="primary" loading={busy}>
            Publicar
          </Btn>
        </div>
      </form>
    </Modal>
  )
}
