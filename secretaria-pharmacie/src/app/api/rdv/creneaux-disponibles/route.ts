import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { unwrapEmbed } from '@/lib/supabase/unwrap'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/** Créneaux disponibles (même motif) pour déplacer un RDV via token SMS / client. */
export async function POST(request: NextRequest) {
  const { token } = await request.json()

  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'Token manquant' }, { status: 400 })
  }

  const { data: reservation, error } = await supabaseAdmin
    .from('reservations')
    .select('id, statut, creneau_id, creneaux(id, debut, type_rdv_id, pharmacie_id)')
    .eq('token_gestion', token)
    .single()

  if (error || !reservation) {
    return NextResponse.json({ error: 'Réservation introuvable' }, { status: 404 })
  }

  if (reservation.statut !== 'confirme') {
    return NextResponse.json({ error: 'Réservation non déplaçable' }, { status: 400 })
  }

  const creneau = unwrapEmbed<{
    id: string
    debut: string
    type_rdv_id: string
    pharmacie_id: string
  }>(reservation.creneaux)

  if (!creneau?.type_rdv_id || !creneau.pharmacie_id) {
    return NextResponse.json({ error: 'Créneau introuvable' }, { status: 404 })
  }

  const { data: creneaux } = await supabaseAdmin
    .from('creneaux')
    .select('id, debut')
    .eq('pharmacie_id', creneau.pharmacie_id)
    .eq('type_rdv_id', creneau.type_rdv_id)
    .eq('statut', 'disponible')
    .gt('debut', new Date().toISOString())
    .neq('id', creneau.id)
    .order('debut', { ascending: true })
    .limit(40)

  return NextResponse.json({ creneaux: creneaux ?? [] })
}
