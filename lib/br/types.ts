export type Zone = {
  id: string
  name: string
  category: string
  postal: string | null
  risk: string
  notes: string | null
  image_url: string | null
  created_by: string | null
  created_at: string
}

export type Price = {
  id: string
  item_name: string
  category: string
  buy_price: number
  sell_price: number
  internal_price: number
  availability: string
  notes: string | null
  updated_by: string | null
  updated_at: string
}

export type InventoryItem = {
  id: string
  item_name: string
  category: string
  quantity: number
  location: string | null
  notes: string | null
  updated_by: string | null
  updated_at: string
}

export type LedgerEntry = {
  id: string
  label: string
  type: 'Entrada' | 'Salida'
  amount: number
  category: string | null
  responsible: string | null
  notes: string | null
  created_at: string
}

export type Operation = {
  id: string
  name: string
  type: string | null
  status: string
  team: string[]
  scheduled_time: string | null
  amount: number | null
  notes: string | null
  created_by: string | null
  created_at: string
}

export type Member = {
  id: string
  alias: string
  ic_name: string
  rank: string
  member_status: string
  phone: string | null
  last_access: string | null
}

export type Account = Member & { status: string; created_at: string }

export type Room = {
  id: string
  slug: string
  name: string
  category: string | null
  locked: boolean
  hasPin: boolean
  access: boolean
  updated_at: string
}

export type RoomMessage = {
  id: string
  author_alias: string
  author_ic: string
  content: string
  created_at: string
  pending?: boolean
}

export type Evidence = {
  id: string
  title: string
  category: string | null
  storage_path: string
  author_alias: string | null
  author_ic: string | null
  created_at: string
  url: string | null
  canDelete: boolean
}

export type Activity = { id: string; actor_ic: string | null; action: string; target: string | null; created_at: string }

export type Announcement = {
  id: string
  title: string
  body: string
  priority: string
  author_ic: string | null
  created_at: string
}

export type Tactical = {
  radio_freq: string | null
  heat_level: string
  status_note: string | null
  updated_by: string | null
  updated_at: string | null
}

export type Diplomacy = { status: string; names: string; updated_at: string }

export type DashboardData = {
  stats: {
    activeMembers: number
    fund: number
    openOperations: number
    zones: number
    pendingRequests: number | null
  }
  upcoming: Pick<Operation, 'id' | 'name' | 'type' | 'status' | 'scheduled_time' | 'team'>[]
  activity: Activity[]
  announcements: Announcement[]
}
