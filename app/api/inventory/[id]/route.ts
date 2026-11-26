import { dbFail, fail, guard, isUuid, logActivity, ok, readJson, type RouteCtx } from '@/lib/br/api'
import { db } from '@/lib/br/db'
import { itemRoute, resources } from '@/lib/br/resources'

const base = itemRoute(resources.inventory)

export const DELETE = base.DELETE

export async function PATCH(req: Request, ctx: RouteCtx) {
  const body = await readJson(req.clone())
  if (!('delta' in body)) return base.PATCH(req, ctx)

  const s = await guard()
  if (s instanceof Response) return s
  const { id } = await ctx.params
  if (!isUuid(id)) return fail('Identificador no válido')
  const delta = Number(body.delta)
  if (delta !== 1 && delta !== -1) return fail('Ajuste no válido')

  const { data: item, error } = await db()
    .from('br_inventory')
    .select('item_name, quantity')
    .eq('id', id)
    .maybeSingle()
  if (error) return dbFail(error)
  if (!item) return fail('Ítem no encontrado', 404)

  const quantity = Math.max(0, item.quantity + delta)
  const { data, error: updateError } = await db()
    .from('br_inventory')
    .update({ quantity, updated_by: s.ic, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single()
  if (updateError) return dbFail(updateError)

  await logActivity(s, delta > 0 ? 'sumó 1 unidad a' : 'retiró 1 unidad de', `${item.item_name} (${quantity})`)
  return ok(data)
}
