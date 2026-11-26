import { cookies } from 'next/headers'
import { cache } from 'react'
import type { Rank } from './constants'
import { signToken, verifyToken } from './crypto'
import { db } from './db'

export const SESSION_COOKIE = 'br_session'
const MAX_AGE_SECONDS = 60 * 60 * 12

export type Session = {
  id: string
  alias: string
  ic: string
  rank: Rank
  isRoot: boolean
  phone: string | null
  memberStatus: string
}

export const cookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'none' as const,
  path: '/',
}

export function adminAlias(): string {
  return process.env.ADMIN_ALIAS || 'blurryface'
}

export function adminPassword(): string {
  return process.env.ADMIN_PASSWORD || 'Minecraft10_'
}

export async function startSession(sub: string) {
  const token = signToken({ sub, exp: Date.now() + MAX_AGE_SECONDS * 1000 })
  const jar = await cookies()
  jar.set(SESSION_COOKIE, token, { ...cookieOptions, maxAge: MAX_AGE_SECONDS })
}

export async function endSession() {
  const jar = await cookies()
  jar.set(SESSION_COOKIE, '', { ...cookieOptions, maxAge: 0 })
}

export const getSession = cache(async (): Promise<Session | null> => {
  const jar = await cookies()
  const payload = verifyToken<{ sub: string; exp: number }>(jar.get(SESSION_COOKIE)?.value)
  if (!payload) return null

  if (payload.sub === 'root') {
    return {
      id: 'root',
      alias: adminAlias(),
      ic: 'La Corona',
      rank: 'Corona',
      isRoot: true,
      phone: null,
      memberStatus: 'Activo',
    }
  }

  const { data } = await db()
    .from('br_accounts')
    .select('id, alias, ic_name, rank, status, phone, member_status')
    .eq('id', payload.sub)
    .maybeSingle()

  if (!data || data.status !== 'approved') return null
  return {
    id: data.id,
    alias: data.alias,
    ic: data.ic_name,
    rank: data.rank as Rank,
    isRoot: false,
    phone: data.phone,
    memberStatus: data.member_status,
  }
})
