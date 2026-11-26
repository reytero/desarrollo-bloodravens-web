import { dbFail, guard, logActivity, ok, readJson } from '@/lib/br/api'
import { DIPLOMACY_STATUSES } from '@/lib/br/constants'
import { db } from '@/lib/br/db'
import { cleanText } from '@/lib/br/validate'

export async function GET() {
  const s = await guard()
  if (s instanceof Response) return s
  const { data, error } = await db().from('br_diplomacy').select('*')
  if (error) return dbFail(error)
  return ok(data)
}

export async function PUT(req: Request) {
  const s = await guard('Alto Mando')
  if (s instanceof Response) return s
  const body = await readJson(req)
  const now = new Date().toISOString()
  const rows = DIPLOMACY_STATUSES.map((status) => ({
    status,
    names: cleanText(body[status], 2000) ?? '',
    updated_at: now,
  }))
  const { data, error } = await db().from('br_diplomacy').upsert(rows).select('*')
  if (error) return dbFail(error)
  await logActivity(s, 'actualizó la diplomacia de la casa')
  return ok(data)
}
