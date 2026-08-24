import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getUserRole } from '@/lib/auth/getRole'
import { redirect } from 'next/navigation'
import ListeConversations from '@/components/ListeConversations'
import { NavDashboardClient } from '@/components/NavDashboard'
import { compterNonLusClient } from '@/lib/messages/nonLus'

export const dynamic = 'force-dynamic'

export default async function MessagesClientPage() {
  const role = await getUserRole()
  if (!role || role.role !== 'client') redirect('/connexion')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: clients } = await supabase
    .from('clients')
    .select('id')
    .eq('auth_user_id', user!.id)

  const clientIds = (clients ?? []).map((c) => c.id)
  if (clientIds.length === 0) clientIds.push(role.id)

  const { data: reservations } = await supabase
    .from('reservations')
    .select('id, token_gestion, creneaux(debut, pharmacies(nom))')
    .in('client_id', clientIds)

  const reservationIds = (reservations ?? []).map((r) => r.id)

  let messagesParReservation: Record<
    string,
    { contenu: string; created_at: string; expediteur: string }[]
  > = {}

  if (reservationIds.length > 0) {
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data } = await supabaseAdmin
      .from('messages')
      .select('reservation_id, contenu, created_at, expediteur')
      .in('reservation_id', reservationIds)

    for (const m of data ?? []) {
      if (!messagesParReservation[m.reservation_id]) {
        messagesParReservation[m.reservation_id] = []
      }
      messagesParReservation[m.reservation_id].push(m)
    }
  }

  const reservationsAvecMessages = (reservations ?? []).map((r) => ({
    ...r,
    messages: messagesParReservation[r.id] ?? [],
  }))

  const nbNonLus = await compterNonLusClient(clientIds)

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="max-w-3xl mx-auto p-6">
        <NavDashboardClient actif="messages" nbNonLus={nbNonLus} />
        <h1 className="font-[family-name:var(--font-display)] text-2xl text-[var(--color-ink)] mb-6">
          Messages
        </h1>
        <ListeConversations reservations={reservationsAvecMessages} role="client" />
      </div>
    </div>
  )
}
