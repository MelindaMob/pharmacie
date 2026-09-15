import { createClient } from '@supabase/supabase-js'
import { getUserRole } from '@/lib/auth/getRole'
import { unwrapEmbed } from '@/lib/supabase/unwrap'
import { envoyerSms, normaliserNumeroFrancais } from '@/lib/sms/envoyerSms'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function messageErreur(code: string | undefined, message: string | undefined): string {
  if (message?.trim()) return message
  return "Erreur lors de l'enregistrement"
}

// POST : crée une fiche manquant pour UN patient et UN produit.
export async function POST(request: NextRequest) {
  const role = await getUserRole()
  if (!role || (role.role !== 'pharmacie' && role.role !== 'admin')) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const body = await request.json()
  const pharmacieId = typeof body.pharmacieId === 'string' ? body.pharmacieId : ''
  const medicamentId = typeof body.medicamentId === 'string' ? body.medicamentId : ''
  const quantiteManquante = Number.isFinite(body.quantiteManquante)
    ? Math.max(1, Math.trunc(body.quantiteManquante))
    : 1
  const patientNom = typeof body.patientNom === 'string' ? body.patientNom.trim() : ''
  const patientTelephone =
    typeof body.patientTelephone === 'string' ? body.patientTelephone.trim() : ''
  const patientEmail =
    typeof body.patientEmail === 'string' && body.patientEmail.trim()
      ? body.patientEmail.trim()
      : null

  if (!pharmacieId || !medicamentId || !patientNom || !patientTelephone) {
    return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })
  }

  if (role.role === 'pharmacie' && role.id !== pharmacieId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const { data, error } = await supabaseAdmin
    .from('manquants')
    .insert({
      pharmacie_id: pharmacieId,
      medicament_id: medicamentId,
      quantite_manquante: quantiteManquante,
      patient_nom: patientNom,
      patient_telephone: normaliserNumeroFrancais(patientTelephone),
      patient_email: patientEmail,
    })
    .select('id')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: messageErreur(error?.code, error?.message) }, { status: 400 })
  }

  return NextResponse.json({ success: true, manquantId: data.id })
}

// PATCH : fait avancer une fiche d'un statut à l'autre.
// champ "disponible" : envoie le SMS au patient (une seule fois).
// champ "delivre" : clôture la fiche — elle disparaît du dashboard ET de ce
// que Paul lit (le node n8n filtre sur delivre = false), sans envoi de SMS.
export async function PATCH(request: NextRequest) {
  const role = await getUserRole()
  if (!role || (role.role !== 'pharmacie' && role.role !== 'admin')) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const { id, pharmacieId, champ } = await request.json()
  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'Identifiant manquant' }, { status: 400 })
  }
  if (champ !== 'disponible' && champ !== 'delivre') {
    return NextResponse.json({ error: 'Champ invalide' }, { status: 400 })
  }

  if (role.role === 'pharmacie' && role.id !== pharmacieId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  if (champ === 'delivre') {
    const { error } = await supabaseAdmin
      .from('manquants')
      .update({ delivre: true })
      .eq('id', id)
      .eq('pharmacie_id', pharmacieId)

    if (error) {
      return NextResponse.json({ error: messageErreur(error.code, error.message) }, { status: 400 })
    }
    return NextResponse.json({ success: true })
  }

  // champ === 'disponible'
  const { data, error } = await supabaseAdmin
    .from('manquants')
    .update({ disponible: true })
    .eq('id', id)
    .eq('pharmacie_id', pharmacieId)
    .select(
      `
      id, patient_telephone, sms_envoye,
      medicaments (denomination),
      pharmacies (nom)
    `
    )
    .single()

  if (error || !data) {
    return NextResponse.json({ error: messageErreur(error?.code, error?.message) }, { status: 400 })
  }

  let smsEnvoye = data.sms_envoye as boolean

  if (!smsEnvoye) {
    const medicament = unwrapEmbed<{ denomination: string }>(data.medicaments)
    const pharmacie = unwrapEmbed<{ nom: string }>(data.pharmacies)
    const telephone = normaliserNumeroFrancais(data.patient_telephone as string)

    const resultat = await envoyerSms(
      telephone,
      `Bonjour, votre produit ${medicament?.denomination ?? ''} est disponible à la pharmacie ${
        pharmacie?.nom ?? ''
      }.`
    )

    if (resultat.success) {
      await supabaseAdmin.from('manquants').update({ sms_envoye: true }).eq('id', id)
      smsEnvoye = true
    }
  }

  return NextResponse.json({ success: true, smsEnvoye })
}
