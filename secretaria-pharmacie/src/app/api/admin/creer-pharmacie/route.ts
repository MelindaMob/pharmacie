import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { getUserRole } from '@/lib/auth/getRole'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const role = await getUserRole()
  if (!role || role.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const { nom, email, telephone, groupementId } = await request.json()

  if (!nom || !email || !telephone) {
    return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
    email,
    {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/definir-mot-de-passe`,
    }
  )

  if (authError || !authData.user) {
    return NextResponse.json({ error: authError?.message ?? 'Erreur envoi invitation' }, { status: 400 })
  }

  const { data: pharmacie, error: pharmacieError } = await supabaseAdmin
    .from('pharmacies')
    .insert({
      auth_user_id: authData.user.id,
      nom,
      adresse: '',
      telephone,
      groupement_id: groupementId || null,
      horaires_ouverture: {},
      delai_annulation_heures: 2,
    })
    .select('id')
    .single()

  if (pharmacieError || !pharmacie) {
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: 'Erreur création fiche pharmacie' }, { status: 500 })
  }

  return NextResponse.json({ success: true, pharmacieId: pharmacie.id })
}
