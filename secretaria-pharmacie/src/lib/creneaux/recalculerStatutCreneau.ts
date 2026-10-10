import { createClient } from '@supabase/supabase-js'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function compterReservationsActives(creneauId: string): Promise<number> {
  const supabase = adminClient()
  const { count } = await supabase
    .from('reservations')
    .select('id', { count: 'exact', head: true })
    .eq('creneau_id', creneauId)
    .neq('statut', 'annule')
  return count ?? 0
}

async function capaciteDuCreneau(creneauId: string): Promise<number> {
  const supabase = adminClient()
  const { data: creneau } = await supabase
    .from('creneaux')
    .select('type_rdv_id')
    .eq('id', creneauId)
    .single()

  if (!creneau) return 1

  const { data: typeRdv } = await supabase
    .from('types_rdv')
    .select('capacite')
    .eq('id', creneau.type_rdv_id)
    .single()

  return typeRdv?.capacite ?? 1
}

/**
 * Un créneau peut-il encore accueillir une réservation de plus ?
 * Source de vérité = la base (fonction SQL `creneau_a_de_la_place`) :
 *  - type avec équipe assignée → il faut un professionnel libre sur ce créneau
 *    (les créneaux des autres types qui se chevauchent comptent aussi) ;
 *  - type sans équipe → ancien comportement (réservations actives < capacité).
 * `ignorerReservationId` : à passer lors d'un déplacement (la réservation déplacée
 * ne doit pas se compter elle-même). Fallback sur l'ancien calcul si la migration SQL n'est pas encore passée.
 */
export async function creneauADeLaPlace(
  creneauId: string,
  ignorerReservationId: string | null = null
): Promise<boolean> {
  const supabase = adminClient()
  const { data, error } = await supabase.rpc('creneau_a_de_la_place', {
    p_creneau_id: creneauId,
    p_ignorer_reservation: ignorerReservationId,
  })
  if (!error && typeof data === 'boolean') return data

  const [count, capacite] = await Promise.all([
    compterReservationsActives(creneauId),
    capaciteDuCreneau(creneauId),
  ])
  return count < capacite
}

/**
 * Recalcule le statut ('disponible' / 'reserve') du créneau ET de tous les
 * créneaux qui le chevauchent (un professionnel pris sur un créneau l'est aussi
 * sur les autres types au même moment). À appeler après toute création,
 * annulation ou déplacement de RDV — jamais fixer le statut à la main.
 */
export async function recalculerStatutCreneau(creneauId: string): Promise<void> {
  const supabase = adminClient()
  const { error } = await supabase.rpc('recalculer_autour_creneau', {
    p_creneau_id: creneauId,
  })
  if (!error) return

  const [count, capacite] = await Promise.all([
    compterReservationsActives(creneauId),
    capaciteDuCreneau(creneauId),
  ])
  await supabase
    .from('creneaux')
    .update({ statut: count >= capacite ? 'reserve' : 'disponible' })
    .eq('id', creneauId)
}
