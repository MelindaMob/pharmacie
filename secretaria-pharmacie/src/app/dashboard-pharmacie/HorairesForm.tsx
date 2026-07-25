'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const JOURS = [
  { key: 'lundi', label: 'Lundi' },
  { key: 'mardi', label: 'Mardi' },
  { key: 'mercredi', label: 'Mercredi' },
  { key: 'jeudi', label: 'Jeudi' },
  { key: 'vendredi', label: 'Vendredi' },
  { key: 'samedi', label: 'Samedi' },
  { key: 'dimanche', label: 'Dimanche' },
]

type Horaires = Record<string, { debut: string; fin: string } | null>

export default function HorairesForm({
  pharmacieId,
  horairesInitiaux,
}: {
  pharmacieId: string
  horairesInitiaux: Horaires
}) {
  const [horaires, setHoraires] = useState<Horaires>(horairesInitiaux ?? {})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const toggleJour = (jour: string) => {
    setHoraires((prev) => ({
      ...prev,
      [jour]: prev[jour] ? null : { debut: '09:00', fin: '19:00' },
    }))
  }

  const updateHoraire = (jour: string, champ: 'debut' | 'fin', valeur: string) => {
    setHoraires((prev) => ({
      ...prev,
      [jour]: { ...(prev[jour] as { debut: string; fin: string }), [champ]: valeur },
    }))
  }

  const enregistrer = async () => {
    setSaving(true)
    setMessage('')
    const supabase = createClient()

    const { error } = await supabase
      .from('pharmacies')
      .update({ horaires_ouverture: horaires })
      .eq('id', pharmacieId)

    setSaving(false)
    setMessage(error ? "Erreur lors de l'enregistrement" : 'Horaires enregistrés ✓')
  }

  return (
    <div className="bg-white rounded-lg border p-4 mb-6">
      <h2 className="font-semibold mb-3">Horaires d&apos;ouverture</h2>
      <div className="space-y-2">
        {JOURS.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-3">
            <label className="flex items-center gap-2 w-32">
              <input
                type="checkbox"
                checked={!!horaires[key]}
                onChange={() => toggleJour(key)}
              />
              {label}
            </label>
            {horaires[key] && (
              <>
                <input
                  type="time"
                  value={horaires[key]!.debut}
                  onChange={(e) => updateHoraire(key, 'debut', e.target.value)}
                  className="border rounded px-2 py-1"
                />
                <span>à</span>
                <input
                  type="time"
                  value={horaires[key]!.fin}
                  onChange={(e) => updateHoraire(key, 'fin', e.target.value)}
                  className="border rounded px-2 py-1"
                />
              </>
            )}
          </div>
        ))}
      </div>
      <button
        onClick={enregistrer}
        disabled={saving}
        className="mt-4 bg-black text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {saving ? 'Enregistrement...' : 'Enregistrer les horaires'}
      </button>
      {message && <p className="mt-2 text-sm">{message}</p>}
    </div>
  )
}
