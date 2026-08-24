import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { envoyerSms, normaliserNumeroFrancais } from '@/lib/sms/envoyerSms'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const { creneauId, prenom, nom, telephone, email } = await request.json()

  const prenomTrim = typeof prenom === 'string' ? prenom.trim() : ''
  const nomTrim = typeof nom === 'string' ? nom.trim() : ''
  const nomComplet = [prenomTrim, nomTrim].filter(Boolean).join(' ')

  if (!creneauId || !prenomTrim || !nomTrim || !telephone) {
    return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })
  }

  const { data: creneau } = await supabaseAdmin
    .from('creneaux')
    .select('id, debut, statut, pharmacie_id, pharmacies(nom, adresse)')
    .eq('id', creneauId)
    .single()

  if (!creneau || creneau.statut !== 'disponible') {
    return NextResponse.json(
      { error: "Ce créneau n'est plus disponible" },
      { status: 409 }
    )
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
    return NextResponse.json({ error: 'Erreur création client' }, { status: 500 })
  }

  const { data: reservation, error: resaError } = await supabaseAdmin
    .from('reservations')
    .insert({
      creneau_id: creneauId,
      client_id: client.id,
      client_nom: nomComplet,
      client_telephone: telephoneNormalise,
      client_email: emailNormalise,
      canal: 'web',
      statut: 'confirme',
    })
    .select('id, token_gestion')
    .single()

  if (resaError || !reservation) {
    return NextResponse.json({ error: 'Erreur création réservation' }, { status: 500 })
  }

  const { error: updateError } = await supabaseAdmin
    .from('creneaux')
    .update({ statut: 'reserve' })
    .eq('id', creneauId)
    .eq('statut', 'disponible')

  if (updateError) {
    return NextResponse.json({ error: "Ce créneau vient d'être pris" }, { status: 409 })
  }

  const pharmacie = creneau.pharmacies as { nom: string; adresse: string } | null
  const dateFormatee = format(new Date(creneau.debut), "EEEE d MMMM 'à' HH:mm", {
    locale: fr,
  })
  const lienGestion = `${process.env.NEXT_PUBLIC_SITE_URL}/rdv/gestion/${reservation.token_gestion}`

  const message = `RDV confirmé chez ${pharmacie?.nom} le ${dateFormatee}. Gérer/annuler : ${lienGestion}`

  await envoyerSms(telephoneNormalise, message)

  return NextResponse.json({
    success: true,
    tokenGestion: reservation.token_gestion,
    dateFormatee,
  })
}
