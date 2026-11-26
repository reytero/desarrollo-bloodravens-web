'use client'

import { Plus } from 'lucide-react'
import { useState } from 'react'
import useSWR from 'swr'
import { OPERATION_STATUSES } from '@/lib/br/constants'
import { api, fetcher, formatDateTime, formatMoney } from '@/lib/br/client'
import type { Member, Operation } from '@/lib/br/types'
import { formObject, FormModal } from '../form-modal'
import { Badge, Btn, EmptyState, Field, Input, LoadingRows, Panel, SectionHeader, Select, Textarea } from '../ui'

const BOARD = ['En preparación', 'Reconocimiento', 'En curso'] as const

export function OperationsSection() {
  const { data, mutate } = useSWR<Operation[]>('/api/operations', fetcher)
  const members = useSWR<Member[]>('/api/members', fetcher)
  const [editing, setEditing] = useState<Operation | 'new' | null>(null)
  const current = editing && editing !== 'new' ? editing : null
  const ops = data ?? []
  const completed = ops.filter((o) => o.status === 'Completada')

  return (
    <>
      <SectionHeader
        code="05 · Operaciones"
        title="Tablero de operaciones"
        description="Planificación, reconocimiento y ejecución. Asigna equipo, horario IC y valor estimado."
        action={
          <Btn variant="primary" onClick={() => setEditing('new')}>
            <Plus className="size-4" aria-hidden="true" />
            Nueva operación
          </Btn>
        }
      />

      {!data ? (
        <LoadingRows />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            {BOARD.map((col) => {
              const items = ops.filter((o) => o.status === col)
              return (
                <Panel key={col} title={col} action={<span className="font-mono text-xs text-muted-foreground">{items.length}</span>}>
                  <div className="flex min-h-40 flex-col gap-2 p-3">
                    {items.length === 0 ? (
                      <p className="py-8 text-center font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground/60">
                        Vacío
                      </p>
                    ) : (
                      items.map((op) => <OpCard key={op.id} op={op} onOpen={() => setEditing(op)} />)
                    )}
                  </div>
                </Panel>
              )
            })}
          </div>

          <Panel title="Historial · Completadas" code="ARCH">
            <div className="p-4">
              {completed.length === 0 ? (
                <EmptyState title="Sin operaciones completadas" />
              ) : (
                <ul className="flex flex-col divide-y divide-border">
                  {completed.map((op) => (
                    <li key={op.id}>
                      <button
                        type="button"
                        onClick={() => setEditing(op)}
                        className="flex w-full flex-wrap items-center gap-3 py-3 text-left hover:text-foreground"
                      >
                        <span className="flex-1 text-sm text-foreground">{op.name}</span>
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {op.amount ? formatMoney(op.amount) : '—'} · {formatDateTime(op.created_at)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Panel>
        </>
      )}

      <FormModal
        key={current?.id ?? 'new'}
        open={editing !== null}
        onClose={() => setEditing(null)}
        wide
        title={current ? 'Editar operación' : 'Nueva operación'}
        code="Operaciones"
        onSubmit={async (f) => {
          const body = { ...formObject(f, ['name', 'type', 'status', 'scheduled_time', 'amount', 'notes']), team: f.getAll('team') }
          if (current) await api('PATCH', `/api/operations/${current.id}`, body)
          else await api('POST', '/api/operations', body)
          await mutate()
        }}
        onDelete={
          current
            ? async () => {
                await api('DELETE', `/api/operations/${current.id}`)
                await mutate()
              }
            : undefined
        }
      >
        <Field label="Nombre">{(id) => <Input id={id} name="name" required maxLength={140} defaultValue={current?.name} />}</Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tipo">{(id) => <Input id={id} name="type" maxLength={60} defaultValue={current?.type ?? ''} placeholder="Atraco, entrega, cobro…" />}</Field>
          <Field label="Estado">
            {(id) => <Select id={id} name="status" options={OPERATION_STATUSES} defaultValue={current?.status ?? 'En preparación'} />}
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Horario IC">
            {(id) => <Input id={id} name="scheduled_time" maxLength={60} defaultValue={current?.scheduled_time ?? ''} placeholder="Viernes 22:00" />}
          </Field>
          <Field label="Valor estimado">
            {(id) => <Input id={id} name="amount" type="number" min={0} step="any" defaultValue={current?.amount ?? ''} />}
          </Field>
        </div>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Equipo asignado</legend>
          {!members.data ? (
            <LoadingRows />
          ) : members.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay miembros aprobados.</p>
          ) : (
            <div className="grid max-h-48 gap-1 overflow-y-auto border border-border bg-surface p-2 sm:grid-cols-2">
              {members.data.map((m) => (
                <label key={m.id} className="flex cursor-pointer items-center gap-2 px-2 py-1.5 text-sm hover:bg-raised">
                  <input
                    type="checkbox"
                    name="team"
                    value={m.ic_name}
                    defaultChecked={current?.team.includes(m.ic_name)}
                    className="accent-[#b91c1c]"
                  />
                  <span className="text-foreground">{m.ic_name}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">{m.rank}</span>
                </label>
              ))}
            </div>
          )}
        </fieldset>
        <Field label="Notas">{(id) => <Textarea id={id} name="notes" maxLength={2000} defaultValue={current?.notes ?? ''} />}</Field>
      </FormModal>
    </>
  )
}

function OpCard({ op, onOpen }: { op: Operation; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex flex-col gap-2 border border-border bg-raised p-3 text-left transition-colors hover:border-muted-foreground/50"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm text-foreground">{op.name}</span>
        {op.type ? <Badge>{op.type}</Badge> : null}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px] text-muted-foreground">
        <span>{op.scheduled_time || 'Sin horario'}</span>
        {op.amount ? <span className="text-gold">{formatMoney(op.amount)}</span> : null}
      </div>
      {op.team.length ? <p className="line-clamp-2 text-xs text-muted-foreground">{op.team.join(', ')}</p> : null}
    </button>
  )
}
