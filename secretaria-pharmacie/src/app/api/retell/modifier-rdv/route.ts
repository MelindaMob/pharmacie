import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { envoyerSms, normaliserNumeroFrancais } from '@/lib/sms/envoyerSms'
import { unwrapEmbed } from '@/lib/supabase/unwrap'
import { recalculerStatutCreneau } from '@/lib/creneaux/recalculerStatutCreneau'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const FENETRE_MINUTES = 60

function texte(v: unknown, max = 80): string | null {
  return typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null
}

function reponse(succes: boolean, message_vocal: string) {
  // Toujours 200 : Retell lit le message_vocal, n8n n'a pas à interpréter d'erreur HTTP.
  return NextResponse.json({ succes, message_vocal })
}

/**
 * Appelée par Paul (fonction Retell "modifier_rdv", via n8n) pour corriger l'heure
 * ou le jour d'un RDV qu'il vient de prendre pendant le même appel.
 * Retell envoie { args: { creneau_id, telephone_client }, call: {...} }.
 * Sécurité : on ne modifie que le RDV confirmé, créé dans la dernière heure,
 * au téléphone donné (ou au numéro appelant).
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const args = (body.args ?? body) as Record<string, unknown>
  const variables = (body.call?.retell_llm_dynamic_variables ?? {}) as Record<string, unknown>

  const nouveauCreneauId = texte(args.creneau_id, 64) ?? texte(args.creneauId, 64)
  const telephoneBrut =
    texte(args.telephone_client, 30) ?? texte(variables.numero_appelant, 30) ?? texte(body.call?.from_number, 30)

  if (!nouveauCreneauId || !telephoneBrut) {
    return reponse(false, "Il me manque l'horaire choisi pour modifier le rendez-vous.")
  }
  const telephone = normaliserNumeroFrancais(telephoneBrut)

  const depuis = new Date(Date.now() - FENETRE_MINUTES * 60 * 1000).toISOString()
  const { data: reservation } = await supabaseAdmin
    .from('reservations')
    .select('id, creneau_id, client_telephone, token_gestion, creneaux(type_rdv_id, pharmacie_id, debut, pharmacies(nom))')
    .eq('client_telephone', telephone)
    .eq('statut', 'confirme')
    .gte('created_at', depuis)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!reservation) {
    return reponse(
      false,
      "Je ne retrouve pas de rendez-vous pris à l'instant avec ce numéro. Pour modifier ou annuler un rendez-vous existant, utilisez le lien reçu par SMS."
    )
  }

  const ancien = unwrapEmbed<{ type_rdv_id: string; pharmacie_id: string; debut: string; pharmacies: unknown }>(
    reservation.creneaux
  )
  const { data: nouveau } = await supabaseAdmin
    .from('creneaux')
    .select('id, debut, pharmacie_id, type_rdv_id')
    .eq('id', nouveauCreneauId)
    .single()

  if (!ancien || !nouveau || nouveau.pharmacie_id !== ancien.pharmacie_id) {
    return reponse(false, "Cet horaire n'est pas valide. Je peux vous en proposer un autre.")
  }
  if (nouveau.type_rdv_id !== ancien.type_rdv_id) {
    return reponse(false, "Cet horaire ne correspond pas au même type de rendez-vous.")
  }
  if (new Date(nouveau.debut).getTime() <= Date.now()) {
    return reponse(false, "Cet horaire est déjà passé. Je peux vous en proposer un autre.")
  }
  if (nouveau.id === reservation.creneau_id) {
    return reponse(true, "Votre rendez-vous est déjà à cette heure-là.")
  }

  // Les triggers en base réattribuent le professionnel et refusent (P0001) si plus personne n'est libre.
  const { error } = await supabaseAdmin
    .from('reservations')
    .update({ creneau_id: nouveau.id })
    .eq('id', reservation.id)

  if (error) {
    if (error.code === 'P0001' || error.code === '23505') {
      return reponse(false, "Ce créneau vient malheureusement d'être pris. Voulez-vous un autre horaire ?")
    }
    return reponse(false, "Je n'ai pas réussi à modifier le rendez-vous. Voulez-vous réessayer ?")
  }

  await recalculerStatutCreneau(reservation.creneau_id)
  await recalculerStatutCreneau(nouveau.id)

  const dateFormatee = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Paris',
  }).format(new Date(nouveau.debut))

  const pharmacie = unwrapEmbed<{ nom: string }>(ancien.pharmacies)
  const lienGestion = `${process.env.NEXT_PUBLIC_SITE_URL}/rdv/gestion/${reservation.token_gestion}`
  await envoyerSms(
    telephone,
    `RDV modifié chez ${pharmacie?.nom ?? 'la pharmacie'} : ${dateFormatee}. Gérer/annuler : ${lienGestion}`
  )

  return reponse(true, `C'est modifié ! Votre rendez-vous est maintenant le ${dateFormatee}. Vous allez recevoir un SMS.`)
}
