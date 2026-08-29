import { createClient } from '@supabase/supabase-js'
import { format } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import { NextRequest, NextResponse } from 'next/server'
import { getUserRole } from '@/lib/auth/getRole'
import { envoyerSms, normaliserNumeroFrancais } from '@/lib/sms/envoyerSms'
import { unwrapEmbed } from '@/lib/supabase/unwrap'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const { creneauId, nom, telephone } = await request.json()

  const nomTrim = typeof nom === 'string' ? nom.trim() : ''

  if (!creneauId || !nomTrim || !telephone) {
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

  const dateCreneau = format(toZonedTime(new Date(creneau.debut), 'Europe/Paris'), 'yyyy-MM-dd')
  const { data: exceptionFermeture } = await supabaseAdmin
    .from('horaires_exceptionnels')
    .select('ferme')
    .eq('pharmacie_id', creneau.pharmacie_id)
    .eq('date', dateCreneau)
    .maybeSingle()

  if (exceptionFermeture?.ferme) {
    return NextResponse.json(
      { error: 'Cette pharmacie est fermée à cette date' },
      { status: 409 }
    )
  }

  const telephoneNormalise = normaliserNumeroFrancais(telephone)
  const role = await getUserRole()

  let clientId: string

  if (role?.role === 'client') {
    clientId = role.id
    await supabaseAdmin
      .from('clients')
      .update({ nom: nomTrim, telephone: telephoneNormalise })
      .eq('id', role.id)
  } else {
    const { data: client, error: clientError } = await supabaseAdmin
      .from('clients')
      .insert({
        nom: nomTrim,
        telephone: telephoneNormalise,
      })
      .select('id')
      .single()

    if (clientError || !client) {
      return NextResponse.json({ error: 'Erreur création client' }, { status: 500 })
    }
    clientId = client.id
  }

  const { data: reservation, error: resaError } = await supabaseAdmin
    .from('reservations')
    .insert({
      creneau_id: creneauId,
      client_id: clientId,
      client_nom: nomTrim,
      client_telephone: telephoneNormalise,
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

  const pharmacie = unwrapEmbed<{ nom: string; adresse: string }>(creneau.pharmacies)
  const dateFormatee = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Paris',
  }).format(new Date(creneau.debut))
  const lienGestion = `${process.env.NEXT_PUBLIC_SITE_URL}/rdv/gestion/${reservation.token_gestion}`

  const message = `RDV confirmé chez ${pharmacie?.nom} le ${dateFormatee}. Gérer/annuler : ${lienGestion}`

  await envoyerSms(telephoneNormalise, message)

  return NextResponse.json({
    success: true,
    tokenGestion: reservation.token_gestion,
    dateFormatee,
  })
}
