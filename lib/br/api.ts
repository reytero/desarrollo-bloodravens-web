import { NextResponse } from 'next/server'
import { hasRank, type Rank } from './constants'
import { db } from './db'
import { getSession, type Session } from './session'

export type RouteCtx = { params: Promise<{ id: string }> }

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: string): boolean {
  return UUID_RE.test(value)
}

export function ok(data: unknown, status = 200) {
  return NextResponse.json(data, { status })
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export function dbFail(error: { message: string } | null) {
  console.error('[bloodravens] db error:', error?.message)
  return fail('Error de base de datos. Inténtalo de nuevo.', 500)
}

export async function guard(minRank: Rank = 'Recluta'): Promise<Session | NextResponse> {
  const session = await getSession()
  if (!session) return fail('Sesión no válida o expirada', 401)
  if (!hasRank(session.rank, minRank)) return fail('Rango insuficiente para esta acción', 403)
  return session
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json()
    return body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

export async function logActivity(session: Session, action: string, target?: string | null) {
  const { error } = await db()
    .from('br_activity')
    .insert({ actor_alias: session.alias, actor_ic: session.ic, action, target: target ?? null })
  if (error) console.error('[bloodravens] activity log failed:', error.message)
}
