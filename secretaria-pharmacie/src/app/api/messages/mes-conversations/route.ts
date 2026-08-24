import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { getUserRole } from '@/lib/auth/getRole'
import { createClient as createServerClient } from '@/lib/supabase/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const role = await getUserRole()
  if (!role || role.role !== 'client') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const { reservationIds } = await request.json()

  if (!reservationIds || reservationIds.length === 0) {
    return NextResponse.json({ messagesParReservation: {} })
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

  const { data: reservationsAutorisees } = await supabaseAdmin
    .from('reservations')
    .select('id')
    .in('id', reservationIds)
    .in('client_id', clientIds)

  const idsAutorises = new Set((reservationsAutorisees ?? []).map((r) => r.id))
  const idsFiltres = reservationIds.filter((id: string) => idsAutorises.has(id))

  if (idsFiltres.length === 0) {
    return NextResponse.json({ messagesParReservation: {} })
  }

  const { data } = await supabaseAdmin
    .from('messages')
    .select('reservation_id, contenu, created_at, expediteur')
    .in('reservation_id', idsFiltres)

  const messagesParReservation: Record<
    string,
    { contenu: string; created_at: string; expediteur: string }[]
  > = {}
  for (const m of data ?? []) {
    if (!messagesParReservation[m.reservation_id]) {
      messagesParReservation[m.reservation_id] = []
    }
    messagesParReservation[m.reservation_id].push(m)
  }

  return NextResponse.json({ messagesParReservation })
}
