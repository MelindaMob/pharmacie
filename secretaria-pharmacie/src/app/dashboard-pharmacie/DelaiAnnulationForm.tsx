'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function DelaiAnnulationForm({
  pharmacieId,
  delaiInitial,
}: {
  pharmacieId: string
  delaiInitial: number
}) {
  const [delai, setDelai] = useState(delaiInitial)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const enregistrer = async () => {
    setSaving(true)
    setMessage('')
    const supabase = createClient()

    const { error } = await supabase
      .from('pharmacies')
      .update({ delai_annulation_heures: delai })
      .eq('id', pharmacieId)

    setSaving(false)
    setMessage(error ? 'Erreur' : 'Enregistré ✓')
  }

  return (
    <div className="bg-white rounded-lg border p-4 mb-6">
      <h2 className="font-semibold mb-2">Délai d&apos;annulation minimum</h2>
      <p className="text-sm text-gray-500 mb-3">
        Nombre d&apos;heures avant le rendez-vous en dessous duquel le client ne peut plus
        annuler en ligne.
      </p>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          value={delai}
          onChange={(e) => setDelai(parseInt(e.target.value) || 0)}
          className="w-20 border rounded px-2 py-1"
        />
        <span className="text-sm">heures</span>
        <button
          onClick={enregistrer}
          disabled={saving}
          className="ml-3 bg-black text-white px-3 py-1.5 rounded text-sm disabled:opacity-50"
        >
          {saving ? '...' : 'Enregistrer'}
        </button>
      </div>
      {message && <p className="text-sm text-green-700 mt-2">{message}</p>}
    </div>
  )
}
