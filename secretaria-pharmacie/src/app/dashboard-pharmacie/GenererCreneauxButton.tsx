'use client'

import { useEffect, useState } from 'react'

export default function GenererCreneauxButton({
  pharmacieId,
  disabled = false,
  /** Si fourni (ex. horaires modifiés non sauvés), enregistre puis génère. */
  onAvantGenerer,
}: {
  pharmacieId: string
  disabled?: boolean
  onAvantGenerer?: () => Promise<void>
}) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    setMessage('')
  }, [pharmacieId, disabled])

  const inactif = disabled || loading

  const generer = async () => {
    if (inactif) return
    setLoading(true)
    setMessage('')

    try {
      if (onAvantGenerer) {
        await onAvantGenerer()
        setMessage('Horaires enregistrés et créneaux régénérés ✓')
        setLoading(false)
        return
      }

      const res = await fetch('/api/generer-creneaux', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pharmacieId }),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        const err =
          typeof data.error === 'string'
            ? data.error
            : data.error?.message ?? 'Erreur inconnue'
        setMessage(`Erreur : ${err}`)
      } else {
        setMessage(`${data.count} créneaux générés ✓`)
      }
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : 'Erreur réseau lors de la génération'
      )
    }

    setLoading(false)
  }

  return (
    <div className="ui-panel p-4 sm:p-5 mb-6">
      <button
        type="button"
        onClick={generer}
        disabled={inactif}
        className="ui-btn-primary w-full sm:w-auto bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[var(--color-accent)]"
      >
        {loading ? 'Génération...' : 'Générer mes créneaux (4 prochaines semaines)'}
      </button>
      {message && <p className="mt-2 text-sm text-[var(--color-ink)] break-words">{message}</p>}
      <p className="text-xs text-[var(--color-ink-soft)] mt-2 leading-relaxed">
        Remplace les anciens créneaux disponibles sur 4 semaines. Les rendez-vous déjà pris sont
        conservés. Bouton actif uniquement après une modification des horaires (comme
        « Enregistrer les horaires », qui régénère aussi automatiquement).
      </p>
    </div>
  )
}
