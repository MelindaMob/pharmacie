import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { unwrapEmbed } from '@/lib/supabase/unwrap'
import { normaliserNumeroFrancais } from '@/lib/sms/envoyerSms'
import { normaliserTexte } from '@/lib/medicaments/normaliser'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type ManquantAvecMedicament = {
  id: string
  patient_nom: string
  disponible: boolean
  medicaments: { denomination: string } | { denomination: string }[] | null
}

/**
 * Fonction appelée par Paul (Retell) pendant un appel pour savoir si un
 * produit manquant est arrivé pour un patient donné.
 *
 * Route ouverte, sans auth pharmacien — même posture que /api/reserver,
 * validée par les identifiants reçus plutôt que par une session.
 *
 * Identification : pharmacieId et telephoneAppelant sont des constantes
 * liées à l'appel (comme pharmacie_id ailleurs), pas des paramètres que le
 * LLM invente. nomPatient et produit sont extraits de la conversation par
 * Paul, uniquement quand nécessaire (cf. les statuts retournés).
 */
export async function POST(request: NextRequest) {
  const body = await request.json()
  const pharmacieId = typeof body.pharmacieId === 'string' ? body.pharmacieId : ''
  const telephoneAppelant =
    typeof body.telephoneAppelant === 'string' ? body.telephoneAppelant : ''
  const nomPatient = typeof body.nomPatient === 'string' ? body.nomPatient.trim() : ''
  const produit = typeof body.produit === 'string' ? body.produit.trim() : ''

  if (!pharmacieId) {
    return NextResponse.json({ error: 'pharmacieId manquant' }, { status: 400 })
  }

  const selection = 'id, patient_nom, disponible, medicaments (denomination)'

  let resultats: ManquantAvecMedicament[] = []

  // 1. Essai silencieux par numéro appelant.
  if (telephoneAppelant) {
    const { data } = await supabaseAdmin
      .from('manquants')
      .select(selection)
      .eq('pharmacie_id', pharmacieId)
      .eq('patient_telephone', normaliserNumeroFrancais(telephoneAppelant))
    resultats = (data ?? []) as ManquantAvecMedicament[]
  }

  // 2. Repli par nom si le téléphone ne matche rien (autre ligne, proche qui appelle, etc.)
  if (resultats.length === 0 && nomPatient) {
    const { data } = await supabaseAdmin
      .from('manquants')
      .select(selection)
      .eq('pharmacie_id', pharmacieId)
      .ilike('patient_nom_normalise', `%${normaliserTexte(nomPatient)}%`)
    resultats = (data ?? []) as ManquantAvecMedicament[]
  }

  // Rien trouvé par téléphone, et pas encore essayé le nom : demander le nom plutôt que d'abandonner.
  if (resultats.length === 0 && telephoneAppelant && !nomPatient) {
    return NextResponse.json({ statut: 'besoin_precision', besoin: 'nom' })
  }

  // Toujours rien, même avec un nom (ou pas de téléphone du tout) : aucune fiche pour ce patient.
  if (resultats.length === 0) {
    return NextResponse.json({ statut: 'introuvable' })
  }

  // Plusieurs fiches (le même patient attend plusieurs produits) : préciser avec le produit.
  if (resultats.length > 1 && produit) {
    const produitNormalise = normaliserTexte(produit)
    resultats = resultats.filter((r) => {
      const medicament = unwrapEmbed<{ denomination: string }>(r.medicaments)
      return medicament && normaliserTexte(medicament.denomination).includes(produitNormalise)
    })
  }

  if (resultats.length > 1) {
    return NextResponse.json({
      statut: 'besoin_precision',
      besoin: 'produit',
      produits: resultats.map(
        (r) => unwrapEmbed<{ denomination: string }>(r.medicaments)?.denomination ?? null
      ),
    })
  }

  const trouve = resultats[0]
  const medicament = unwrapEmbed<{ denomination: string }>(trouve.medicaments)

  return NextResponse.json({
    statut: 'trouve',
    patientNom: trouve.patient_nom,
    medicament: medicament?.denomination ?? null,
    disponible: trouve.disponible,
  })
}
