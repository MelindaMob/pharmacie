import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/auth/getRole'
import { redirect } from 'next/navigation'
import { lierReservationsAuCompte } from '@/lib/clients/lierReservations'
import ListeRdvClient from './ListeRdvClient'
import { NavDashboardClient } from '@/components/NavDashboard'
import { compterNonLusClient } from '@/lib/messages/nonLus'

export const dynamic = 'force-dynamic'

export default async function DashboardClientPage() {
  const role = await getUserRole()
  if (!role || role.role !== 'client') redirect('/connexion')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Re-rattache les RDV invité au cas où l'inscription n'a pas tout fusionné
  if (user) {
    const { data: fiche } = await supabase
      .from('clients')
      .select('id, nom, telephone, email')
      .eq('auth_user_id', user.id)
      .limit(1)
      .maybeSingle()

    if (fiche?.telephone) {
      try {
        await lierReservationsAuCompte({
          authUserId: user.id,
          nom: fiche.nom,
          email: fiche.email ?? user.email,
          telephone: fiche.telephone,
        })
      } catch {
        // non bloquant pour l'affichage
      }
    }
  }

  const { data: clients } = await supabase
    .from('clients')
    .select('id')
    .eq('auth_user_id', user!.id)

  const clientIds = (clients ?? []).map((c) => c.id)
  if (clientIds.length === 0) {
    clientIds.push(role.id)
  }

  const { data: reservations } = await supabase
    .from('reservations')
    .select(
      'id, statut, canal, token_gestion, creneaux(debut, pharmacies(id, nom, adresse, telephone, groupement_id))'
    )
    .in('client_id', clientIds)

  const reservationsTriees = [...(reservations ?? [])].sort((a, b) => {
    const da = a.creneaux?.debut ? new Date(a.creneaux.debut).getTime() : 0
    const db = b.creneaux?.debut ? new Date(b.creneaux.debut).getTime() : 0
    return db - da
  })

  const nbNonLus = await compterNonLusClient(clientIds)

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="max-w-2xl mx-auto p-6">
        <NavDashboardClient actif="rdv" nbNonLus={nbNonLus} />
        <ListeRdvClient reservations={reservationsTriees} />
      </div>
    </div>
  )
}
