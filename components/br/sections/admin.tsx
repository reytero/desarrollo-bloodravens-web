'use client'

import { KeyRound, Lock, LockOpen, Trash2 } from 'lucide-react'
import { useState } from 'react'
import useSWR from 'swr'
import { MEMBER_STATUSES, RANKS } from '@/lib/br/constants'
import { api, errorMessage, fetcher, formatDateTime, relativeTime, type ClientSession } from '@/lib/br/client'
import type { Account, Room } from '@/lib/br/types'
import { FormModal } from '../form-modal'
import {
  Badge,
  Btn,
  ConfirmDialog,
  EmptyState,
  ErrorNote,
  Field,
  IconBtn,
  Input,
  LoadingRows,
  memberTone,
  Panel,
  SectionHeader,
  Select,
} from '../ui'

type Pending = { account: Account; action: 'approve' | 'reject'; rank: string }

export function AdminSection({ session }: { session: ClientSession }) {
  const accounts = useSWR<Account[]>('/api/admin/accounts', fetcher)
  const rooms = useSWR<Room[]>('/api/rooms', fetcher)
  const [initialRank, setInitialRank] = useState<Record<string, string>>({})
  const [decision, setDecision] = useState<Pending | null>(null)
  const [toDelete, setToDelete] = useState<Account | null>(null)
  const [securityRoom, setSecurityRoom] = useState<Room | null>(null)
  const [error, setError] = useState<string | null>(null)

  const all = accounts.data ?? []
  const pending = all.filter((a) => a.status === 'pending')
  const registered = all.filter((a) => a.status !== 'pending')

  async function patch(id: string, body: Record<string, unknown>) {
    setError(null)
    try {
      await api('PATCH', `/api/admin/accounts/${id}`, body)
      await accounts.mutate()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <>
      <SectionHeader
        code="08 · Administración"
        title="Despacho de la Corona"
        description="Solicitudes de ingreso, registro de cuentas y seguridad de las salas privadas."
      />
      <ErrorNote message={error} />

      <Panel title="Solicitudes" code="REQ" action={<span className="font-mono text-xs text-muted-foreground">{pending.length}</span>}>
        <div className="p-4">
          {!accounts.data ? (
            <LoadingRows />
          ) : pending.length === 0 ? (
            <EmptyState title="Sin solicitudes pendientes" />
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {pending.map((a) => (
                <li key={a.id} className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 md:flex-row md:items-center">
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="font-serif text-foreground">{a.ic_name}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      @{a.alias} · {formatDateTime(a.created_at)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="sr-only" htmlFor={`rank-${a.id}`}>
                      Rango inicial de {a.ic_name}
                    </label>
                    <Select
                      id={`rank-${a.id}`}
                      options={RANKS}
                      value={initialRank[a.id] ?? 'Recluta'}
                      onChange={(e) => setInitialRank((r) => ({ ...r, [a.id]: e.target.value }))}
                      className="h-8 w-36 py-0 text-xs"
                    />
                    <Btn size="sm" variant="primary" onClick={() => setDecision({ account: a, action: 'approve', rank: initialRank[a.id] ?? 'Recluta' })}>
                      Aprobar
                    </Btn>
                    <Btn size="sm" variant="danger" onClick={() => setDecision({ account: a, action: 'reject', rank: '' })}>
                      Rechazar
                    </Btn>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Panel>

      <Panel title="Registro de cuentas" code="ACC">
        {!accounts.data ? (
          <div className="p-4">
            <LoadingRows />
          </div>
        ) : registered.length === 0 ? (
          <div className="p-4">
            <EmptyState title="No hay cuentas registradas" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-border text-left font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  <th scope="col" className="px-4 py-3 font-normal">Miembro</th>
                  <th scope="col" className="px-4 py-3 font-normal">Cuenta</th>
                  <th scope="col" className="px-4 py-3 font-normal">Rango</th>
                  <th scope="col" className="px-4 py-3 font-normal">Estado IC</th>
                  <th scope="col" className="px-4 py-3 font-normal">Último acceso</th>
                  <th scope="col" className="px-4 py-3"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {registered.map((a) => (
                  <tr key={a.id}>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-serif text-foreground">{a.ic_name}</span>
                        <span className="font-mono text-[11px] text-muted-foreground">@{a.alias}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {a.status === 'approved' ? (
                        <Badge tone="green">Aprobada</Badge>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Badge tone="red">Rechazada</Badge>
                          <Btn size="sm" variant="ghost" onClick={() => patch(a.id, { action: 'approve' })}>
                            Reactivar
                          </Btn>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        aria-label={`Rango de ${a.ic_name}`}
                        options={RANKS}
                        value={a.rank}
                        onChange={(e) => patch(a.id, { rank: e.target.value })}
                        className="h-8 w-36 py-0 text-xs"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Select
                          aria-label={`Estado IC de ${a.ic_name}`}
                          options={MEMBER_STATUSES}
                          value={a.member_status}
                          onChange={(e) => patch(a.id, { member_status: e.target.value })}
                          className="h-8 w-28 py-0 text-xs"
                        />
                        <Badge tone={memberTone(a.member_status)}>{a.member_status.charAt(0)}</Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{relativeTime(a.last_access)}</td>
                    <td className="px-4 py-3 text-right">
                      {a.id !== session.id ? (
                        <IconBtn label={`Eliminar cuenta de ${a.ic_name}`} onClick={() => setToDelete(a)}>
                          <Trash2 className="size-3.5" aria-hidden="true" />
                        </IconBtn>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="Seguridad de salas" code="SEC">
        {!rooms.data ? (
          <div className="p-4">
            <LoadingRows />
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {rooms.data.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                {r.locked ? <Lock className="size-4 text-blood" aria-hidden="true" /> : <LockOpen className="size-4 text-ok" aria-hidden="true" />}
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm text-foreground">{r.name}</span>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {r.locked ? 'Bloqueada' : 'Abierta'} · {r.hasPin ? 'Código configurado' : 'Sin código'}
                  </span>
                </div>
                <Btn size="sm" onClick={() => setSecurityRoom(r)}>
                  <KeyRound className="size-3.5" aria-hidden="true" />
                  Configurar
                </Btn>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <ConfirmDialog
        open={Boolean(decision)}
        title={decision?.action === 'approve' ? 'Aprobar ingreso' : 'Rechazar solicitud'}
        message={
          decision
            ? decision.action === 'approve'
              ? `${decision.account.ic_name} (@${decision.account.alias}) entrará en la red con el rango ${decision.rank}.`
              : `Se rechazará la solicitud de ${decision.account.ic_name} (@${decision.account.alias}).`
            : ''
        }
        confirmLabel={decision?.action === 'approve' ? 'Aprobar' : 'Rechazar'}
        onClose={() => setDecision(null)}
        onConfirm={async () => {
          if (!decision) return
          await api('PATCH', `/api/admin/accounts/${decision.account.id}`, {
            action: decision.action,
            ...(decision.action === 'approve' ? { rank: decision.rank } : {}),
          })
          await accounts.mutate()
        }}
      />

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Eliminar cuenta"
        message={`Se eliminará la cuenta de ${toDelete?.ic_name ?? ''} (@${toDelete?.alias ?? ''}) de forma permanente.`}
        confirmLabel="Eliminar"
        onClose={() => setToDelete(null)}
        onConfirm={async () => {
          if (!toDelete) return
          await api('DELETE', `/api/admin/accounts/${toDelete.id}`)
          await accounts.mutate()
        }}
      />

      <FormModal
        key={securityRoom?.id ?? 'none'}
        open={Boolean(securityRoom)}
        onClose={() => setSecurityRoom(null)}
        title={securityRoom?.name ?? ''}
        code="Seguridad de sala"
        onSubmit={async (f) => {
          if (!securityRoom) return
          const pin = String(f.get('pin') ?? '')
          await api('PATCH', `/api/admin/rooms/${securityRoom.id}`, {
            locked: f.get('locked') === 'on',
            ...(pin ? { pin } : {}),
          })
          await rooms.mutate()
        }}
      >
        <label className="flex items-center gap-3 border border-border bg-surface px-3 py-3 text-sm text-foreground">
          <input type="checkbox" name="locked" defaultChecked={securityRoom?.locked} className="accent-[#b91c1c]" />
          Sala bloqueada por código
        </label>
        <Field
          label={securityRoom?.hasPin ? 'Rotar código' : 'Configurar código'}
          hint="Entre 4 y 64 caracteres. Déjalo vacío para mantener el actual. Rotarlo expulsa a quien tuviera acceso."
        >
          {(id) => <Input id={id} name="pin" type="password" autoComplete="new-password" minLength={4} maxLength={64} className="font-mono" />}
        </Field>
      </FormModal>
    </>
  )
}
