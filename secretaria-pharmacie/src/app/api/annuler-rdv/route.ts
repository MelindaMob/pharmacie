import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { envoyerSms, normaliserNumeroFrancais } from '@/lib/sms/envoyerSms'
import { unwrapEmbed } from '@/lib/supabase/unwrap'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const { token } = await request.json()

  if (!token) {
    return NextResponse.json({ error: 'Token manquant' }, { status: 400 })
  }

  const { data: reservation, error: findError } = await supabaseAdmin
    .from('reservations')
    .select(
      'id, creneau_id, statut, client_telephone, creneaux(debut, pharmacie_id, pharmacies(nom, telephone, delai_annulation_heures))'
    )
    .eq('token_gestion', token)
    .single()

  if (findError || !reservation) {
    return NextResponse.json({ error: 'Réservation introuvable' }, { status: 404 })
  }

  if (reservation.statut === 'annule') {
    return NextResponse.json({ error: 'Déjà annulé' }, { status: 400 })
  }

  const creneauRow = unwrapEmbed<{ debut: string; pharmacies: unknown }>(reservation.creneaux)

  if (!creneauRow?.debut) {
    return NextResponse.json({ error: 'Créneau introuvable' }, { status: 404 })
  }

  const pharmacie = unwrapEmbed<{
    nom: string
    telephone: string
    delai_annulation_heures: number | null
  }>(creneauRow.pharmacies)

  const debutRdv = new Date(creneauRow.debut)
  const maintenant = new Date()
  const heuresAvant = (debutRdv.getTime() - maintenant.getTime()) / (1000 * 60 * 60)
  const delaiMinimum = pharmacie?.delai_annulation_heures ?? 2

  if (heuresAvant < delaiMinimum) {
    return NextResponse.json(
      {
        error: `Annulation impossible moins de ${delaiMinimum}h avant le rendez-vous. Contactez directement la pharmacie au ${pharmacie?.telephone ?? ''}.`,
      },
      { status: 400 }
    )
  }

  await supabaseAdmin
    .from('reservations')
    .update({ statut: 'annule' })
    .eq('id', reservation.id)

  await supabaseAdmin
    .from('creneaux')
    .update({ statut: 'disponible' })
    .eq('id', reservation.creneau_id)

  await envoyerSms(
    normaliserNumeroFrancais(reservation.client_telephone),
    `Votre rendez-vous chez ${pharmacie?.nom} a bien été annulé.`
  )

  return NextResponse.json({ success: true })
}
