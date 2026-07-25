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
    <div className="mb-6">
      <button
        onClick={generer}
        disabled={loading}
        className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {loading ? 'Génération...' : 'Générer mes créneaux (4 prochaines semaines)'}
      </button>
      {message && <p className="mt-2 text-sm">{message}</p>}
      <p className="text-xs text-gray-500 mt-1">
        À relancer après chaque modification des horaires, ou une fois par semaine pour garder des
        créneaux à venir.
      </p>
    </div>
  )
}
