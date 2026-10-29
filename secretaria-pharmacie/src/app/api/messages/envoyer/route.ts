import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { envoyerMessage } from '@/lib/messaging/envoyerMessage'
import { formaterDateHeureParis, smsRappel } from '@/lib/messaging/contenus'
import { unwrapEmbed } from '@/lib/supabase/unwrap'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function secretWebhookValide(recu: string | null): boolean {
  const attendu = process.env.N8N_WEBHOOK_SECRET
  return !!attendu && !!recu && recu === attendu
}

/** n8n : rappels H-2. Header x-webhook-secret + { reservation_id, type: 'rappel' }. */
async function envoyerRappel(reservationId: string) {
  const { data: reservation } = await supabaseAdmin
    .from('reservations')
    .select(
      'id, client_telephone, statut, creneaux(debut, pharmacies(nom, telephone))'
    )
    .eq('id', reservationId)
    .maybeSingle()

  if (!reservation) {
    return NextResponse.json({ error: 'Réservation introuvable' }, { status: 404 })
  }
  if (reservation.statut !== 'confirme') {
    return NextResponse.json({ error: 'Réservation non confirmée' }, { status: 400 })
  }

  const creneau = unwrapEmbed<{ debut: string; pharmacies: unknown }>(reservation.creneaux)
  const pharmacie = unwrapEmbed<{ nom: string; telephone: string }>(creneau?.pharmacies)
  if (!creneau?.debut || !pharmacie) {
    return NextResponse.json({ error: 'Créneau ou pharmacie introuvable' }, { status: 404 })
  }

  const { heure } = formaterDateHeureParis(creneau.debut)
  const envoi = await envoyerMessage({
    type: 'rappel',
    telephone: reservation.client_telephone as string,
    reservationId: reservation.id as string,
    contenuSms: smsRappel({
      pharmacie: pharmacie.nom ?? '',
      heure,
      telephonePharmacie: pharmacie.telephone ?? '',
    }),
  })

  if (envoi.ok) {
    await supabaseAdmin
      .from('reservations')
      .update({ rappel_envoye: true })
      .eq('id', reservation.id)
  }

  return NextResponse.json({ ok: envoi.ok, canal: envoi.canal, erreur: envoi.erreur ?? null })
}

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-webhook-secret')
  const body = await request.json().catch(() => ({}))

  // n8n (rappels) : ne pas confondre avec le chat client ci-dessous.
  if (body?.type === 'rappel' && typeof body.reservation_id === 'string') {
    if (!secretWebhookValide(secret)) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
    return envoyerRappel(body.reservation_id)
  }

  const { token, contenu } = body as { token?: string; contenu?: string }

  if (!token || !contenu?.trim()) {
    return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })
  }

  const { data: reservation } = await supabaseAdmin
    .from('reservations')
    .select('id')
    .eq('token_gestion', token)
    .single()

  if (!reservation) {
    return NextResponse.json({ error: 'Réservation introuvable' }, { status: 404 })
  }

  const { error } = await supabaseAdmin.from('messages').insert({
    reservation_id: reservation.id,
    expediteur: 'client',
    contenu: contenu.trim(),
    lu: false,
  })

  if (error) {
    return NextResponse.json({ error: 'Erreur envoi message' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
