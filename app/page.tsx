import { AppShell } from '@/components/br/app-shell'
import { LoginScreen } from '@/components/br/login-screen'
import { getSession } from '@/lib/br/session'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const session = await getSession()
  if (!session) return <LoginScreen />
  return <AppShell session={session} />
}
