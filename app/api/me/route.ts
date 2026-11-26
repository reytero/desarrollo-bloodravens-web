import { dbFail, fail, guard, logActivity, ok, readJson } from '@/lib/br/api'
import { MEMBER_STATUSES } from '@/lib/br/constants'
import { db } from '@/lib/br/db'
import { cleanText } from '@/lib/br/validate'

export async function GET() {
  const s = await guard()
  if (s instanceof Response) return s
  return ok(s)
}

export async function PATCH(req: Request) {
  const s = await guard()
  if (s instanceof Response) return s
  if (s.isRoot) return fail('La cuenta raíz no tiene ficha de miembro editable')

  const body = await readJson(req)
  const update: Record<string, unknown> = {}
  if ('phone' in body) update.phone = cleanText(body.phone, 30)
  if ('member_status' in body) {
    if (!MEMBER_STATUSES.includes(String(body.member_status) as (typeof MEMBER_STATUSES)[number])) {
      return fail('Estado no válido')
    }
    update.member_status = String(body.member_status)
  }
  if (Object.keys(update).length === 0) return fail('No hay cambios que guardar')

  const { error } = await db().from('br_accounts').update(update).eq('id', s.id)
  if (error) return dbFail(error)
  await logActivity(s, 'actualizó su ficha', [update.member_status, update.phone].filter(Boolean).join(' · ') || null)
  return ok({ ok: true })
}
