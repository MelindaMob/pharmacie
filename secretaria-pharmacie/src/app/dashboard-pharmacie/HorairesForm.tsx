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
    <div className="ui-panel p-4 sm:p-5 mb-6">
      <h2 className="font-medium text-[var(--color-ink)] mb-4">Horaires d&apos;ouverture</h2>
      <div className="space-y-3">
        {JOURS.map(({ key, label }) => (
          <div
            key={key}
            className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 py-2 border-b border-[var(--color-line)] last:border-0"
          >
            <label className="flex items-center gap-2 sm:w-32 shrink-0 text-sm">
              <input
                type="checkbox"
                checked={!!horaires[key]}
                onChange={() => toggleJour(key)}
                className="rounded border-[var(--color-line)]"
              />
              {label}
            </label>
            {horaires[key] && (
              <div className="flex items-center gap-2 pl-6 sm:pl-0">
                <input
                  type="time"
                  value={horaires[key]!.debut}
                  onChange={(e) => updateHoraire(key, 'debut', e.target.value)}
                  className="ui-input !w-auto"
                />
                <span className="text-[var(--color-ink-soft)] text-sm">à</span>
                <input
                  type="time"
                  value={horaires[key]!.fin}
                  onChange={(e) => updateHoraire(key, 'fin', e.target.value)}
                  className="ui-input !w-auto"
                />
              </div>
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={enregistrer}
        disabled={saving}
        className="ui-btn-primary mt-4 w-full sm:w-auto"
      >
        {saving ? 'Enregistrement...' : 'Enregistrer les horaires'}
      </button>
      {message && <p className="mt-2 text-sm text-[var(--color-ink-soft)]">{message}</p>}
    </div>
  )
}
