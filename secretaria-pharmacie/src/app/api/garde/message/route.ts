import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { envoyerMessage } from '@/lib/messaging/envoyerMessage'
import { normaliserNumeroFrancais } from '@/lib/sms/envoyerSms'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const ORDONNANCES = ['aujourdhui', 'anterieure', 'date_inconnue', 'illisible', 'absente']
const APPELANTS = ['patient', 'proche', 'professionnel_sante', 'structure_soins']
const PRIORITES = ['P1', 'P2', 'P3', 'U']
const DELIVRANCES = ['premiere', 'renouvellement']

function texte(v: unknown, max = 500): string | null {
  return typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null
}

/**
 * Appelée par Paul Garde (fonction personnalisée Retell) pour laisser au
 * pharmacien une trace écrite de l'appel, qu'on le réveille ou non.
 *
 * Retell envoie { name, args, call: { retell_llm_dynamic_variables, from_number, ... } }.
 * pharmacie_id et le numéro appelant viennent des variables de l'appel (jamais
 * inventés par le LLM). La route n'accepte d'écrire que si une période de garde
 * est en cours pour cette pharmacie.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const args = (body.args ?? body) as Record<string, unknown>
  const variables = (body.call?.retell_llm_dynamic_variables ?? {}) as Record<string, unknown>

  const pharmacieId =
    texte(variables.pharmacie_id, 64) ?? texte(args.pharmacieId, 64) ?? texte(args.pharmacie_id, 64)
  if (!pharmacieId) {
    return NextResponse.json({ error: 'pharmacieId manquant' }, { status: 400 })
  }

  const priorite = typeof args.priorite === 'string' ? args.priorite.trim().toUpperCase() : ''
  if (!PRIORITES.includes(priorite)) {
    return NextResponse.json({ error: 'priorite invalide (P1, P2, P3 ou U)' }, { status: 400 })
  }
  const resume = texte(args.resume, 1500)
  if (!resume) {
    return NextResponse.json({ error: 'resume obligatoire' }, { status: 400 })
  }

  const maintenant = new Date().toISOString()
  const [{ data: periode }, { data: pharmacie }] = await Promise.all([
    supabaseAdmin
      .from('gardes_periodes')
      .select('id')
      .eq('pharmacie_id', pharmacieId)
      .lte('debut', maintenant)
      .gt('fin', maintenant)
      .limit(1)
      .maybeSingle(),
    supabaseAdmin
      .from('pharmacies')
      .select('garde_seule, numero_sms_garde')
      .eq('id', pharmacieId)
      .maybeSingle(),
  ])
  // Accepté pendant une période de garde, ou en permanence pour une pharmacie « garde seule ».
  if (!periode && !pharmacie?.garde_seule) {
    return NextResponse.json({ error: 'Aucune garde en cours pour cette pharmacie' }, { status: 403 })
  }

  const telephoneBrut =
    texte(args.telephone, 30) ??
    texte(variables.numero_appelant, 30) ??
    texte(body.call?.from_number, 30)

  const ordonnance = texte(args.ordonnance, 30)
  const appelant = texte(args.appelant_type, 30)
  const delivrance = texte(args.type_delivrance, 30)

  const patientNom = texte(args.patient_nom, 120)

  const { data: ligne, error } = await supabaseAdmin
    .from('messages_garde')
    .insert({
    pharmacie_id: pharmacieId,
    priorite,
    appelant_type: appelant && APPELANTS.includes(appelant) ? appelant : null,
    demandeur_nom: texte(args.demandeur_nom, 120),
    patient_nom: patientNom,
    age_patient: texte(args.age_patient, 30),
    telephone: telephoneBrut ? normaliserNumeroFrancais(telephoneBrut) : null,
    ordonnance: ordonnance && ORDONNANCES.includes(ordonnance) ? ordonnance : null,
    medicament: texte(args.medicament, 200),
    categorie: texte(args.categorie, 100),
    type_delivrance: delivrance && DELIVRANCES.includes(delivrance) ? delivrance : null,
    traitement_restant: texte(args.traitement_restant, 100),
    motif: texte(args.motif, 500),
    patient_a_risque: texte(args.patient_a_risque, 300),
    delai_souhaite: texte(args.delai_souhaite, 100),
    resume,
  })
    .select('id')
    .single()

  if (error || !ligne) {
    console.error('messages_garde insert:', error?.message)
    return NextResponse.json({ error: "Impossible d'enregistrer le message" }, { status: 500 })
  }

  // Alerte SMS au pharmacien (P1, P2, U ; pas P3). Volontairement minimale :
  // pas de nom de médicament ni de détail médical dans le SMS, tout est dans l'espace pharmacie.
  let smsEnvoye = false
  const numeroSms = pharmacie?.numero_sms_garde?.trim()
  if (numeroSms && priorite !== 'P3') {
    const libelle: Record<string, string> = {
      U: 'URGENCE MEDICALE orientee vers le 15',
      P1: 'transmission immediate',
      P2: 'rappel prioritaire',
    }
    const qui = [patientNom, telephoneBrut ? normaliserNumeroFrancais(telephoneBrut) : null]
      .filter(Boolean)
      .join(' ')
    const sms = await envoyerMessage({
      type: 'autre',
      telephone: normaliserNumeroFrancais(numeroSms),
      contenuSms: `[Garde] ${priorite} ${libelle[priorite]}${qui ? ` - ${qui}` : ''}. Details : espace pharmacie > Appels de garde.`,
    })
    smsEnvoye = sms.ok
    if (smsEnvoye) {
      await supabaseAdmin.from('messages_garde').update({ sms_envoye: true }).eq('id', ligne.id)
    }
  }

  return NextResponse.json({
    success: true,
    sms_envoye: smsEnvoye,
    message_vocal: 'Message transmis au pharmacien.',
  })
}
