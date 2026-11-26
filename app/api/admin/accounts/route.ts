import { dbFail, guard, ok } from '@/lib/br/api'
import { db } from '@/lib/br/db'

export async function GET() {
  const s = await guard('Corona')
  if (s instanceof Response) return s
  const { data, error } = await db()
    .from('br_accounts')
    .select('id, alias, ic_name, rank, status, member_status, phone, created_at, last_access')
    .order('created_at', { ascending: false })
  if (error) return dbFail(error)
  return ok(data)
}
