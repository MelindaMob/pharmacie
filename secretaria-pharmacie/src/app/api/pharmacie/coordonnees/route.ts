import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { getUserRole } from '@/lib/auth/getRole'
import { normaliserNumeroFrancais } from '@/lib/telephone'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function estTelephoneFrancaisValide(normalise: string): boolean {
  const chiffres = normalise.replace(/\D/g, '')
  return /^\d{10}$/.test(chiffres) || /^33\d{9}$/.test(chiffres)
}

export async function PATCH(request: NextRequest) {
  const role = await getUserRole()
  if (!role || (role.role !== 'pharmacie' && role.role !== 'admin')) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const body = await request.json()
  const { adresse, telephone, lat, lng, numeroGarde, pharmacieId: pharmacieIdBody } = body as {
    adresse?: string
    telephone?: string
    lat?: number
    lng?: number
    numeroGarde?: string
    pharmacieId?: string
  }

  const pharmacieId =
    role.role === 'pharmacie'
      ? role.id
      : typeof pharmacieIdBody === 'string' && pharmacieIdBody
        ? pharmacieIdBody
        : null

  if (!pharmacieId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const { data: pharmacie, error: findError } = await supabaseAdmin
    .from('pharmacies')
    .select('id, adresse')
    .eq('id', pharmacieId)
    .single()

  if (findError || !pharmacie) {
    return NextResponse.json({ error: 'Pharmacie introuvable' }, { status: 404 })
  }

  const coordsOk =
    typeof lat === 'number' && typeof lng === 'number' && Number.isFinite(lat) && Number.isFinite(lng)

  const updates: Record<string, unknown> = {}

  if (typeof adresse === 'string') {
    const adresseTrim = adresse.trim()
    if (adresseTrim.length > 200) {
      return NextResponse.json({ error: 'Adresse trop longue' }, { status: 400 })
    }
    const aChange = adresseTrim !== (pharmacie.adresse ?? '').trim()
    if (aChange && !coordsOk) {
      return NextResponse.json(
        { error: "Sélectionnez l'adresse dans la liste de suggestions" },
        { status: 400 }
      )
    }
    updates.adresse = adresseTrim
  }

  if (typeof telephone === 'string') {
    const tel = normaliserNumeroFrancais(telephone)
    if (!estTelephoneFrancaisValide(tel)) {
      return NextResponse.json({ error: 'Numéro de téléphone invalide' }, { status: 400 })
    }
    updates.telephone = tel
  }

  if (typeof numeroGarde === 'string') {
    const garde = normaliserNumeroFrancais(numeroGarde)
    if (!garde) {
      return NextResponse.json({ error: 'Le numéro de garde ne peut pas être vide' }, { status: 400 })
    }
    if (!estTelephoneFrancaisValide(garde)) {
      return NextResponse.json({ error: 'Numéro de garde invalide' }, { status: 400 })
    }
    updates.numero_garde = garde
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

  if (coordsOk) {
    await supabaseAdmin.rpc('update_pharmacie_location', {
      p_pharmacie_id: pharmacieId,
      p_lat: lat,
      p_lng: lng,
    })
  }

  return NextResponse.json({ success: true })
}
