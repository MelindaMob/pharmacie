import { createClient } from '@supabase/supabase-js'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/** Messages du client non lus par la pharmacie */
export async function compterNonLusPharmacie(pharmacieId: string): Promise<number> {
  const supabase = adminClient()

  const { data: creneaux } = await supabase
    .from('creneaux')
    .select('id')
    .eq('pharmacie_id', pharmacieId)

  const creneauIds = (creneaux ?? []).map((c) => c.id)
  if (creneauIds.length === 0) return 0

  const { data: reservations } = await supabase
    .from('reservations')
    .select('id')
    .in('creneau_id', creneauIds)

  const reservationIds = (reservations ?? []).map((r) => r.id)
  if (reservationIds.length === 0) return 0

  const { count } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .in('reservation_id', reservationIds)
    .eq('expediteur', 'client')
    .eq('lu', false)

  return count ?? 0
}

/** Messages de la pharmacie non lus par le client */
export async function compterNonLusClient(clientIds: string[]): Promise<number> {
  if (clientIds.length === 0) return 0

  const supabase = adminClient()

  const { data: reservations } = await supabase
    .from('reservations')
    .select('id')
    .in('client_id', clientIds)

  const reservationIds = (reservations ?? []).map((r) => r.id)
  if (reservationIds.length === 0) return 0

  const { count } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .in('reservation_id', reservationIds)
    .eq('expediteur', 'pharmacie')
    .eq('lu', false)

  return count ?? 0
}

export async function marquerMessagesLus(
  reservationId: string,
  lecteur: 'pharmacie' | 'client'
) {
  const supabase = adminClient()
  const expediteurALire = lecteur === 'pharmacie' ? 'client' : 'pharmacie'

  await supabase
    .from('messages')
    .update({ lu: true })
    .eq('reservation_id', reservationId)
    .eq('expediteur', expediteurALire)
    .eq('lu', false)
}
