'use client'

import { Minus, Pencil, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { INVENTORY_CATEGORIES, LEDGER_TYPES } from '@/lib/br/constants'
import { api, errorMessage, fetcher, formatDateTime, formatMoney, relativeTime, type ClientSession } from '@/lib/br/client'
import type { InventoryItem, LedgerEntry } from '@/lib/br/types'
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
  SectionHeader,
  Select,
  StatCard,
  Textarea,
} from '../ui'

export function WarehouseSection({ session }: { session: ClientSession }) {
  const [tab, setTab] = useState<'finance' | 'inventory'>('finance')
  return (
    <>
      <SectionHeader
        code="04 · Almacén y finanzas"
        title="Contabilidad y stock"
        description="Movimientos del fondo común y existencias físicas de la casa."
      />
      <div role="tablist" aria-label="Vista" className="flex border-b border-border">
        {(
          [
            ['finance', 'Finanzas'],
            ['inventory', 'Almacén / Inventario'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            type="button"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cn(
              '-mb-px h-11 border-b-2 px-4 font-mono text-[11px] uppercase tracking-[0.2em]',
              tab === key ? 'border-blood text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'finance' ? <Finance session={session} /> : <Inventory />}
    </>
  )
}

function Finance({ session }: { session: ClientSession }) {
  const { data, mutate } = useSWR<LedgerEntry[]>('/api/ledger', fetcher)
  const [filter, setFilter] = useState('Todos')
  const [creating, setCreating] = useState(false)
  const [toDelete, setToDelete] = useState<LedgerEntry | null>(null)
  const isCorona = session.rank === 'Corona'

  const summary = useMemo(() => {
    const rows = data ?? []
    const now = new Date()
    const inMonth = (d: string) => {
      const x = new Date(d)
      return x.getFullYear() === now.getFullYear() && x.getMonth() === now.getMonth()
    }
    let balance = 0
    let monthIn = 0
    let monthOut = 0
    for (const r of rows) {
      const amt = Number(r.amount)
      balance += r.type === 'Entrada' ? amt : -amt
      if (inMonth(r.created_at)) {
        if (r.type === 'Entrada') monthIn += amt
        else monthOut += amt
      }
    }
    return { balance, monthIn, monthOut }
  }, [data])

  const rows = (data ?? []).filter((r) => filter === 'Todos' || r.type === filter)

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Balance total" value={data ? formatMoney(summary.balance) : '—'} tone="gold" />
        <StatCard label="Entradas del mes" value={data ? formatMoney(summary.monthIn) : '—'} />
        <StatCard label="Salidas del mes" value={data ? formatMoney(summary.monthOut) : '—'} tone="red" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterChips label="Filtrar por tipo" options={['Todos', ...LEDGER_TYPES]} value={filter} onChange={setFilter} />
        <Btn variant="primary" onClick={() => setCreating(true)}>
          <Plus className="size-4" aria-hidden="true" />
          Registrar movimiento
        </Btn>
      </div>

      {!data ? (
        <LoadingRows />
      ) : rows.length === 0 ? (
        <EmptyState title="Sin movimientos" description="El libro de cuentas está vacío." />
      ) : (
        <ul className="flex flex-col divide-y divide-border border border-border bg-card">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <Badge tone={r.type === 'Entrada' ? 'green' : 'red'}>{r.type}</Badge>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm text-foreground">{r.label}</span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {[r.category, r.responsible, formatDateTime(r.created_at)].filter(Boolean).join(' · ')}
                </span>
              </div>
              <span
                className={cn('font-mono text-sm tabular-nums', r.type === 'Entrada' ? 'text-[#8fb486]' : 'text-[#e0625c]')}
              >
                {r.type === 'Entrada' ? '+' : '−'}
                {formatMoney(r.amount)}
              </span>
              {isCorona ? (
                <IconBtn label={`Eliminar ${r.label}`} onClick={() => setToDelete(r)}>
                  <Trash2 className="size-3.5" aria-hidden="true" />
                </IconBtn>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <FormModal
        open={creating}
        onClose={() => setCreating(false)}
        title="Registrar movimiento"
        code="Finanzas"
        submitLabel="Registrar"
        onSubmit={async (f) => {
          await api('POST', '/api/ledger', formObject(f, ['label', 'type', 'amount', 'category', 'responsible', 'notes']))
          await mutate()
        }}
      >
        <Field label="Concepto">{(id) => <Input id={id} name="label" required maxLength={160} />}</Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tipo">{(id) => <Select id={id} name="type" options={LEDGER_TYPES} />}</Field>
          <Field label="Importe">{(id) => <Input id={id} name="amount" type="number" min={0.01} step="any" required />}</Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Categoría">{(id) => <Input id={id} name="category" maxLength={60} />}</Field>
          <Field label="Responsable">
            {(id) => <Input id={id} name="responsible" maxLength={80} placeholder={session.ic} />}
          </Field>
        </div>
        <Field label="Notas">{(id) => <Textarea id={id} name="notes" maxLength={1000} rows={3} />}</Field>
      </FormModal>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Eliminar movimiento"
        message={`Se eliminará "${toDelete?.label ?? ''}" del libro de cuentas.`}
        confirmLabel="Eliminar"
        onClose={() => setToDelete(null)}
        onConfirm={async () => {
          if (!toDelete) return
          await api('DELETE', `/api/ledger/${toDelete.id}`)
          await mutate()
        }}
      />
    </>
  )
}

function Inventory() {
  const { data, mutate } = useSWR<InventoryItem[]>('/api/inventory', fetcher)
  const [filter, setFilter] = useState('Todos')
  const [editing, setEditing] = useState<InventoryItem | 'new' | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const current = editing && editing !== 'new' ? editing : null
  const rows = (data ?? []).filter((r) => filter === 'Todos' || r.category === filter)

  async function adjust(item: InventoryItem, delta: 1 | -1) {
    setBusyId(item.id)
    setError(null)
    try {
      const updated = await api<InventoryItem>('PATCH', `/api/inventory/${item.id}`, { delta })
      await mutate((list) => list?.map((x) => (x.id === item.id ? updated : x)), { revalidate: false })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterChips label="Filtrar por categoría" options={['Todos', ...INVENTORY_CATEGORIES]} value={filter} onChange={setFilter} />
        <Btn variant="primary" onClick={() => setEditing('new')}>
          <Plus className="size-4" aria-hidden="true" />
          Nuevo ítem
        </Btn>
      </div>
      <ErrorNote message={error} />

      {!data ? (
        <LoadingRows />
      ) : rows.length === 0 ? (
        <EmptyState title="Almacén vacío" description="No hay existencias registradas." />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {rows.map((item) => (
            <li key={item.id} className="flex items-center gap-4 border border-border bg-card p-4">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm text-foreground">{item.item_name}</span>
                  <Badge>{item.category}</Badge>
                </div>
                <span className="truncate font-mono text-[11px] text-muted-foreground">
                  {item.location || 'Sin ubicación'} · {item.updated_by ?? '—'} · {relativeTime(item.updated_at)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <IconBtn
                  label={`Retirar 1 de ${item.item_name}`}
                  disabled={busyId === item.id || item.quantity <= 0}
                  onClick={() => adjust(item, -1)}
                  className="border-border"
                >
                  <Minus className="size-3.5" aria-hidden="true" />
                </IconBtn>
                <span className="w-12 text-center font-mono text-lg tabular-nums text-foreground" aria-label="Cantidad">
                  {item.quantity}
                </span>
                <IconBtn
                  label={`Sumar 1 a ${item.item_name}`}
                  disabled={busyId === item.id}
                  onClick={() => adjust(item, 1)}
                  className="border-border"
                >
                  <Plus className="size-3.5" aria-hidden="true" />
                </IconBtn>
                <IconBtn label={`Editar ${item.item_name}`} onClick={() => setEditing(item)}>
                  <Pencil className="size-3.5" aria-hidden="true" />
                </IconBtn>
              </div>
            </li>
          ))}
        </ul>
      )}

      <FormModal
        key={current?.id ?? 'new'}
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={current ? 'Editar ítem' : 'Nuevo ítem'}
        code="Almacén"
        onSubmit={async (f) => {
          const body = formObject(f, ['item_name', 'category', 'quantity', 'location', 'notes'])
          if (current) await api('PATCH', `/api/inventory/${current.id}`, body)
          else await api('POST', '/api/inventory', body)
          await mutate()
        }}
        onDelete={
          current
            ? async () => {
                await api('DELETE', `/api/inventory/${current.id}`)
                await mutate()
              }
            : undefined
        }
      >
        <Field label="Artículo">{(id) => <Input id={id} name="item_name" required maxLength={120} defaultValue={current?.item_name} />}</Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Categoría">
            {(id) => <Select id={id} name="category" options={INVENTORY_CATEGORIES} defaultValue={current?.category ?? 'Otros'} />}
          </Field>
          <Field label="Cantidad">
            {(id) => <Input id={id} name="quantity" type="number" min={0} step={1} defaultValue={current?.quantity ?? 0} />}
          </Field>
        </div>
        <Field label="Ubicación">{(id) => <Input id={id} name="location" maxLength={120} defaultValue={current?.location ?? ''} />}</Field>
        <Field label="Notas">{(id) => <Textarea id={id} name="notes" maxLength={1000} rows={3} defaultValue={current?.notes ?? ''} />}</Field>
      </FormModal>
    </>
  )
}
