import { dbFail, fail, guard, isUuid, logActivity, ok, readJson, type RouteCtx } from '@/lib/br/api'
import { MEMBER_STATUSES, RANKS } from '@/lib/br/constants'
import { db } from '@/lib/br/db'

export async function PATCH(req: Request, ctx: RouteCtx) {
  const s = await guard('Corona')
  if (s instanceof Response) return s
  const { id } = await ctx.params
  if (!isUuid(id)) return fail('Identificador no válido')
  const body = await readJson(req)

  const update: Record<string, unknown> = {}
  let action = 'actualizó la cuenta de'

  if (body.action === 'approve') {
    update.status = 'approved'
    action = 'aprobó el ingreso de'
  } else if (body.action === 'reject') {
    update.status = 'rejected'
    action = 'rechazó la solicitud de'
  }
  if ('rank' in body) {
    if (!RANKS.includes(String(body.rank) as (typeof RANKS)[number])) return fail('Rango no válido')
    update.rank = String(body.rank)
    if (!body.action) action = `asignó el rango ${update.rank} a`
  }
  if ('member_status' in body) {
    if (!MEMBER_STATUSES.includes(String(body.member_status) as (typeof MEMBER_STATUSES)[number])) {
      return fail('Estado no válido')
    }
    update.member_status = String(body.member_status)
    if (!body.action && !('rank' in body)) action = `marcó como ${update.member_status} a`
  }
  if (Object.keys(update).length === 0) return fail('No hay cambios que guardar')
  if (id === s.id && (update.status === 'rejected' || (update.rank && update.rank !== 'Corona'))) {
    return fail('No puedes degradar o rechazar tu propia cuenta')
  }

  const { data, error } = await db()
    .from('br_accounts')
    .update(update)
    .eq('id', id)
    .select('alias, ic_name')
    .maybeSingle()
  if (error) return dbFail(error)
  if (!data) return fail('Cuenta no encontrada', 404)
  await logActivity(s, action, `${data.ic_name} (${data.alias})`)
  return ok({ ok: true })
}

export async function DELETE(_req: Request, ctx: RouteCtx) {
  const s = await guard('Corona')
  if (s instanceof Response) return s
  const { id } = await ctx.params
  if (!isUuid(id)) return fail('Identificador no válido')
  if (id === s.id) return fail('No puedes eliminar tu propia cuenta')

  const { data, error } = await db().from('br_accounts').delete().eq('id', id).select('alias, ic_name').maybeSingle()
  if (error) return dbFail(error)
  if (!data) return fail('Cuenta no encontrada', 404)
  await logActivity(s, 'eliminó la cuenta de', `${data.ic_name} (${data.alias})`)
  return ok({ ok: true })
}
