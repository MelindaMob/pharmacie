'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { rechercherPharmaciesProches } from '@/lib/pharmacies/rechercherProches'
import AdresseAutocomplete from '@/components/AdresseAutocomplete'
import CarteResultats from './CarteResultats'

type Resultat = {
  pharmacie_id: string
  nom: string
  adresse: string
  telephone: string
  distance_km: number
  prochain_creneau: string
  pharmacie_lat?: number
  pharmacie_lng?: number
}

function RechercheContent() {
  const searchParams = useSearchParams()
  const [resultats, setResultats] = useState<Resultat[]>([])
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState('')
  const [centre, setCentre] = useState<{ lat: number; lng: number } | null>(null)
  const [selection, setSelection] = useState<{ lat: number; lng: number } | null>(null)

  const lancerRecherche = async (lat: number, lng: number) => {
    setLoading(true)
    setErreur('')
    setCentre({ lat, lng })

    const { data, error } = await rechercherPharmaciesProches(lat, lng)

    setLoading(false)
    if (error) {
      setErreur(`Erreur lors de la recherche : ${error.message}`)
    } else setResultats(data ?? [])
  }

  // Au chargement : si lat/lng sont dans l'URL (venant de la landing), on lance la recherche direct
  useEffect(() => {
    const lat = searchParams.get('lat')
    const lng = searchParams.get('lng')

    if (lat && lng) {
      lancerRecherche(parseFloat(lat), parseFloat(lng))
    }
  }, [searchParams])

  const rechercherAvecGeoloc = () => {
    if (!navigator.geolocation) {
      setErreur('Géolocalisation non supportée par votre navigateur')
      return
    }

    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        lancerRecherche(position.coords.latitude, position.coords.longitude)
      },
      () => {
        setLoading(false)
        setErreur('Impossible de récupérer votre position')
      }
    )
  }

  const rechercherParAdresse = () => {
    if (!selection) {
      setErreur('Choisissez une adresse dans la liste de suggestions')
      return
    }
    lancerRecherche(selection.lat, selection.lng)
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-2">Trouver une pharmacie disponible</h1>
      <p className="text-gray-600 mb-6">
        Recherchez une pharmacie proche de vous avec des créneaux disponibles.
      </p>

      <div className="flex gap-3 items-start mb-6">
        <div className="flex-1">
          <AdresseAutocomplete onSelect={setSelection} />
        </div>
        <button
          onClick={rechercherParAdresse}
          disabled={loading}
          className="bg-black text-white px-4 py-2 rounded disabled:opacity-50 whitespace-nowrap"
        >
          Rechercher
        </button>
        <button
          onClick={rechercherAvecGeoloc}
          disabled={loading}
          className="border border-black text-black px-4 py-2 rounded disabled:opacity-50 whitespace-nowrap"
        >
          📍 Ma position
        </button>
      </div>

      {loading && <p className="text-gray-500 mb-4">Recherche en cours...</p>}
      {erreur && <p className="text-red-600 mb-4">{erreur}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" style={{ height: '600px' }}>
        <div className="space-y-3 overflow-y-auto">
          {resultats.map((r) => (
            <a
              key={r.pharmacie_id}
              href={`/pharmacie/${r.pharmacie_id}`}
              className="block border rounded-lg p-4 hover:bg-gray-50"
            >
              <div className="flex justify-between">
                <h2 className="font-semibold">{r.nom}</h2>
                <span className="text-sm text-gray-500">{r.distance_km} km</span>
              </div>
              <p className="text-sm text-gray-600">{r.adresse}</p>
              <p className="text-sm text-green-700 mt-1">
                Prochain créneau :{' '}
                {new Date(r.prochain_creneau).toLocaleString('fr-FR')}
              </p>
            </a>
          ))}

          {resultats.length === 0 && !loading && (
            <p className="text-gray-500 text-center mt-8">
              Tapez une adresse ou utilisez votre position pour voir les pharmacies proches.
            </p>
          )}
        </div>

        <div className="h-full min-h-[300px]">
          <CarteResultats
            resultats={resultats.map((r) => ({
              ...r,
              lat: r.pharmacie_lat!,
              lng: r.pharmacie_lng!,
            }))}
            centre={centre}
          />
        </div>
      </div>
    </div>
  )
}

export default function RecherchePage() {
  return (
    <Suspense fallback={<p className="p-6 text-gray-500">Chargement...</p>}>
      <RechercheContent />
    </Suspense>
  )
}
