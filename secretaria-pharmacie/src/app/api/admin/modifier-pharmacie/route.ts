import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { getUserRole } from '@/lib/auth/getRole'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function PATCH(request: NextRequest) {
  const role = await getUserRole()
  if (!role || role.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const body = await request.json()
  const {
    pharmacieId,
    nom,
    adresse,
    lat,
    lng,
    telephone,
    retellPhoneNumber,
    email,
  } = body as {
    pharmacieId?: string
    nom?: string
    adresse?: string
    lat?: number
    lng?: number
    telephone?: string
    retellPhoneNumber?: string
    email?: string
  }

  if (!pharmacieId) {
    return NextResponse.json({ error: 'pharmacieId manquant' }, { status: 400 })
  }

  const { data: pharmacie, error: findError } = await supabaseAdmin
    .from('pharmacies')
    .select('id, auth_user_id')
    .eq('id', pharmacieId)
    .single()

  if (findError || !pharmacie) {
    return NextResponse.json({ error: 'Pharmacie introuvable' }, { status: 404 })
  }

  const updates: Record<string, unknown> = {}
  if (typeof nom === 'string') updates.nom = nom.trim()
  if (typeof adresse === 'string') updates.adresse = adresse.trim()
  if (typeof telephone === 'string') updates.telephone = telephone.trim()
  if (retellPhoneNumber !== undefined) {
    updates.retell_phone_number =
      typeof retellPhoneNumber === 'string' && retellPhoneNumber.trim()
        ? retellPhoneNumber.trim()
        : null
  }

  if (Object.keys(updates).length > 0) {
    const { error: updateError } = await supabaseAdmin
      .from('pharmacies')
      .update(updates)
      .eq('id', pharmacieId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }
  }

  if (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng)
  ) {
    await supabaseAdmin.rpc('update_pharmacie_location', {
      p_pharmacie_id: pharmacieId,
      p_lat: lat,
      p_lng: lng,
    })
  }

  if (typeof email === 'string' && email.trim() && pharmacie.auth_user_id) {
    const { error: emailError } = await supabaseAdmin.auth.admin.updateUserById(
      pharmacie.auth_user_id,
      { email: email.trim() }
    )
    if (emailError) {
      return NextResponse.json(
        { error: `Infos enregistrées, mais email : ${emailError.message}` },
        { status: 400 }
      )
    }
  }

  return NextResponse.json({ success: true })
}
