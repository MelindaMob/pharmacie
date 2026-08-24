import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const { token, contenu } = await request.json()

  if (!token || !contenu?.trim()) {
    return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })
  }

  const { data: reservation } = await supabaseAdmin
    .from('reservations')
    .select('id')
    .eq('token_gestion', token)
    .single()

  if (!reservation) {
    return NextResponse.json({ error: 'Réservation introuvable' }, { status: 404 })
  }

  const { error } = await supabaseAdmin.from('messages').insert({
    reservation_id: reservation.id,
    expediteur: 'client',
    contenu: contenu.trim(),
    lu: false,
  })

  if (error) {
    return NextResponse.json({ error: 'Erreur envoi message' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
