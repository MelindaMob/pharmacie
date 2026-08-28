'use client'

import { useState } from 'react'
import Link from 'next/link'
import { rechercherPharmaciesProches } from '@/lib/pharmacies/rechercherProches'

export default function PremierRdvSuggestions() {
  const [suggestions, setSuggestions] = useState<
    Awaited<ReturnType<typeof rechercherPharmaciesProches>>['data']
  >(null)
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState('')
  const [demande, setDemande] = useState(false)

  const chercherAutour = () => {
    if (!navigator.geolocation) {
      setErreur('Géolocalisation non disponible sur cet appareil')
      return
    }
    setLoading(true)
    setDemande(true)
    setErreur('')

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { data, error } = await rechercherPharmaciesProches(
          position.coords.latitude,
          position.coords.longitude,
          10
        )
        setLoading(false)
        if (error) {
          setErreur('Erreur lors de la recherche')
          return
        }
        setSuggestions((data ?? []).slice(0, 5))
      },
      () => {
        setLoading(false)
        setErreur('Impossible de récupérer votre position')
      }
    )
  }

  const liste = suggestions ?? []

  return (
    <div className="ui-panel p-6 text-center">
      <p className="font-medium text-[var(--color-ink)] mb-1">
        Vous n&apos;avez pas encore de rendez-vous
      </p>
      <p className="text-sm text-[var(--color-ink-soft)] mb-4 leading-relaxed">
        Prenez votre premier rendez-vous via le lien fourni par votre pharmacie, ou trouvez-en
        une près de chez vous.
      </p>

      {!demande && (
        <button
          type="button"
          onClick={chercherAutour}
          className="ui-btn-primary text-sm"
        >
          📍 Trouver une pharmacie près de moi
        </button>
      )}

      {loading && <p className="text-sm text-[var(--color-ink-soft)] mt-3">Recherche en cours…</p>}
      {erreur && <p className="text-sm text-red-600 mt-3">{erreur}</p>}

      {liste.length > 0 && (
        <div className="mt-4 space-y-2 text-left">
          {liste.map((s) => (
            <Link
              key={s.pharmacie_id}
              href={`/pharmacie/${s.pharmacie_id}`}
              className="block border border-[var(--color-line)] rounded-lg p-3 hover:bg-[var(--color-bg)] transition-colors"
            >
              <div className="flex justify-between gap-2">
                <span className="font-medium text-sm text-[var(--color-ink)]">{s.nom}</span>
                <span className="text-xs text-[var(--color-ink-soft)] shrink-0">
                  {Math.round(s.distance_km * 10) / 10} km
                </span>
              </div>
              <p className="text-xs text-[var(--color-ink-soft)] mt-0.5 break-words">{s.adresse}</p>
            </Link>
          ))}
        </div>
      )}

      {demande && !loading && liste.length === 0 && !erreur && (
        <p className="text-sm text-[var(--color-ink-soft)] mt-3">
          Aucune pharmacie trouvée à proximité.
        </p>
      )}
    </div>
  )
}
