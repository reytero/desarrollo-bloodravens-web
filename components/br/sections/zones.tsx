'use client'

import { Pencil, Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { RISK_LEVELS, ZONE_CATEGORIES } from '@/lib/br/constants'
import { api, fetcher } from '@/lib/br/client'
import type { Zone } from '@/lib/br/types'
import { formObject, FormModal } from '../form-modal'
import {
  Badge,
  Btn,
  CopyButton,
  EmptyState,
  Field,
  FilterChips,
  IconBtn,
  Input,
  LoadingRows,
  riskTone,
  SectionHeader,
  Select,
  Textarea,
} from '../ui'

const FILTERS = ['Todas', ...ZONE_CATEGORIES] as const

export function ZonesSection() {
  const { data, mutate } = useSWR<Zone[]>('/api/zones', fetcher)
  const [filter, setFilter] = useState<string>('Todas')
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Zone | 'new' | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (data ?? []).filter(
      (z) =>
        (filter === 'Todas' || z.category === filter) &&
        (!q || z.name.toLowerCase().includes(q) || (z.postal ?? '').toLowerCase().includes(q)),
    )
  }, [data, filter, query])

  const current = editing && editing !== 'new' ? editing : null

  return (
    <>
      <SectionHeader
        code="02 · Zonas de interés"
        title="Mapa táctico"
        description="Casas seguras, alijos, puntos de encuentro y territorio rival en Los Santos."
        action={
          <Btn variant="primary" onClick={() => setEditing('new')}>
            <Plus className="size-4" aria-hidden="true" />
            Nueva zona
          </Btn>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterChips label="Filtrar por categoría" options={FILTERS} value={filter} onChange={setFilter} />
        <div className="relative lg:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            aria-label="Buscar por nombre o código postal"
            placeholder="Nombre o código postal"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {!data ? (
        <LoadingRows />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={data.length === 0 ? 'No hay zonas registradas' : 'Ninguna zona coincide'}
          description={data.length === 0 ? 'Registra la primera zona de interés de la casa.' : undefined}
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((z) => (
            <li key={z.id} className="flex flex-col border border-border bg-card">
              {z.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element -- arbitrary external URLs set by members
                <img src={z.image_url} alt={`Imagen de ${z.name}`} className="aspect-video w-full object-cover" />
              ) : null}
              <div className="flex flex-1 flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{z.category}</span>
                    <h3 className="font-serif text-lg text-foreground">{z.name}</h3>
                  </div>
                  <Badge tone={riskTone(z.risk)}>{z.risk}</Badge>
                </div>
                {z.postal ? (
                  <div className="flex items-center gap-1 font-mono text-sm text-foreground">
                    <span className="text-muted-foreground">CP</span>
                    {z.postal}
                    <CopyButton value={z.postal} label="Copiar código postal" />
                  </div>
                ) : null}
                {z.notes ? <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{z.notes}</p> : null}
                <div className="mt-auto flex items-center justify-between pt-2">
                  <span className="font-mono text-[10px] text-muted-foreground/70">{z.created_by ?? ''}</span>
                  <IconBtn label={`Editar ${z.name}`} onClick={() => setEditing(z)}>
                    <Pencil className="size-3.5" aria-hidden="true" />
                  </IconBtn>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <FormModal
        key={current?.id ?? 'new'}
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={current ? 'Editar zona' : 'Nueva zona'}
        code="Zonas"
        onSubmit={async (f) => {
          const body = formObject(f, ['name', 'category', 'postal', 'risk', 'notes', 'image_url'])
          if (current) await api('PATCH', `/api/zones/${current.id}`, body)
          else await api('POST', '/api/zones', body)
          await mutate()
        }}
        onDelete={
          current
            ? async () => {
                await api('DELETE', `/api/zones/${current.id}`)
                await mutate()
              }
            : undefined
        }
      >
        <Field label="Nombre">{(id) => <Input id={id} name="name" required maxLength={120} defaultValue={current?.name} />}</Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Categoría">
            {(id) => <Select id={id} name="category" options={ZONE_CATEGORIES} defaultValue={current?.category} />}
          </Field>
          <Field label="Riesgo">
            {(id) => <Select id={id} name="risk" options={RISK_LEVELS} defaultValue={current?.risk ?? 'BAJO'} />}
          </Field>
        </div>
        <Field label="Código postal">
          {(id) => <Input id={id} name="postal" maxLength={20} defaultValue={current?.postal ?? ''} className="font-mono" />}
        </Field>
        <Field label="URL de imagen (opcional)">
          {(id) => <Input id={id} name="image_url" type="url" defaultValue={current?.image_url ?? ''} placeholder="https://" />}
        </Field>
        <Field label="Notas tácticas">
          {(id) => <Textarea id={id} name="notes" maxLength={2000} defaultValue={current?.notes ?? ''} />}
        </Field>
      </FormModal>
    </>
  )
}
