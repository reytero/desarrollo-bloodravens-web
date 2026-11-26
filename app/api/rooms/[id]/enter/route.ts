import { fail, guard, isUuid, ok, readJson, type RouteCtx } from '@/lib/br/api'
import { verifySecret } from '@/lib/br/crypto'
import { db } from '@/lib/br/db'
import { getRoom, grantRoomAccess, hasRoomAccess } from '@/lib/br/rooms'

const pinAttempts = new Map<string, { count: number; until: number }>()

export async function POST(req: Request, ctx: RouteCtx) {
  const s = await guard()
  if (s instanceof Response) return s
  const { id } = await ctx.params
  if (!isUuid(id)) return fail('Sala no válida')
  const room = await getRoom(id)
  if (!room) return fail('Sala no encontrada', 404)

  if (!(await hasRoomAccess(s, room))) {
    if (!room.pin_hash) return fail('Esta sala no tiene código configurado. Solo la Corona puede entrar.', 403)

    const key = `${s.id}:${room.id}`
    const entry = pinAttempts.get(key)
    if (entry && entry.until > Date.now() && entry.count >= 5) {
      return fail('Demasiados códigos erróneos. Espera unos minutos.', 429)
    }

    const body = await readJson(req)
    const pin = typeof body.pin === 'string' ? body.pin : ''
    if (!pin || !verifySecret(pin, room.pin_hash)) {
      const fresh = !entry || entry.until < Date.now()
      pinAttempts.set(key, { count: fresh ? 1 : entry.count + 1, until: fresh ? Date.now() + 5 * 60_000 : entry.until })
      return fail('Código incorrecto', 403)
    }
    pinAttempts.delete(key)
    await grantRoomAccess(s, room)
  }

  await db().from('br_room_logs').insert({
    room_id: room.id,
    room_name: room.name,
    member_alias: s.alias,
    member_ic: s.ic,
  })
  return ok({ ok: true, room: { id: room.id, name: room.name, category: room.category, locked: room.locked } })
}
