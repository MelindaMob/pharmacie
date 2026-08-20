import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const { token } = await request.json()

  if (!token) {
    return NextResponse.json({ error: 'Token manquant' }, { status: 400 })
  }

  const { data: reservation } = await supabaseAdmin
    .from('reservations')
    .select('id')
    .eq('token_gestion', token)
    .single()

  if (!reservation) {
    return NextResponse.json({ error: 'Réservation introuvable' }, { status: 404 })
  }

  const { data: messages } = await supabaseAdmin
    .from('messages')
    .select('id, expediteur, contenu, created_at')
    .eq('reservation_id', reservation.id)
    .order('created_at', { ascending: true })

  return NextResponse.json({ messages: messages ?? [] })
}
