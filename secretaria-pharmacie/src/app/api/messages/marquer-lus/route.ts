import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { getUserRole } from '@/lib/auth/getRole'
import { marquerMessagesLus } from '@/lib/messages/nonLus'
import { createClient as createServerClient } from '@/lib/supabase/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { reservationId, token } = body as {
    reservationId?: string
    token?: string
  }

  if (token) {
    const { data: reservation } = await supabaseAdmin
      .from('reservations')
      .select('id')
      .eq('token_gestion', token)
      .single()

    if (!reservation) {
      return NextResponse.json({ error: 'Réservation introuvable' }, { status: 404 })
    }

    await marquerMessagesLus(reservation.id, 'client')
    return NextResponse.json({ success: true })
  }

  if (!reservationId) {
    return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })
  }

  const role = await getUserRole()
  if (!role || (role.role !== 'pharmacie' && role.role !== 'client')) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  if (role.role === 'pharmacie') {
    const { data: reservation } = await supabaseAdmin
      .from('reservations')
      .select('id, creneau_id')
      .eq('id', reservationId)
      .single()

    if (!reservation) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    const { data: creneau } = await supabaseAdmin
      .from('creneaux')
      .select('pharmacie_id')
      .eq('id', reservation.creneau_id)
      .single()

    if (!creneau || creneau.pharmacie_id !== role.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    await marquerMessagesLus(reservationId, 'pharmacie')
    return NextResponse.json({ success: true })
  }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: clients } = await supabase
    .from('clients')
    .select('id')
    .eq('auth_user_id', user!.id)

  const clientIds = (clients ?? []).map((c) => c.id)
  if (clientIds.length === 0) clientIds.push(role.id)

  const { data: reservation } = await supabaseAdmin
    .from('reservations')
    .select('id, client_id')
    .eq('id', reservationId)
    .single()

  if (!reservation || !clientIds.includes(reservation.client_id)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  await marquerMessagesLus(reservationId, 'client')
  return NextResponse.json({ success: true })
}
