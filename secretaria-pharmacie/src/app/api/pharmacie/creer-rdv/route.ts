import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { getUserRole } from '@/lib/auth/getRole'
import { normaliserNumeroFrancais } from '@/lib/sms/envoyerSms'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function messageErreurReservation(code: string | undefined, message: string | undefined) {
  if (code === '23514' && message?.includes('canal')) {
    return "Canal « manuel » non autorisé en base. Exécutez sql/reservations_canal_manuel.sql dans Supabase."
  }
  if (code === '23505') {
    return 'Ce créneau est déjà réservé.'
  }
  if (message?.includes('client_email')) {
    return "Colonne client_email absente. Exécutez sql/reservations_client_email.sql dans Supabase."
  }
  return 'Erreur création réservation'
}

export async function POST(request: NextRequest) {
  const role = await getUserRole()
  if (!role || role.role !== 'pharmacie') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const { creneauId, prenom, nom, telephone, email } = await request.json()

  const prenomTrim = typeof prenom === 'string' ? prenom.trim() : ''
  const nomTrim = typeof nom === 'string' ? nom.trim() : ''
  const nomComplet = [prenomTrim, nomTrim].filter(Boolean).join(' ')

  if (!creneauId || !prenomTrim || !nomTrim || !telephone) {
    return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })
  }

  const { data: creneau } = await supabaseAdmin
    .from('creneaux')
    .select('id, statut, pharmacie_id')
    .eq('id', creneauId)
    .single()

  if (!creneau || creneau.pharmacie_id !== role.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  if (creneau.statut !== 'disponible') {
    return NextResponse.json({ error: "Ce créneau n'est plus disponible" }, { status: 409 })
  }

  const { data: reservationExistante } = await supabaseAdmin
    .from('reservations')
    .select('id, statut')
    .eq('creneau_id', creneauId)
    .maybeSingle()

  if (reservationExistante && reservationExistante.statut !== 'annule') {
    return NextResponse.json({ error: 'Ce créneau est déjà réservé' }, { status: 409 })
  }

  const telephoneNormalise = normaliserNumeroFrancais(telephone)
  const emailNormalise = email?.trim() || null

  const { data: client, error: clientError } = await supabaseAdmin
    .from('clients')
    .insert({
      nom: nomComplet,
      telephone: telephoneNormalise,
      ...(emailNormalise ? { email: emailNormalise } : {}),
    })
    .select('id')
    .single()

  if (clientError || !client) {
    console.error('Erreur création client:', clientError)
    return NextResponse.json({ error: 'Erreur création client' }, { status: 500 })
  }

  if (reservationExistante?.statut === 'annule') {
    await supabaseAdmin.from('reservations').delete().eq('id', reservationExistante.id)
  }

  const { error: resaError } = await supabaseAdmin.from('reservations').insert({
    creneau_id: creneauId,
    client_id: client.id,
    client_nom: nomComplet,
    client_telephone: telephoneNormalise,
    client_email: emailNormalise,
    canal: 'manuel',
    statut: 'confirme',
  })

  if (resaError) {
    console.error('Erreur création réservation:', resaError)
    await supabaseAdmin.from('clients').delete().eq('id', client.id)
    return NextResponse.json(
      { error: messageErreurReservation(resaError.code, resaError.message) },
      { status: resaError.code === '23505' ? 409 : 500 }
    )
  }

  const { error: updateError } = await supabaseAdmin
    .from('creneaux')
    .update({ statut: 'reserve' })
    .eq('id', creneauId)
    .eq('statut', 'disponible')

  if (updateError) {
    console.error('Erreur mise à jour créneau:', updateError)
    return NextResponse.json({ error: "Ce créneau vient d'être pris" }, { status: 409 })
  }

  return NextResponse.json({ success: true })
}
