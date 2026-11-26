'use client'

import {
  Boxes,
  Crown,
  EyeOff,
  FileImage,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  MessagesSquare,
  Network,
  Swords,
  Tag,
  UserCog,
  X,
  type LucideIcon,
} from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { MEMBER_STATUSES } from '@/lib/br/constants'
import { api, errorMessage, type ClientSession } from '@/lib/br/client'
import { cn } from '@/lib/utils'
import { Facade } from './facade'
import { AdminSection } from './sections/admin'
import { DashboardSection } from './sections/dashboard'
import { EvidenceSection } from './sections/evidence'
import { HierarchySection } from './sections/hierarchy'
import { OperationsSection } from './sections/operations'
import { PricesSection } from './sections/prices'
import { RoomsSection } from './sections/rooms'
import { WarehouseSection } from './sections/warehouse'
import { ZonesSection } from './sections/zones'
import { Badge, Btn, ErrorNote, Field, Input, Modal, rankTone, Select } from './ui'

type SectionKey =
  | 'dashboard'
  | 'rooms'
  | 'zones'
  | 'prices'
  | 'warehouse'
  | 'operations'
  | 'hierarchy'
  | 'evidence'
  | 'admin'

const NAV: { key: SectionKey; label: string; icon: LucideIcon; corona?: boolean }[] = [
  { key: 'dashboard', label: 'Cuartel general', icon: LayoutDashboard },
  { key: 'rooms', label: 'Salas privadas', icon: MessagesSquare },
  { key: 'zones', label: 'Zonas de interés', icon: MapPin },
  { key: 'prices', label: 'Precios', icon: Tag },
  { key: 'warehouse', label: 'Almacén y finanzas', icon: Boxes },
  { key: 'operations', label: 'Operaciones', icon: Swords },
  { key: 'hierarchy', label: 'Jerarquía', icon: Network },
  { key: 'evidence', label: 'Evidencias y Juramento', icon: FileImage },
  { key: 'admin', label: 'Administración', icon: Crown, corona: true },
]

