import { dbFail, fail, guard, isUuid, logActivity, ok, readJson, type RouteCtx } from '@/lib/br/api'
import { db } from '@/lib/br/db'
import { getRoom, hasRoomAccess } from '@/lib/br/rooms'
import { cleanText } from '@/lib/br/validate'

async function authorize(ctx: RouteCtx, minRank?: 'Corona') {
  const s = await guard(minRank)
  if (s instanceof Response) return s
  const { id } = await ctx.params
  if (!isUuid(id)) return fail('Sala no válida')
  const room = await getRoom(id)
  if (!room) return fail('Sala no encontrada', 404)
  if (!(await hasRoomAccess(s, room))) return fail('Acceso a la sala denegado', 403)
  return { s, room }
}

export async function GET(_req: Request, ctx: RouteCtx) {
  const auth = await authorize(ctx)
  if (auth instanceof Response) return auth
  const { data, error } = await db()
    .from('br_room_messages')
    .select('id, author_alias, author_ic, content, created_at')
    .eq('room_id', auth.room.id)
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) return dbFail(error)
  return ok((data ?? []).reverse())
}

export async function POST(req: Request, ctx: RouteCtx) {
  const auth = await authorize(ctx)
  if (auth instanceof Response) return auth
  const body = await readJson(req)
  const content = cleanText(body.content, 2000)
  if (!content) return fail('El mensaje está vacío')

  const { data, error } = await db()
    .from('br_room_messages')
    .insert({ room_id: auth.room.id, author_alias: auth.s.alias, author_ic: auth.s.ic, content })
    .select('id, author_alias, author_ic, content, created_at')
    .single()
  if (error) return dbFail(error)
  return ok(data, 201)
}

export async function DELETE(_req: Request, ctx: RouteCtx) {
  const auth = await authorize(ctx, 'Corona')
  if (auth instanceof Response) return auth
  const { error } = await db().from('br_room_messages').delete().eq('room_id', auth.room.id)
  if (error) return dbFail(error)
  await logActivity(auth.s, 'purgó el canal', auth.room.name)
  return ok({ ok: true })
}
