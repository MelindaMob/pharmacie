'use client'

import { useState } from 'react'

export default function GenererCreneauxButton({ pharmacieId }: { pharmacieId: string }) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const generer = async () => {
    setLoading(true)
    setMessage('')

    const res = await fetch('/api/generer-creneaux', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pharmacieId }),
    })
    const data = await res.json()

    setLoading(false)
    setMessage(
      data.success
        ? `${data.count} créneaux générés ✓`
        : `Erreur : ${data.error ?? 'inconnue'}`
    )
  }

  return (
    <div className="ui-panel p-4 sm:p-5 mb-6">
      <button
        type="button"
        onClick={generer}
        disabled={loading}
        className="ui-btn-primary w-full sm:w-auto bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90"
      >
        {loading ? 'Génération...' : 'Générer mes créneaux (4 prochaines semaines)'}
      </button>
      {message && <p className="mt-2 text-sm text-[var(--color-ink)]">{message}</p>}
      <p className="text-xs text-[var(--color-ink-soft)] mt-2 leading-relaxed">
        Remplace les anciens créneaux disponibles sur 4 semaines. Les rendez-vous déjà pris sont
        conservés. À relancer après chaque modification des horaires.
      </p>
    </div>
  )
}
