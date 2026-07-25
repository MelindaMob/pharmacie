'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import AdresseAutocomplete from '@/components/AdresseAutocomplete'

export default function LandingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState('')
  const [selection, setSelection] = useState<{ lat: number; lng: number } | null>(null)

  const rechercherParAdresse = () => {
    if (!selection) {
      setErreur('Choisissez une adresse dans la liste de suggestions')
      return
    }
    router.push(`/recherche?lat=${selection.lat}&lng=${selection.lng}`)
  }

  const rechercherAvecGeoloc = () => {
    if (!navigator.geolocation) {
      setErreur('Géolocalisation non supportée par votre navigateur')
      return
    }

    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        router.push(
          `/recherche?lat=${position.coords.latitude}&lng=${position.coords.longitude}`
        )
      },
      () => {
        setLoading(false)
        setErreur('Impossible de récupérer votre position')
      }
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-xl w-full text-center">
        <h1 className="text-4xl font-bold mb-3">
          Prenez rendez-vous en pharmacie, en quelques secondes
        </h1>
        <p className="text-gray-600 mb-8">
          Trouvez une pharmacie disponible près de chez vous et réservez votre créneau en ligne.
        </p>

        <div className="flex gap-3 items-start">
          <div className="flex-1 text-left">
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
            {loading ? '...' : '📍 Ma position'}
          </button>
        </div>

        {erreur && <p className="text-red-600 text-sm mt-3">{erreur}</p>}
      </div>
    </div>
  )
}
