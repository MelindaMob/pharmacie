import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { getUserRole } from '@/lib/auth/getRole'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const role = await getUserRole()
  if (!role || role.role !== 'pharmacie') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const { reservationId } = await request.json()
  if (!reservationId) {
    return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })
  }

  const { data: reservation } = await supabaseAdmin
    .from('reservations')
    .select('id, creneau_id, statut')
    .eq('id', reservationId)
    .single()

  if (!reservation) {
    return NextResponse.json({ error: 'Réservation introuvable' }, { status: 404 })
  }

  const { data: creneau } = await supabaseAdmin
    .from('creneaux')
    .select('pharmacie_id')
    .eq('id', reservation.creneau_id)
    .single()

  if (!creneau || creneau.pharmacie_id !== role.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  await supabaseAdmin
    .from('reservations')
    .update({ statut: 'annule' })
    .eq('id', reservationId)

  await supabaseAdmin
    .from('creneaux')
    .update({ statut: 'disponible' })
    .eq('id', reservation.creneau_id)

  return NextResponse.json({ success: true })
}
