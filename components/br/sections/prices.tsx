'use client'

import { Pencil, Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { AVAILABILITY, PRICE_CATEGORIES } from '@/lib/br/constants'
import { api, fetcher, formatMoney } from '@/lib/br/client'
import type { Price } from '@/lib/br/types'
import { cn } from '@/lib/utils'
import { formObject, FormModal } from '../form-modal'
import {
  Badge,
  Btn,
  EmptyState,
  Field,
  FilterChips,
  IconBtn,
  Input,
  LoadingRows,
  SectionHeader,
  Select,
  Textarea,
  type Tone,
} from '../ui'

const FILTERS = ['Todas', ...PRICE_CATEGORIES] as const

function availabilityTone(a: string): Tone {
  if (a === 'Disponible') return 'green'
  if (a === 'Escaso') return 'amber'
  if (a === 'Agotado') return 'red'
  return 'neutral'
}

export function PricesSection() {
  const { data, mutate } = useSWR<Price[]>('/api/prices', fetcher)
  const [filter, setFilter] = useState<string>('Todas')
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Price | 'new' | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (data ?? []).filter(
      (p) => (filter === 'Todas' || p.category === filter) && (!q || p.item_name.toLowerCase().includes(q)),
    )
  }, [data, filter, query])

  const current = editing && editing !== 'new' ? editing : null

  return (
    <>
      <SectionHeader
        code="03 · Precios"
        title="Catálogo de mercado"
        description="Precio de compra, de calle y tarifa interna de la banda. El margen se calcula sobre la venta en calle."
        action={
          <Btn variant="primary" onClick={() => setEditing('new')}>
            <Plus className="size-4" aria-hidden="true" />
            Nuevo precio
          </Btn>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterChips label="Filtrar por categoría" options={FILTERS} value={filter} onChange={setFilter} />
        <div className="relative lg:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input aria-label="Buscar artículo" placeholder="Buscar artículo" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
        </div>
      </div>

      {!data ? (
        <LoadingRows />
      ) : filtered.length === 0 ? (
        <EmptyState title={data.length === 0 ? 'Catálogo vacío' : 'Ningún artículo coincide'} />
      ) : (
        <div className="overflow-x-auto border border-border bg-card">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border text-left font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                <th scope="col" className="px-4 py-3 font-normal">Artículo</th>
                <th scope="col" className="px-4 py-3 font-normal">Categoría</th>
                <th scope="col" className="px-4 py-3 text-right font-normal">Compra</th>
                <th scope="col" className="px-4 py-3 text-right font-normal">Calle</th>
                <th scope="col" className="px-4 py-3 text-right font-normal">Interno</th>
                <th scope="col" className="px-4 py-3 text-right font-normal">Margen</th>
                <th scope="col" className="px-4 py-3 font-normal">Disponibilidad</th>
                <th scope="col" className="px-4 py-3"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((p) => {
                const margin = Number(p.sell_price) - Number(p.buy_price)
                const pct = Number(p.buy_price) > 0 ? Math.round((margin / Number(p.buy_price)) * 100) : null
                return (
                  <tr key={p.id} className="hover:bg-raised">
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-foreground">{p.item_name}</span>
                        {p.notes ? <span className="line-clamp-1 text-xs text-muted-foreground">{p.notes}</span> : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{p.category}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-muted-foreground">{formatMoney(p.buy_price)}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-foreground">{formatMoney(p.sell_price)}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-gold">{formatMoney(p.internal_price)}</td>
                    <td className={cn('px-4 py-3 text-right font-mono tabular-nums', margin >= 0 ? 'text-[#8fb486]' : 'text-[#e0625c]')}>
                      {formatMoney(margin)}
                      {pct !== null ? <span className="ml-1 text-[10px] text-muted-foreground">{pct}%</span> : null}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={availabilityTone(p.availability)}>{p.availability}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <IconBtn label={`Editar ${p.item_name}`} onClick={() => setEditing(p)}>
                        <Pencil className="size-3.5" aria-hidden="true" />
                      </IconBtn>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <FormModal
        key={current?.id ?? 'new'}
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={current ? 'Editar precio' : 'Nuevo precio'}
        code="Precios"
        onSubmit={async (f) => {
          const body = formObject(f, ['item_name', 'category', 'buy_price', 'sell_price', 'internal_price', 'availability', 'notes'])
          if (current) await api('PATCH', `/api/prices/${current.id}`, body)
          else await api('POST', '/api/prices', body)
          await mutate()
        }}
        onDelete={
          current
            ? async () => {
                await api('DELETE', `/api/prices/${current.id}`)
                await mutate()
              }
            : undefined
        }
      >
        <Field label="Artículo">{(id) => <Input id={id} name="item_name" required maxLength={120} defaultValue={current?.item_name} />}</Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Categoría">
            {(id) => <Select id={id} name="category" options={PRICE_CATEGORIES} defaultValue={current?.category ?? 'General'} />}
          </Field>
          <Field label="Disponibilidad">
            {(id) => <Select id={id} name="availability" options={AVAILABILITY} defaultValue={current?.availability ?? 'Disponible'} />}
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Compra">
            {(id) => <Input id={id} name="buy_price" type="number" min={0} step="any" defaultValue={current?.buy_price ?? ''} />}
          </Field>
          <Field label="Venta calle">
            {(id) => <Input id={id} name="sell_price" type="number" min={0} step="any" defaultValue={current?.sell_price ?? ''} />}
          </Field>
          <Field label="Interno banda">
            {(id) => <Input id={id} name="internal_price" type="number" min={0} step="any" defaultValue={current?.internal_price ?? ''} />}
          </Field>
        </div>
        <Field label="Notas">{(id) => <Textarea id={id} name="notes" maxLength={1000} rows={3} defaultValue={current?.notes ?? ''} />}</Field>
      </FormModal>
    </>
  )
}
