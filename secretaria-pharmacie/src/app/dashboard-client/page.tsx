import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/auth/getRole'
import { redirect } from 'next/navigation'
import { lierReservationsAuCompte } from '@/lib/clients/lierReservations'
import { unwrapEmbed } from '@/lib/supabase/unwrap'
import ListeRdvClient from './ListeRdvClient'
import { NavDashboardClient } from '@/components/NavDashboard'
import { compterNonLusClient } from '@/lib/messages/nonLus'

type PharmacieRdv = {
  id: string
  nom: string
  adresse: string
  telephone: string
  groupement_id: string | null
}

export const dynamic = 'force-dynamic'

export default async function DashboardClientPage() {
  const role = await getUserRole()
  if (!role || role.role !== 'client') redirect('/connexion')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: clients } = await supabase
    .from('clients')
    .select('id, nom, telephone, email')
    .eq('auth_user_id', user!.id)

  const clientIds = (clients ?? []).map((c) => c.id)
  if (clientIds.length === 0) {
    clientIds.push(role.id)
  }

  // Fusion invité → compte en arrière-plan (ne bloque pas l'affichage)
  const fiche = clients?.[0]
  if (user && fiche?.telephone) {
    void lierReservationsAuCompte({
      authUserId: user.id,
      nom: fiche.nom,
      email: fiche.email ?? user.email,
      telephone: fiche.telephone,
    }).catch(() => {})
  }

  const [{ data: reservations }, nbNonLus] = await Promise.all([
    supabase
      .from('reservations')
      .select(
        'id, statut, canal, token_gestion, creneaux(debut, pharmacies(id, nom, adresse, telephone, groupement_id))'
      )
      .in('client_id', clientIds),
    compterNonLusClient(clientIds),
  ])

  const reservationsTriees = [...(reservations ?? [])]
    .map((r) => {
      const creneau = unwrapEmbed<{ debut: string; pharmacies: unknown }>(r.creneaux)
      return {
        id: r.id,
        statut: r.statut,
        canal: r.canal,
        token_gestion: r.token_gestion,
        creneaux: creneau
          ? {
              debut: creneau.debut,
              pharmacies: unwrapEmbed<PharmacieRdv>(creneau.pharmacies),
            }
          : null,
      }
    })
    .sort((a, b) => {
      const da = a.creneaux?.debut ? new Date(a.creneaux.debut).getTime() : 0
      const db = b.creneaux?.debut ? new Date(b.creneaux.debut).getTime() : 0
      return db - da
    })

  return (
    <NavDashboardClient actif="rdv" nbNonLus={nbNonLus}>
      <ListeRdvClient reservations={reservationsTriees} />
    </NavDashboardClient>
  )
}
