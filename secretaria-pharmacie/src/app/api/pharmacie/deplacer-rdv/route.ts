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

  const { reservationId, nouveauCreneauId } = await request.json()

  if (!reservationId || !nouveauCreneauId) {
    return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })
  }

  const { data: nouveauCreneau } = await supabaseAdmin
    .from('creneaux')
    .select('id, statut, pharmacie_id')
    .eq('id', nouveauCreneauId)
    .single()

  if (!nouveauCreneau || nouveauCreneau.pharmacie_id !== role.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  if (nouveauCreneau.statut !== 'disponible') {
    return NextResponse.json({ error: "Le nouveau créneau n'est plus disponible" }, { status: 409 })
  }

  const { data: reservation } = await supabaseAdmin
    .from('reservations')
    .select('id, creneau_id')
    .eq('id', reservationId)
    .single()

  if (!reservation) {
    return NextResponse.json({ error: 'Réservation introuvable' }, { status: 404 })
  }

  const { data: ancienCreneau } = await supabaseAdmin
    .from('creneaux')
    .select('pharmacie_id')
    .eq('id', reservation.creneau_id)
    .single()

  if (!ancienCreneau || ancienCreneau.pharmacie_id !== role.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  await supabaseAdmin
    .from('creneaux')
    .update({ statut: 'disponible' })
    .eq('id', reservation.creneau_id)

  const { error: reserveError } = await supabaseAdmin
    .from('creneaux')
    .update({ statut: 'reserve' })
    .eq('id', nouveauCreneauId)
    .eq('statut', 'disponible')

  if (reserveError) {
    await supabaseAdmin
      .from('creneaux')
      .update({ statut: 'reserve' })
      .eq('id', reservation.creneau_id)
    return NextResponse.json({ error: "Le nouveau créneau n'est plus disponible" }, { status: 409 })
  }

  await supabaseAdmin
    .from('reservations')
    .update({ creneau_id: nouveauCreneauId })
    .eq('id', reservationId)

  return NextResponse.json({ success: true })
}
