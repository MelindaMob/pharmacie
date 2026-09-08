import { createClient } from '@supabase/supabase-js'
import { getUserRole } from '@/lib/auth/getRole'
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
// Pas de mutualisation : si deux patients attendent le même produit,
// ce sont deux lignes indépendantes avec chacune leur propre statut.
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
      patient_telephone: patientTelephone,
      patient_email: patientEmail,
    })
    .select('id')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: messageErreur(error?.code, error?.message) }, { status: 400 })
  }

  return NextResponse.json({ success: true, manquantId: data.id })
}

// PATCH : marque la fiche comme disponible (déclenchera le SMS au patient concerné).
export async function PATCH(request: NextRequest) {
  const role = await getUserRole()
  if (!role || (role.role !== 'pharmacie' && role.role !== 'admin')) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const { id, pharmacieId } = await request.json()
  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'Identifiant manquant' }, { status: 400 })
  }

  if (role.role === 'pharmacie' && role.id !== pharmacieId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const { data, error } = await supabaseAdmin
    .from('manquants')
    .update({ disponible: true })
    .eq('id', id)
    .eq('pharmacie_id', pharmacieId)
    .select('id')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: messageErreur(error?.code, error?.message) }, { status: 400 })
  }

  // TODO (workflow n8n à venir) : déclencher le webhook qui envoie le SMS
  // au patient de cette fiche (sms_envoye = false → true après envoi).
  // await fetch(process.env.N8N_WEBHOOK_MANQUANT_DISPONIBLE!, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ manquantId: id, pharmacieId }),
  // })

  return NextResponse.json({ success: true })
}
