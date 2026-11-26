'use client'

import { ArrowLeft, Lock, LockOpen, Send, ShieldAlert } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import useSWR from 'swr'
import { api, errorMessage, fetcher, formatTime, relativeTime, type ClientSession } from '@/lib/br/client'
import type { Room, RoomMessage } from '@/lib/br/types'
import { cn } from '@/lib/utils'
import { Badge, Btn, ConfirmDialog, EmptyState, ErrorNote, Field, Input, LoadingRows, Modal, SectionHeader } from '../ui'

export function RoomsSection({ session }: { session: ClientSession }) {
  const rooms = useSWR<Room[]>('/api/rooms', fetcher)
  const [active, setActive] = useState<Room | null>(null)
  const [pinFor, setPinFor] = useState<Room | null>(null)
  const [enterError, setEnterError] = useState<string | null>(null)

  async function enter(room: Room, pin?: string) {
    setEnterError(null)
    try {
      await api('POST', `/api/rooms/${room.id}/enter`, pin ? { pin } : {})
      setPinFor(null)
      setActive(room)
      rooms.mutate()
    } catch (err) {
      setEnterError(errorMessage(err))
      throw err
    }
  }

  if (active) return <ChatRoom room={active} session={session} onBack={() => setActive(null)} />

  const list = rooms.data ?? []
  const primary = list.find((r) => !r.locked)
  const locked = list.filter((r) => r !== primary)

  return (
    <>
      <SectionHeader
        code="01 · Salas privadas"
        title="Canales cifrados"
        description="Cada entrada queda registrada. Las salas bloqueadas requieren el código asignado por la Corona."
      />

      {!rooms.data ? (
        <LoadingRows />
      ) : list.length === 0 ? (
        <EmptyState title="No hay salas configuradas" />
      ) : (
        <div className="flex flex-col gap-4">
          {primary ? (
            <button
              type="button"
              onClick={() => enter(primary).catch(() => null)}
              className="group flex flex-col gap-3 border border-blood/50 bg-[linear-gradient(135deg,#b91c1c14,transparent_60%)] p-5 text-left transition-colors hover:border-blood"
            >
              <div className="flex items-center gap-2">
                <LockOpen className="size-4 text-blood" aria-hidden="true" />
                <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-blood">Canal principal</span>
              </div>
              <span className="font-serif text-xl text-foreground">{primary.name}</span>
              <span className="text-sm text-muted-foreground">Abierto para todos los miembros aprobados. Entrar al canal.</span>
            </button>
          ) : null}

          <ErrorNote message={pinFor ? null : enterError} />

          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {locked.map((room) => (
              <li key={room.id}>
                <button
                  type="button"
                  onClick={() => {
                    if (room.access) enter(room).catch(() => null)
                    else {
                      setEnterError(null)
                      setPinFor(room)
                    }
                  }}
                  className="flex h-full w-full flex-col gap-3 border border-border bg-card p-4 text-left transition-colors hover:border-muted-foreground/50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                      {room.category ?? 'Sala'}
                    </span>
                    {room.locked ? (
                      <Badge tone={room.access ? 'green' : 'red'}>
                        <Lock className="size-3" aria-hidden="true" />
                        {room.access ? 'Acceso' : 'Bloqueada'}
                      </Badge>
                    ) : (
                      <Badge tone="green">Abierta</Badge>
                    )}
                  </div>
                  <span className="font-serif text-lg text-foreground">{room.name}</span>
                  {room.locked && !room.hasPin ? (
                    <span className="text-xs text-muted-foreground">Sin código configurado · solo Corona</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <PinModal
        room={pinFor}
        error={enterError}
        onClose={() => setPinFor(null)}
        onSubmit={(pin) => (pinFor ? enter(pinFor, pin) : Promise.resolve())}
      />
    </>
  )
}

function PinModal({
  room,
  error,
  onClose,
  onSubmit,
}: {
  room: Room | null
  error: string | null
  onClose: () => void
  onSubmit: (pin: string) => Promise<void>
}) {
  const [busy, setBusy] = useState(false)

  async function handle(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const pin = String(new FormData(e.currentTarget).get('pin') ?? '')
    setBusy(true)
    await onSubmit(pin).catch(() => null)
    setBusy(false)
  }

  return (
    <Modal open={Boolean(room)} onClose={onClose} title={room?.name ?? ''} code="Código de acceso">
      <form onSubmit={handle} className="flex flex-col gap-4">
        <Field label="Código">
          {(id) => <Input id={id} name="pin" type="password" autoComplete="off" required className="font-mono tracking-[0.3em]" />}
        </Field>
        <ErrorNote message={error} />
        <div className="flex justify-end gap-2">
          <Btn type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Btn>
          <Btn type="submit" variant="primary" loading={busy}>
            Verificar
          </Btn>
        </div>
      </form>
    </Modal>
  )
}

function ChatRoom({ room, session, onBack }: { room: Room; session: ClientSession; onBack: () => void }) {
  const key = `/api/rooms/${room.id}/messages`
  const { data, error, mutate } = useSWR<RoomMessage[]>(key, fetcher, { refreshInterval: 2000 })
  const [draft, setDraft] = useState('')
  const [sendError, setSendError] = useState<string | null>(null)
  const [purgeOpen, setPurgeOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const stickToBottom = useRef(true)
  const isCorona = session.rank === 'Corona'

  const count = data?.length ?? 0
  useEffect(() => {
    const el = scrollRef.current
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight
  }, [count])

  async function send() {
    const content = draft.trim()
    if (!content) return
    setDraft('')
    setSendError(null)
    stickToBottom.current = true
    const temp: RoomMessage = {
      id: `temp-${Date.now()}`,
      author_alias: session.alias,
      author_ic: session.ic,
      content,
      created_at: new Date().toISOString(),
      pending: true,
    }
    try {
      await mutate(
        async (current) => {
          const saved = await api<RoomMessage>('POST', key, { content })
          return [...(current ?? []), saved]
        },
        {
          optimisticData: (current) => [...(current ?? []), temp],
          rollbackOnError: true,
          revalidate: false,
        },
      )
    } catch (err) {
      setSendError(errorMessage(err))
      setDraft(content)
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      if (e.nativeEvent.isComposing || e.keyCode === 229) return
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="flex h-[calc(100dvh-8.5rem)] flex-col border border-border bg-card md:h-[calc(100dvh-10rem)]">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Volver a las salas"
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
        </button>
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-serif text-base text-foreground">{room.name}</span>
          <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-ok">
            <span className="size-1.5 animate-pulse rounded-full bg-ok" aria-hidden="true" />
            Cifrado activo
          </span>
        </div>
        {isCorona ? (
          <Btn size="sm" variant="danger" className="ml-auto" onClick={() => setPurgeOpen(true)}>
            <ShieldAlert className="size-3.5" aria-hidden="true" />
            Purgar canal
          </Btn>
        ) : null}
      </div>

      <div
        ref={scrollRef}
        onScroll={(e) => {
          const el = e.currentTarget
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
        }}
        className="flex-1 overflow-y-auto px-4 py-4"
        aria-live="polite"
      >
        {error ? (
          <ErrorNote message={errorMessage(error)} />
        ) : !data ? (
          <LoadingRows />
        ) : data.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground/70">
              Canal limpio · sin mensajes
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {data.map((m) => {
              const mine = m.author_alias === session.alias
              return (
                <li key={m.id} className={cn('flex flex-col gap-1', mine ? 'items-end' : 'items-start', m.pending && 'opacity-60')}>
                  <div className="flex items-baseline gap-2 font-mono text-[10px] text-muted-foreground">
                    <span className={mine ? 'text-blood' : 'text-gold'}>{m.author_ic}</span>
                    <time dateTime={m.created_at}>{formatTime(m.created_at)}</time>
                  </div>
                  <p
                    className={cn(
                      'max-w-[85%] whitespace-pre-wrap break-words border px-3 py-2 text-sm leading-relaxed md:max-w-[70%]',
                      mine ? 'border-blood/40 bg-blood/10 text-foreground' : 'border-border bg-raised text-foreground',
                    )}
                  >
                    {m.content}
                  </p>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          send()
        }}
        className="flex flex-col gap-2 border-t border-border p-3"
      >
        <ErrorNote message={sendError} />
        <div className="flex items-end gap-2">
          <label htmlFor="chat-input" className="sr-only">
            Mensaje
          </label>
          <textarea
            id="chat-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            maxLength={2000}
            rows={1}
            placeholder="Escribe un mensaje IC…"
            className="max-h-32 min-h-10 flex-1 resize-none border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-blood/70 focus:outline-none"
          />
          <Btn type="submit" variant="primary" disabled={!draft.trim()} aria-label="Enviar">
            <Send className="size-4" aria-hidden="true" />
          </Btn>
        </div>
      </form>

      <ConfirmDialog
        open={purgeOpen}
        title="Purgar canal"
        message={`Se borrarán todos los mensajes de "${room.name}". Esta acción no se puede deshacer.`}
        confirmLabel="Purgar"
        onClose={() => setPurgeOpen(false)}
        onConfirm={async () => {
          await api('DELETE', key)
          await mutate([], { revalidate: true })
        }}
      />
    </div>
  )
}