export function AppShell({ session }: { session: ClientSession }) {
  const [section, setSection] = useState<SectionKey>('dashboard')
  const [drawer, setDrawer] = useState(false)
  const [facade, setFacade] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const router = useRouter()
  const isCorona = session.rank === 'Corona'
  const nav = NAV.filter((n) => !n.corona || isCorona)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'x') {
        e.preventDefault()
        setFacade(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const go = useCallback((key: SectionKey) => {
    setSection(key)
    setDrawer(false)
    window.scrollTo({ top: 0 })
  }, [])

  async function logout() {
    await api('POST', '/api/auth/logout').catch(() => null)
    router.refresh()
  }

  const current = nav.find((n) => n.key === section) ?? nav[0]

  return (
    <>
      {facade ? <Facade onExit={() => setFacade(false)} /> : null}
      <div className={cn('min-h-dvh bg-background', facade && 'hidden')} aria-hidden={facade}>
        {drawer ? (
          <button
            type="button"
            aria-label="Cerrar menú"
            className="fixed inset-0 z-30 bg-black/70 lg:hidden"
            onClick={() => setDrawer(false)}
          />
        ) : null}

        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-surface transition-transform lg:translate-x-0',
            drawer ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <div className="flex items-center gap-3 border-b border-border px-5 py-5">
            <Image
              src="/images/bloodravens-shield.png"
              alt=""
              width={40}
              height={40}
              className="h-10 w-auto object-contain"
            />
            <div className="flex flex-col">
              <span className="font-serif text-lg leading-tight text-foreground">BloodRavens</span>
              <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-blood">Red encriptada</span>
            </div>
            <button
              type="button"
              aria-label="Cerrar menú"
              onClick={() => setDrawer(false)}
              className="ml-auto text-muted-foreground lg:hidden"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>

          <nav aria-label="Secciones" className="flex-1 overflow-y-auto py-4">
            <ul className="flex flex-col gap-0.5 px-3">
              {nav.map((item) => {
                const Icon = item.icon
                const active = item.key === section
                return (
                  <li key={item.key}>
                    <button
                      type="button"
                      onClick={() => go(item.key)}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex w-full items-center gap-3 border-l-2 px-3 py-2.5 text-left text-sm transition-colors',
                        active
                          ? 'border-blood bg-blood/10 text-foreground'
                          : 'border-transparent text-muted-foreground hover:bg-raised hover:text-foreground',
                        item.corona && 'text-gold',
                      )}
                    >
                      <Icon className="size-4 shrink-0" aria-hidden="true" />
                      {item.label}
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>

          <div className="border-t border-border px-5 py-4 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
            Ctrl + Shift + X · Fachada
          </div>
        </aside>

        <div className="flex min-h-dvh flex-col lg:pl-64">
          <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur md:px-6">
            <button
              type="button"
              aria-label="Abrir menú"
              onClick={() => setDrawer(true)}
              className="text-muted-foreground hover:text-foreground lg:hidden"
            >
              <Menu className="size-5" aria-hidden="true" />
            </button>
            <span className="truncate font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
              {current.label}
            </span>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFacade(true)}
                className="inline-flex h-8 items-center gap-2 border border-border px-2.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:border-blood/60 hover:text-foreground"
                title="Ocultar al instante (Ctrl+Shift+X)"
              >
                <EyeOff className="size-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Modo fachada</span>
              </button>
              <UserMenu session={session} onProfile={() => setProfileOpen(true)} onLogout={logout} />
            </div>
          </header>

          <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
              {section === 'dashboard' && <DashboardSection session={session} />}
              {section === 'rooms' && <RoomsSection session={session} />}
              {section === 'zones' && <ZonesSection />}
              {section === 'prices' && <PricesSection />}
              {section === 'warehouse' && <WarehouseSection session={session} />}
              {section === 'operations' && <OperationsSection />}
              {section === 'hierarchy' && <HierarchySection />}
              {section === 'evidence' && <EvidenceSection session={session} />}
              {section === 'admin' && isCorona && <AdminSection session={session} />}
            </div>
          </main>
        </div>
      </div>

      <ProfileModal session={session} open={profileOpen} onClose={() => setProfileOpen(false)} />
    </>
  )
}

function UserMenu({
  session,
  onProfile,
  onLogout,
}: {
  session: ClientSession
  onProfile: () => void
  onLogout: () => void
}) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const close = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [open])

  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 items-center gap-2 border border-border bg-card px-2.5 hover:border-muted-foreground/50"
      >
        <span className="flex size-6 items-center justify-center bg-blood/20 font-serif text-xs text-foreground">
          {session.ic.charAt(0).toUpperCase()}
        </span>
        <span className="hidden max-w-36 truncate text-sm text-foreground sm:inline">{session.ic}</span>
      </button>
      {open ? (
        <>
          <button
            type="button"
            tabIndex={-1}
            aria-label="Cerrar menú de usuario"
            className="fixed inset-0 z-30 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div role="menu" className="absolute right-0 z-40 mt-2 w-64 border border-border bg-card shadow-xl">
            <div className="flex flex-col gap-2 border-b border-border px-4 py-3">
              <span className="font-serif text-sm text-foreground">{session.ic}</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] text-muted-foreground">@{session.alias}</span>
                <Badge tone={rankTone(session.rank)}>{session.rank}</Badge>
              </div>
            </div>
            {!session.isRoot ? (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false)
                  onProfile()
                }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-muted-foreground hover:bg-raised hover:text-foreground"
              >
                <UserCog className="size-4" aria-hidden="true" />
                Mi ficha IC
              </button>
            ) : null}
            <button
              type="button"
              role="menuitem"
              onClick={onLogout}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-muted-foreground hover:bg-raised hover:text-foreground"
            >
              <LogOut className="size-4" aria-hidden="true" />
              Cerrar sesión
            </button>
          </div>
        </>
      ) : null}
    </div>
  )
}

function ProfileModal({ session, open, onClose }: { session: ClientSession; open: boolean; onClose: () => void }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setBusy(true)
    setError(null)
    try {
      await api('PATCH', '/api/me', { phone: form.get('phone'), member_status: form.get('member_status') })
      router.refresh()
      onClose()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Mi ficha IC" code={`@${session.alias}`}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label="Teléfono IC">
          {(id) => <Input id={id} name="phone" defaultValue={session.phone ?? ''} maxLength={30} inputMode="tel" />}
        </Field>
        <Field label="Estado">
          {(id) => <Select id={id} name="member_status" defaultValue={session.memberStatus} options={MEMBER_STATUSES} />}
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
