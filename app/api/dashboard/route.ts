import { dbFail, guard, ok } from '@/lib/br/api'
import { hasRank } from '@/lib/br/constants'
import { db } from '@/lib/br/db'

export async function GET() {
  const s = await guard()
  if (s instanceof Response) return s
  const client = db()
  const isCorona = hasRank(s.rank, 'Corona')

  const [members, ledger, openOps, zones, pending, upcoming, activity, announcements] = await Promise.all([
    client.from('br_accounts').select('id', { count: 'exact', head: true }).eq('status', 'approved').eq('member_status', 'Activo'),
    client.from('br_ledger').select('type, amount'),
    client.from('br_operations').select('id', { count: 'exact', head: true }).neq('status', 'Completada'),
    client.from('br_zones').select('id', { count: 'exact', head: true }),
    isCorona
      ? client.from('br_accounts').select('id', { count: 'exact', head: true }).eq('status', 'pending')
      : Promise.resolve({ count: null, error: null }),
    client
      .from('br_operations')
      .select('id, name, type, status, scheduled_time, team')
      .neq('status', 'Completada')
      .order('created_at', { ascending: false })
      .limit(5),
    client.from('br_activity').select('id, actor_ic, action, target, created_at').order('created_at', { ascending: false }).limit(15),
    client.from('br_announcements').select('*').order('created_at', { ascending: false }).limit(3),
  ])

  const firstError = [members, ledger, openOps, zones, pending, upcoming, activity, announcements].find((r) => r.error)?.error
  if (firstError) return dbFail(firstError)

  const fund = (ledger.data ?? []).reduce(
    (sum, row) => sum + (row.type === 'Entrada' ? Number(row.amount) : -Number(row.amount)),
    0,
  )

  return ok({
    stats: {
      activeMembers: members.count ?? 0,
      fund,
      openOperations: openOps.count ?? 0,
      zones: zones.count ?? 0,
      pendingRequests: isCorona ? (pending.count ?? 0) : null,
    },
    upcoming: upcoming.data ?? [],
    activity: activity.data ?? [],
    announcements: announcements.data ?? [],
  })
}
