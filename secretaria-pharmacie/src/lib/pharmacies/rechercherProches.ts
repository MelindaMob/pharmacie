import { createClient } from '@/lib/supabase/client'

export type PharmacieProche = {
  pharmacie_id: string
  nom: string
  adresse: string
  telephone: string
  distance_km: number
  prochain_creneau: string
  pharmacie_lat?: number
  pharmacie_lng?: number
}

export async function rechercherPharmaciesProches(
  lat: number,
  lng: number,
  rayonKm: number = 20,
  typeRdvNom?: string
) {
  const supabase = createClient()

  const { data, error } = await supabase.rpc('rechercher_pharmacies_proches', {
    lat,
    lng,
    rayon_km: rayonKm,
    type_rdv_nom: typeRdvNom ?? null,
  })

  return {
    data: (data as PharmacieProche[] | null) ?? null,
    error,
  }
}
