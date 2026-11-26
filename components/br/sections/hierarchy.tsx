'use client'

import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { MEMBER_STATUSES, RANKS, rankLevel } from '@/lib/br/constants'
import { fetcher, relativeTime } from '@/lib/br/client'
import type { Member } from '@/lib/br/types'
import { Badge, EmptyState, FilterChips, Input, LoadingRows, memberTone, rankTone, SectionHeader } from '../ui'

export function HierarchySection() {
  const { data } = useSWR<Member[]>('/api/members', fetcher)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('Todos')

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (data ?? [])
      .filter(
        (m) =>
          (status === 'Todos' || m.member_status === status) &&
          (!q || m.ic_name.toLowerCase().includes(q) || m.alias.toLowerCase().includes(q)),
      )
      .sort((a, b) => rankLevel(b.rank) - rankLevel(a.rank) || a.ic_name.localeCompare(b.ic_name))
  }, [data, query, status])

  return (
    <>
      <SectionHeader
        code="06 · Jerarquía"
        title="La casa"
        description={`Miembros aprobados ordenados por rango: ${[...RANKS].reverse().join(' · ')}. Edita tu ficha desde el menú de usuario.`}
      />
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <FilterChips label="Filtrar por estado" options={['Todos', ...MEMBER_STATUSES]} value={status} onChange={setStatus} />
        <div className="relative md:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input aria-label="Buscar miembro" placeholder="Nombre IC o alias" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
        </div>
      </div>

      {!data ? (
        <LoadingRows />
      ) : rows.length === 0 ? (
        <EmptyState title={data.length === 0 ? 'Aún no hay miembros aprobados' : 'Ningún miembro coincide'} />
      ) : (
        <div className="overflow-x-auto border border-border bg-card">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b border-border text-left font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                <th scope="col" className="px-4 py-3 font-normal">Nombre IC</th>
                <th scope="col" className="px-4 py-3 font-normal">Alias</th>
                <th scope="col" className="px-4 py-3 font-normal">Rango</th>
                <th scope="col" className="px-4 py-3 font-normal">Estado</th>
                <th scope="col" className="px-4 py-3 font-normal">Teléfono IC</th>
                <th scope="col" className="px-4 py-3 font-normal">Último acceso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((m) => (
                <tr key={m.id} className="hover:bg-raised">
                  <td className="px-4 py-3 font-serif text-foreground">{m.ic_name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">@{m.alias}</td>
                  <td className="px-4 py-3"><Badge tone={rankTone(m.rank)}>{m.rank}</Badge></td>
                  <td className="px-4 py-3"><Badge tone={memberTone(m.member_status)}>{m.member_status}</Badge></td>
                  <td className="px-4 py-3 font-mono text-xs text-foreground">{m.phone || '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{relativeTime(m.last_access)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
