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
 * À utiliser comme garde-fou avant toute création/déplacement de RDV —
 * ne jamais se fier au seul champ `statut`, qui n'est qu'un cache.
 */
export async function creneauADeLaPlace(creneauId: string): Promise<boolean> {
  const [count, capacite] = await Promise.all([
    compterReservationsActives(creneauId),
    capaciteDuCreneau(creneauId),
  ])
  return count < capacite
}

/**
 * Recalcule et écrit le statut ('disponible' ou 'reserve') d'un créneau à
 * partir du nombre réel de réservations actives comparé à sa capacité.
 * À appeler après toute création, annulation ou déplacement de RDV touchant
 * ce créneau — jamais fixer 'disponible'/'reserve' à la main.
 */
export async function recalculerStatutCreneau(creneauId: string): Promise<void> {
  const [count, capacite] = await Promise.all([
    compterReservationsActives(creneauId),
    capaciteDuCreneau(creneauId),
  ])

  const supabase = adminClient()
  await supabase
    .from('creneaux')
    .update({ statut: count >= capacite ? 'reserve' : 'disponible' })
    .eq('id', creneauId)
}
