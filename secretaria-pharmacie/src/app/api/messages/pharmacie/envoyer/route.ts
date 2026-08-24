import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { getUserRole } from '@/lib/auth/getRole'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function reservationAppartientAPharmacie(reservationId: string, pharmacieId: string) {
  const { data: reservation } = await supabaseAdmin
    .from('reservations')
    .select('id, creneau_id')
    .eq('id', reservationId)
    .single()

  if (!reservation) return false

  const { data: creneau } = await supabaseAdmin
    .from('creneaux')
    .select('pharmacie_id')
    .eq('id', reservation.creneau_id)
    .single()

  return creneau?.pharmacie_id === pharmacieId
}

export async function POST(request: NextRequest) {
  const role = await getUserRole()
  if (!role || role.role !== 'pharmacie') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const { reservationId, contenu } = await request.json()
  if (!reservationId || !contenu?.trim()) {
    return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })
  }

  if (!(await reservationAppartientAPharmacie(reservationId, role.id))) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const { error } = await supabaseAdmin.from('messages').insert({
    reservation_id: reservationId,
    expediteur: 'pharmacie',
    contenu: contenu.trim(),
    lu: false,
  })

  if (error) {
    return NextResponse.json({ error: 'Erreur envoi message' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
