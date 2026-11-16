'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AdresseAutocomplete from '@/components/AdresseAutocomplete'

export default function CoordonneesForm({
  pharmacieId,
  adresseInitiale,
  telephoneInitial,
}: {
  pharmacieId: string
  adresseInitiale: string
  telephoneInitial: string
}) {
  const router = useRouter()
  const [adresse, setAdresse] = useState(adresseInitiale)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [telephone, setTelephone] = useState(telephoneInitial)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [erreur, setErreur] = useState('')

  const enregistrer = async () => {
    setLoading(true)
    setErreur('')
    setMessage('')

    const body: {
      pharmacieId: string
      telephone: string
      adresse?: string
      lat?: number
      lng?: number
    } = { pharmacieId, telephone }

    if (coords) {
      body.adresse = adresse
      body.lat = coords.lat
      body.lng = coords.lng
    }

    const res = await fetch('/api/pharmacie/coordonnees', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok || data.error) {
      setErreur(typeof data.error === 'string' ? data.error : 'Erreur lors de l\'enregistrement')
      return
    }

    setMessage('Coordonnées enregistrées')
    setCoords(null)
    router.refresh()
  }

  return (
    <div className="ui-panel p-4 sm:p-5 mb-6">
      <h2 className="font-medium text-[var(--color-ink)] mb-4">Coordonnées de la pharmacie</h2>

      <div className="space-y-4">
        <div>
          <label className="ui-label">Adresse</label>
          <AdresseAutocomplete
            valeurInitiale={adresse}
            onSelect={(s) => {
              setAdresse(s.label)
              setCoords({ lat: s.lat, lng: s.lng })
            }}
          />
          {adresse && (
            <p className="text-xs text-[var(--color-ink-soft)] mt-1.5">{adresse}</p>
          )}
        </div>

        <div>
          <label className="ui-label">Téléphone de la pharmacie</label>
          <input
            type="tel"
            value={telephone}
            onChange={(e) => setTelephone(e.target.value)}
            className="ui-input"
            inputMode="tel"
          />
          <p className="text-xs text-[var(--color-ink-soft)] mt-1.5">
            Ce numéro sert à transférer vos appels urgents. Vérifiez qu&apos;il est correct.
          </p>
        </div>

        {erreur && <p className="text-red-600 text-sm">{erreur}</p>}
        {message && <p className="text-[var(--color-accent)] text-sm">{message}</p>}

        <button
          type="button"
          onClick={enregistrer}
          disabled={loading}
          className="ui-btn-primary w-full sm:w-auto"
        >
          {loading ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>
    </div>
  )
}
