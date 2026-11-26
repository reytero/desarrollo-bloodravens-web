import { dbFail, fail, guard, logActivity, ok, readJson } from '@/lib/br/api'
import { RISK_LEVELS } from '@/lib/br/constants'
import { db } from '@/lib/br/db'
import { cleanText } from '@/lib/br/validate'

export async function GET() {
  const s = await guard()
  if (s instanceof Response) return s
  const { data, error } = await db().from('br_tactical_status').select('*').eq('id', 1).maybeSingle()
  if (error) return dbFail(error)
  return ok(data ?? { id: 1, radio_freq: null, heat_level: 'BAJO', status_note: null, updated_by: null, updated_at: null })
}

export async function PATCH(req: Request) {
  const s = await guard('Alto Mando')
  if (s instanceof Response) return s
  const body = await readJson(req)
  const heat = String(body.heat_level ?? 'BAJO')
  if (!RISK_LEVELS.includes(heat as (typeof RISK_LEVELS)[number])) return fail('Nivel de calor no válido')

  const row = {
    id: 1,
    radio_freq: cleanText(body.radio_freq, 20),
    heat_level: heat,
    status_note: cleanText(body.status_note, 280),
    updated_by: s.ic,
    updated_at: new Date().toISOString(),
  }
  const { data, error } = await db().from('br_tactical_status').upsert(row).select('*').single()
  if (error) return dbFail(error)
  await logActivity(s, 'actualizó el estado táctico', `Calor ${heat}${row.radio_freq ? ` · Freq ${row.radio_freq}` : ''}`)
  return ok(data)
}
