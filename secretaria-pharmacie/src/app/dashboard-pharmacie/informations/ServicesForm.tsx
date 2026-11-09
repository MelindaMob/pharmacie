'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const SUGGESTIONS = [
  'Matériel médical',
  'Chaussures orthopédiques',
  'Prothèse mammaire',
  'Prothèse capillaire',
  'Homéopathie spécialisée',
  'Phytothérapie',
  'Aromathérapie',
  'Pansements',
]

export default function ServicesForm({
  pharmacieId,
  servicesInitiaux,
}: {
  pharmacieId: string
  servicesInitiaux: string[]
}) {
  const [services, setServices] = useState<string[]>(servicesInitiaux)
  const [autre, setAutre] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [erreur, setErreur] = useState('')
  const router = useRouter()

  const a = (nom: string) => services.some((s) => s.toLowerCase() === nom.toLowerCase())

  const basculer = (nom: string) => {
    setMessage('')
    setServices((prev) =>
      a(nom) ? prev.filter((s) => s.toLowerCase() !== nom.toLowerCase()) : [...prev, nom]
    )
  }

  const ajouterAutre = () => {
    const nom = autre.trim()
    if (!nom || a(nom)) {
      setAutre('')
      return
    }
    setServices((prev) => [...prev, nom])
    setAutre('')
    setMessage('')
  }

  const personnalises = services.filter(
    (s) => !SUGGESTIONS.some((x) => x.toLowerCase() === s.toLowerCase())
  )

  const enregistrer = async () => {
    setLoading(true)
    setErreur('')
    setMessage('')
    const res = await fetch('/api/pharmacie/services', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pharmacieId, services }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) {
      setErreur(typeof data.error === 'string' ? data.error : "Erreur lors de l'enregistrement")
      return
    }
    setMessage('Enregistré')
    router.refresh()
  }

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl p-4 mb-6">
      <h2 className="text-base font-semibold text-[var(--color-ink)] mb-1">
        Services proposés (sans rendez-vous)
      </h2>
      <p className="text-sm text-[var(--color-ink-soft)] mb-4">
        Cochez ce que votre pharmacie propose. Si un patient demande l'un de ces services,
        Léa répond qu'il peut passer directement. Pour tout service non coché, Léa ne
        répond pas « non » : elle transmet la question à l'équipe.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
        {SUGGESTIONS.map((nom) => (
          <label key={nom} className="flex items-center gap-2 text-sm text-[var(--color-ink)]">
            <input type="checkbox" checked={a(nom)} onChange={() => basculer(nom)} />
            {nom}
          </label>
        ))}
        {personnalises.map((nom) => (
          <label key={nom} className="flex items-center gap-2 text-sm text-[var(--color-ink)]">
            <input type="checkbox" checked onChange={() => basculer(nom)} />
            {nom}
          </label>
        ))}
      </div>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={autre}
          onChange={(e) => setAutre(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              ajouterAutre()
            }
          }}
          placeholder="Autre service (ex : location de tire-lait)"
          className="ui-input flex-1"
        />
        <button type="button" onClick={ajouterAutre} disabled={!autre.trim()} className="ui-btn-primary shrink-0">
          Ajouter
        </button>
      </div>

      {erreur && <p className="text-red-600 text-sm mb-3">{erreur}</p>}
      {message && <p className="text-sm text-green-700 mb-3">{message}</p>}

      <button type="button" onClick={enregistrer} disabled={loading} className="ui-btn-primary">
        {loading ? '…' : 'Enregistrer les services'}
      </button>
    </div>
  )
}
