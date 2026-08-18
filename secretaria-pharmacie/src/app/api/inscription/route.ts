import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { normaliserNumeroFrancais } from '@/lib/sms/envoyerSms'
import { lierReservationsAuCompte } from '@/lib/clients/lierReservations'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const { email, password, nom, telephone } = await request.json()

  if (!email || !password || !nom || !telephone) {
    return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })
  }

  const telephoneNormalise = normaliserNumeroFrancais(telephone)

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError || !authData.user) {
    return NextResponse.json(
      { error: authError?.message ?? 'Erreur création compte' },
      { status: 400 }
    )
  }

  try {
    const clientId = await lierReservationsAuCompte({
      authUserId: authData.user.id,
      nom,
      email,
      telephone: telephoneNormalise,
    })

    return NextResponse.json({ success: true, clientId })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erreur création fiche client' },
      { status: 500 }
    )
  }
}
