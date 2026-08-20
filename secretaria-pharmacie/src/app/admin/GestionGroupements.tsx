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
    <div className="bg-white border rounded-lg p-4 mb-6">
      <h2 className="font-semibold mb-3">Groupements</h2>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Nom du nouveau groupement"
          value={nomNouveauGroupement}
          onChange={(e) => setNomNouveauGroupement(e.target.value)}
          className="flex-1 border rounded px-3 py-2"
        />
        <button
          onClick={creerGroupement}
          disabled={loading}
          className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
        >
          Créer
        </button>
      </div>

      <div className="space-y-1">
        {groupements.map((g) => (
          <div key={g.id} className="text-sm text-gray-700 py-1 border-b last:border-0">
            {g.nom}
          </div>
        ))}
        {groupements.length === 0 && (
          <p className="text-sm text-gray-500">Aucun groupement créé.</p>
        )}
      </div>
    </div>
  )
}
