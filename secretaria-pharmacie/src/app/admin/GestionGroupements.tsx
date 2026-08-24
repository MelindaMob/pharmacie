'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Groupement = { id: string; nom: string }

export default function GestionGroupements({ groupements }: { groupements: Groupement[] }) {
  const [nomNouveauGroupement, setNomNouveauGroupement] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const creerGroupement = async () => {
    if (!nomNouveauGroupement.trim()) return

    setLoading(true)
    const supabase = createClient()
    await supabase.from('groupements').insert({ nom: nomNouveauGroupement.trim() })
    setLoading(false)
    setNomNouveauGroupement('')
    router.refresh()
  }

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-lg p-4 mb-6">
      <h2 className="font-semibold text-[var(--color-ink)] mb-3">Groupements</h2>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Nom du nouveau groupement"
          value={nomNouveauGroupement}
          onChange={(e) => setNomNouveauGroupement(e.target.value)}
          className="flex-1 border border-[var(--color-line)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
        />
        <button
          type="button"
          onClick={creerGroupement}
          disabled={loading}
          className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50 transition-colors"
        >
          Créer
        </button>
      </div>

      <div className="space-y-1">
        {groupements.map((g) => (
          <div
            key={g.id}
            className="text-sm text-[var(--color-ink)] py-1 border-b border-[var(--color-line)] last:border-0"
          >
            {g.nom}
          </div>
        ))}
        {groupements.length === 0 && (
          <p className="text-sm text-[var(--color-ink-soft)]">Aucun groupement créé.</p>
        )}
      </div>
    </div>
  )
}
