'use client'

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function parse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    if (res.status === 401 && typeof window !== 'undefined') window.location.reload()
    throw new ApiError((data as { error?: string }).error ?? 'Error inesperado', res.status)
  }
  return data as T
}

export const fetcher = <T,>(url: string) => fetch(url, { cache: 'no-store' }).then((r) => parse<T>(r))

export async function api<T = unknown>(method: 'POST' | 'PATCH' | 'PUT' | 'DELETE', url: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body instanceof FormData ? undefined : { 'Content-Type': 'application/json' },
    body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body),
  })
  return parse<T>(res)
}

export function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : 'Error inesperado'
}

const money = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
export function formatMoney(value: number | string | null | undefined) {
  return money.format(Number(value ?? 0))
}

const dateTime = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: '2-digit',
  year: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})
export function formatDateTime(value: string | null | undefined) {
  return value ? dateTime.format(new Date(value)) : '—'
}

const time = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
export function formatTime(value: string) {
  return time.format(new Date(value))
}

export function relativeTime(value: string | null | undefined) {
  if (!value) return 'Nunca'
  const diff = Date.now() - new Date(value).getTime()
  const min = Math.round(diff / 60000)
  if (min < 1) return 'Ahora'
  if (min < 60) return `Hace ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `Hace ${h} h`
  const d = Math.round(h / 24)
  if (d < 30) return `Hace ${d} d`
  return formatDateTime(value)
}

export type ClientSession = {
  id: string
  alias: string
  ic: string
  rank: 'Recluta' | 'Miembro' | 'Sicario' | 'Alto Mando' | 'Corona'
  isRoot: boolean
  phone: string | null
  memberStatus: string
}
