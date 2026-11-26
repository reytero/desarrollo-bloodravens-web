import { dbFail, guard, ok } from '@/lib/br/api'
import { db } from '@/lib/br/db'
import { hasRoomAccess, type RoomRow } from '@/lib/br/rooms'

export async function GET() {
  const s = await guard()
  if (s instanceof Response) return s
  const { data, error } = await db().from('br_rooms').select('*').order('locked').order('name')
  if (error) return dbFail(error)

  const rooms = await Promise.all(
    (data as RoomRow[]).map(async (room) => ({
      id: room.id,
      slug: room.slug,
      name: room.name,
      category: room.category,
      locked: room.locked,
      hasPin: Boolean(room.pin_hash),
      updated_at: room.updated_at,
      access: await hasRoomAccess(s, room),
    })),
  )
  return ok(rooms)
}
