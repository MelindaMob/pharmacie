import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { envoyerSms, normaliserNumeroFrancais } from '@/lib/sms/envoyerSms'
import { unwrapEmbed } from '@/lib/supabase/unwrap'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/** Déplacement d’un RDV par le client (token SMS / page gestion). */
export async function POST(request: NextRequest) {
  const { token, nouveauCreneauId } = await request.json()

  if (!token || !nouveauCreneauId) {
    return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })
  }

  const { data: reservation, error: findError } = await supabaseAdmin
    .from('reservations')
    .select(
      'id, creneau_id, statut, client_telephone, creneaux(debut, type_rdv_id, pharmacie_id, pharmacies(nom, telephone, delai_annulation_heures))'
    )
    .eq('token_gestion', token)
    .single()

  if (findError || !reservation) {
    return NextResponse.json({ error: 'Réservation introuvable' }, { status: 404 })
  }

  if (reservation.statut !== 'confirme') {
    return NextResponse.json({ error: 'Réservation non déplaçable' }, { status: 400 })
  }

  const ancien = unwrapEmbed<{
    debut: string
    type_rdv_id: string
    pharmacie_id: string
    pharmacies: unknown
  }>(reservation.creneaux)

  if (!ancien?.debut) {
    return NextResponse.json({ error: 'Créneau introuvable' }, { status: 404 })
  }

  const pharmacie = unwrapEmbed<{
    nom: string
    telephone: string
    delai_annulation_heures: number | null
  }>(ancien.pharmacies)

  const debutRdv = new Date(ancien.debut)
  const heuresAvant = (debutRdv.getTime() - Date.now()) / (1000 * 60 * 60)
  const delaiMinimum = pharmacie?.delai_annulation_heures ?? 2

  if (heuresAvant < delaiMinimum) {
    return NextResponse.json(
      {
        error: `Déplacement impossible moins de ${delaiMinimum}h avant le rendez-vous. Contactez directement la pharmacie au ${pharmacie?.telephone ?? ''}.`,
      },
      { status: 400 }
    )
  }

  const { data: nouveauCreneau } = await supabaseAdmin
    .from('creneaux')
    .select('id, debut, statut, pharmacie_id, type_rdv_id')
    .eq('id', nouveauCreneauId)
    .single()

  if (!nouveauCreneau || nouveauCreneau.pharmacie_id !== ancien.pharmacie_id) {
    return NextResponse.json({ error: 'Créneau invalide' }, { status: 400 })
  }

  if (nouveauCreneau.type_rdv_id !== ancien.type_rdv_id) {
    return NextResponse.json({ error: 'Le motif du créneau ne correspond pas' }, { status: 400 })
  }

  if (nouveauCreneau.statut !== 'disponible') {
    return NextResponse.json({ error: "Le nouveau créneau n'est plus disponible" }, { status: 409 })
  }

  if (new Date(nouveauCreneau.debut).getTime() <= Date.now()) {
    return NextResponse.json({ error: 'Le nouveau créneau est déjà passé' }, { status: 400 })
  }

  await supabaseAdmin
    .from('creneaux')
    .update({ statut: 'disponible' })
    .eq('id', reservation.creneau_id)

  const { error: reserveError } = await supabaseAdmin
    .from('creneaux')
    .update({ statut: 'reserve' })
    .eq('id', nouveauCreneauId)
    .eq('statut', 'disponible')

  if (reserveError) {
    await supabaseAdmin
      .from('creneaux')
      .update({ statut: 'reserve' })
      .eq('id', reservation.creneau_id)
    return NextResponse.json({ error: "Le nouveau créneau n'est plus disponible" }, { status: 409 })
  }

  await supabaseAdmin
    .from('reservations')
    .update({ creneau_id: nouveauCreneauId })
    .eq('id', reservation.id)

  const dateFormatee = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Paris',
  }).format(new Date(nouveauCreneau.debut))

  const lienGestion = `${process.env.NEXT_PUBLIC_SITE_URL}/rdv/gestion/${token}`

  await envoyerSms(
    normaliserNumeroFrancais(reservation.client_telephone),
    `RDV déplacé chez ${pharmacie?.nom} : ${dateFormatee}. Gérer/annuler : ${lienGestion}`
  )

  return NextResponse.json({
    success: true,
    dateFormatee,
    debut: nouveauCreneau.debut,
  })
}
