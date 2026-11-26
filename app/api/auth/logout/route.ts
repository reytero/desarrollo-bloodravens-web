import { logActivity, ok } from '@/lib/br/api'
import { endSession, getSession } from '@/lib/br/session'

export async function POST() {
  const session = await getSession()
  if (session) await logActivity(session, 'cerró sesión')
  await endSession()
  return ok({ ok: true })
}
