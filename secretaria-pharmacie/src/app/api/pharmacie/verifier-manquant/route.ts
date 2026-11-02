import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { unwrapEmbed } from '@/lib/supabase/unwrap'
import { normaliserNumeroFrancais } from '@/lib/sms/envoyerSms'
import { normaliserTexte } from '@/lib/medicaments/normaliser'
import { chercherParNom, motsDuNom } from '@/lib/manquants/rechercherParNom'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type ManquantAvecMedicament = {
  id: string
  patient_nom: string
  disponible: boolean
  produit_libre: string | null
  medicaments: { denomination: string } | { denomination: string }[] | null
}

/** Nom du produit : médicament de la liste, sinon produit saisi librement. */
function nomProduit(r: ManquantAvecMedicament): string | null {
  return unwrapEmbed<{ denomination: string }>(r.medicaments)?.denomination ?? r.produit_libre ?? null
}

const SEUIL_SUR = 0.9 // même nom ou même prononciation : on retrouve la fiche directement
const SEUIL_PROCHE = 0.7 // nom ressemblant : on fait épeler avant de répondre

/**
 * Fonction appelée par Paul/Léa (Retell) pendant un appel pour savoir si un
 * produit manquant est arrivé pour un patient donné.
 *
 * - Si un nom est donné (nomPatient) : recherche par nom approchant (prononciation,
 *   fautes, ordre prénom/nom) dans les fiches de la pharmacie. Sert aussi quand
 *   quelqu'un appelle pour un proche dont la fiche est à un autre numéro.
 * - Sinon : recherche silencieuse par numéro appelant.
 * - `epele: true` : le nom a été épelé par l'appelant, on accepte alors un nom proche.
 */
export async function POST(request: NextRequest) {
  const body = await request.json()
  const pharmacieId = typeof body.pharmacieId === 'string' ? body.pharmacieId : ''
  const telephoneAppelant =
    typeof body.telephoneAppelant === 'string' ? body.telephoneAppelant : ''
  const nomPatient = typeof body.nomPatient === 'string' ? body.nomPatient.trim() : ''
  const produit = typeof body.produit === 'string' ? body.produit.trim() : ''
  const epele = body.epele === true || body.epele === 'true'

  if (!pharmacieId) {
    return NextResponse.json({ error: 'pharmacieId manquant' }, { status: 400 })
  }

  const selection = 'id, patient_nom, disponible, produit_libre, medicaments (denomination)'

  let resultats: ManquantAvecMedicament[] = []

  if (nomPatient) {
    // Recherche par nom approchant dans toutes les fiches de la pharmacie.
    const { data } = await supabaseAdmin
      .from('manquants')
      .select(selection)
      .eq('pharmacie_id', pharmacieId)
      .limit(2000)
    const fiches = (data ?? []) as ManquantAvecMedicament[]
    const candidats = chercherParNom(nomPatient, fiches, SEUIL_PROCHE)

    if (candidats.length === 0) {
      // Rien de ressemblant par nom : dernier essai avec le numéro appelant.
      if (telephoneAppelant) {
        const { data: parTel } = await supabaseAdmin
          .from('manquants')
          .select(selection)
          .eq('pharmacie_id', pharmacieId)
          .eq('patient_telephone', normaliserNumeroFrancais(telephoneAppelant))
        resultats = (parTel ?? []) as ManquantAvecMedicament[]
      }
      if (resultats.length === 0) {
        return NextResponse.json({ statut: 'introuvable' })
      }
    } else {
      const meilleur = candidats[0].score
      // Nom seulement ressemblant : on fait épeler (sans révéler aucun nom de fiche).
      if (meilleur < SEUIL_SUR && !epele) {
        return NextResponse.json({ statut: 'verifier_orthographe' })
      }
      // Fiches du même patient (nom identique ou quasi) = meilleur score à 0,05 près.
      const proches = candidats.filter((c) => c.score >= meilleur - 0.05).map((c) => c.fiche)
      const patients = new Set(proches.map((f) => normaliserTexte(f.patient_nom)))
      if (patients.size > 1) {
        // Plusieurs personnes possibles (ex. deux « Dupont ») : demander le prénom.
        return NextResponse.json({
          statut: 'besoin_precision',
          besoin: motsDuNom(nomPatient).length >= 2 ? 'epeler' : 'prenom',
        })
      }
      resultats = proches
    }
  } else if (telephoneAppelant) {
    // 1. Essai silencieux par numéro appelant.
    const { data } = await supabaseAdmin
      .from('manquants')
      .select(selection)
      .eq('pharmacie_id', pharmacieId)
      .eq('patient_telephone', normaliserNumeroFrancais(telephoneAppelant))
    resultats = (data ?? []) as ManquantAvecMedicament[]
    if (resultats.length === 0) {
      return NextResponse.json({ statut: 'besoin_precision', besoin: 'nom' })
    }
  }

  if (resultats.length === 0) {
    return NextResponse.json({ statut: 'introuvable' })
  }

  // Plusieurs fiches (le même patient attend plusieurs produits) : préciser avec le produit.
  if (resultats.length > 1 && produit) {
    const produitNormalise = normaliserTexte(produit)
    resultats = resultats.filter((r) => {
      const nom = nomProduit(r)
      return !!nom && normaliserTexte(nom).includes(produitNormalise)
    })
  }

  if (resultats.length > 1) {
    return NextResponse.json({
      statut: 'besoin_precision',
      besoin: 'produit',
      produits: resultats.map((r) => nomProduit(r)),
    })
  }

  const trouve = resultats[0]
  if (!trouve) {
    return NextResponse.json({ statut: 'introuvable' })
  }

  return NextResponse.json({
    statut: 'trouve',
    patientNom: trouve.patient_nom,
    medicament: nomProduit(trouve),
    disponible: trouve.disponible,
  })
}
