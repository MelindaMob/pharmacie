import { createClient } from '@supabase/supabase-js'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/** Messages du client non lus par la pharmacie (requête jointe, sans charger tous les créneaux). */
export async function compterNonLusPharmacie(pharmacieId: string): Promise<number> {
  const supabase = adminClient()

  const { count, error } = await supabase
    .from('messages')
    .select('id, reservations!inner(creneaux!inner(pharmacie_id))', {
      count: 'exact',
      head: true,
    })
    .eq('expediteur', 'client')
    .eq('lu', false)
    .eq('reservations.creneaux.pharmacie_id', pharmacieId)

  if (error) {
    console.error('compterNonLusPharmacie:', error.message)
    return 0
  }

  return count ?? 0
}

/** Messages de la pharmacie non lus par le client */
export async function compterNonLusClient(clientIds: string[]): Promise<number> {
  if (clientIds.length === 0) return 0

  const supabase = adminClient()

  const { count, error } = await supabase
    .from('messages')
    .select('id, reservations!inner(client_id)', { count: 'exact', head: true })
    .eq('expediteur', 'pharmacie')
    .eq('lu', false)
    .in('reservations.client_id', clientIds)

  if (error) {
    console.error('compterNonLusClient:', error.message)
    return 0
  }

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
