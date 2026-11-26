import { dbFail, guard, ok } from '@/lib/br/api'
import { db } from '@/lib/br/db'

export async function GET() {
  const s = await guard()
  if (s instanceof Response) return s
  const { data, error } = await db()
    .from('br_accounts')
    .select('id, alias, ic_name, rank, member_status, phone, last_access')
    .eq('status', 'approved')
    .order('ic_name', { ascending: true })
  if (error) return dbFail(error)
  return ok(data)
}
