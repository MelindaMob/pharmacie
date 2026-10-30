import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { normaliserNumeroFrancais } from '@/lib/sms/envoyerSms'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const CATEGORIES = ['demarchage', 'professionnel_sante', 'patient', 'fournisseur', 'autre']

function texte(v: unknown, max = 500): string | null {
  return typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null
}

/**
 * Fonction Retell "laisser_message" (agent de journée, actif en permanence).
 * Enregistre une note écrite pour le pharmacien, sans passer la main à un humain.
 * pharmacie_id et numéro appelant viennent des variables de l'appel, jamais du LLM.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const args = (body.args ?? body) as Record<string, unknown>
  const variables = (body.call?.retell_llm_dynamic_variables ?? {}) as Record<string, unknown>

  const pharmacieId = texte(variables.pharmacie_id, 64) ?? texte(args.pharmacie_id, 64)
  if (!pharmacieId) {
    return NextResponse.json({ error: 'pharmacieId manquant' }, { status: 400 })
  }

  const resume = texte(args.resume, 1500)
  if (!resume) {
    return NextResponse.json({ error: 'resume obligatoire' }, { status: 400 })
  }

  const categorieBrute = texte(args.categorie, 30)
  const categorie = categorieBrute && CATEGORIES.includes(categorieBrute) ? categorieBrute : 'autre'

  const { data: pharmacie } = await supabaseAdmin
    .from('pharmacies')
    .select('id')
    .eq('id', pharmacieId)
    .maybeSingle()
  if (!pharmacie) {
    return NextResponse.json({ error: 'Pharmacie introuvable' }, { status: 404 })
  }

  const telephoneBrut =
    texte(args.telephone, 30) ??
    texte(variables.numero_appelant, 30) ??
    texte(body.call?.from_number, 30)

  const { error } = await supabaseAdmin.from('messages_appels').insert({
    pharmacie_id: pharmacieId,
    categorie,
    demandeur_nom: texte(args.demandeur_nom, 120),
    organisme: texte(args.organisme, 120),
    telephone: telephoneBrut ? normaliserNumeroFrancais(telephoneBrut) : null,
    resume,
  })

  if (error) {
    console.error('laisser_message insert:', error.message)
    return NextResponse.json({ error: "Impossible d'enregistrer le message" }, { status: 500 })
  }

  return NextResponse.json({ success: true, message_vocal: 'Message transmis à la pharmacie.' })
}
