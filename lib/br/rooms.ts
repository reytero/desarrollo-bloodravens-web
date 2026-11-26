import { cookies } from 'next/headers'
import { hasRank } from './constants'
import { signToken, verifyToken } from './crypto'
import { db } from './db'
import { cookieOptions, type Session } from './session'

export type RoomRow = {
  id: string
  slug: string
  name: string
  category: string | null
  locked: boolean
  pin_hash: string | null
  pin_version: number
  updated_at: string
}

const ROOM_ACCESS_SECONDS = 60 * 60 * 6

function roomCookieName(roomId: string) {
  return `br_room_${roomId.replace(/-/g, '')}`
}

export async function getRoom(id: string): Promise<RoomRow | null> {
  const { data } = await db().from('br_rooms').select('*').eq('id', id).maybeSingle()
  return (data as RoomRow | null) ?? null
}

export async function hasRoomAccess(session: Session, room: RoomRow): Promise<boolean> {
  if (!room.locked) return true
  if (hasRank(session.rank, 'Corona')) return true
  const jar = await cookies()
  const payload = verifyToken<{ room: string; v: number; sub: string; exp: number }>(
    jar.get(roomCookieName(room.id))?.value,
  )
  return Boolean(payload && payload.room === room.id && payload.sub === session.id && payload.v === room.pin_version)
}

export async function grantRoomAccess(session: Session, room: RoomRow) {
  const jar = await cookies()
  const token = signToken({
    room: room.id,
    v: room.pin_version,
    sub: session.id,
    exp: Date.now() + ROOM_ACCESS_SECONDS * 1000,
  })
  jar.set(roomCookieName(room.id), token, { ...cookieOptions, maxAge: ROOM_ACCESS_SECONDS })
}
