import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getUserRole } from '@/lib/auth/getRole'
import { redirect } from 'next/navigation'
import ListeConversations from '@/components/ListeConversations'
import DashboardNav from '../DashboardNav'
import { compterNonLusPharmacie } from '@/lib/messages/nonLus'
import { unwrapEmbed } from '@/lib/supabase/unwrap'

export const dynamic = 'force-dynamic'

export default async function MessagesPharmaciePage() {
  const role = await getUserRole()
  if (!role || role.role !== 'pharmacie') redirect('/connexion')

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: reservationsBrutes } = await supabaseAdmin
    .from('reservations')
    .select(
      'id, client_nom, token_gestion, creneaux!inner(debut, pharmacie_id), messages(contenu, created_at, expediteur)'
    )
    .eq('creneaux.pharmacie_id', role.id)
    .order('created_at', { ascending: false })

  const reservations = (reservationsBrutes ?? []).map((r) => ({
    id: r.id,
    client_nom: r.client_nom,
    token_gestion: r.token_gestion,
    creneaux: unwrapEmbed<{ debut: string }>(r.creneaux),
    messages: r.messages ?? [],
  }))

  const nbNonLus = await compterNonLusPharmacie(role.id)

  return (
    <div className="min-h-screen px-4 py-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">
        <DashboardNav actif="messages" nbNonLus={nbNonLus} />

        <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--color-ink)] mb-6">
          Messages
        </h2>
        <ListeConversations reservations={reservations} role="pharmacie" />
      </div>
    </div>
  )
}
