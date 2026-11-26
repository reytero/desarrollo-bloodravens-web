import { dbFail, fail, guard, isUuid, logActivity, ok, readJson, type RouteCtx } from '@/lib/br/api'
import { hashSecret } from '@/lib/br/crypto'
import { db } from '@/lib/br/db'
import { getRoom } from '@/lib/br/rooms'

export async function PATCH(req: Request, ctx: RouteCtx) {
  const s = await guard('Corona')
  if (s instanceof Response) return s
  const { id } = await ctx.params
  if (!isUuid(id)) return fail('Sala no válida')
  const room = await getRoom(id)
  if (!room) return fail('Sala no encontrada', 404)

  const body = await readJson(req)
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  const changes: string[] = []

  if (typeof body.locked === 'boolean') {
    update.locked = body.locked
    changes.push(body.locked ? 'bloqueada' : 'abierta')
  }
  if (typeof body.pin === 'string' && body.pin.length > 0) {
    if (body.pin.length < 4 || body.pin.length > 64) return fail('El código debe tener entre 4 y 64 caracteres')
    update.pin_hash = hashSecret(body.pin)
    update.pin_version = room.pin_version + 1
    changes.push(room.pin_hash ? 'código rotado' : 'código configurado')
  }
  if (changes.length === 0) return fail('No hay cambios que guardar')

  const { error } = await db().from('br_rooms').update(update).eq('id', id)
  if (error) return dbFail(error)
  await logActivity(s, `actualizó la seguridad de la sala (${changes.join(', ')})`, room.name)
  return ok({ ok: true })
}
