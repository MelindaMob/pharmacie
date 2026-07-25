'use client'

import { useState } from 'react'
import AdresseAutocomplete from '@/components/AdresseAutocomplete'
import { createClient } from '@/lib/supabase/client'

type Suggestion = {
  label: string
  lat: number
  lng: number
}

export default function AdresseForm({
  pharmacieId,
  adresseInitiale,
}: {
  pharmacieId: string
  adresseInitiale?: string
}) {
  const [selection, setSelection] = useState<Suggestion | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const enregistrer = async () => {
    if (!selection) {
      setMessage('Choisissez une adresse dans la liste de suggestions')
      return
    }

    setSaving(true)
    setMessage('')
    const supabase = createClient()

    const { error: updateError } = await supabase
      .from('pharmacies')
      .update({ adresse: selection.label })
      .eq('id', pharmacieId)

    const { error: rpcError } = await supabase.rpc('update_pharmacie_location', {
      p_pharmacie_id: pharmacieId,
      p_lat: selection.lat,
      p_lng: selection.lng,
    })

    setSaving(false)
    setMessage(
      updateError || rpcError
        ? `Erreur : ${updateError?.message ?? rpcError?.message}`
        : 'Adresse enregistrée ✓'
    )
  }

  return (
    <div className="bg-white rounded-lg border p-4 mb-6">
      <h2 className="font-semibold mb-3">Adresse de la pharmacie</h2>
      <AdresseAutocomplete valeurInitiale={adresseInitiale} onSelect={setSelection} />
      <button
        onClick={enregistrer}
        disabled={saving}
        className="mt-4 bg-black text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {saving ? 'Enregistrement...' : "Enregistrer l'adresse"}
      </button>
      {message && <p className="mt-2 text-sm">{message}</p>}
    </div>
  )
}
