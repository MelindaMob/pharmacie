'use client'

import { useEffect, useMemo, useState, type MutableRefObject } from 'react'
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

function normaliserHoraires(h: Horaires): Horaires {
  const out: Horaires = {}
  for (const { key } of JOURS) {
    const v = h[key]
    out[key] = v ? { debut: v.debut, fin: v.fin } : null
  }
  return out
}

function horairesEgaux(a: Horaires, b: Horaires) {
  return JSON.stringify(normaliserHoraires(a)) === JSON.stringify(normaliserHoraires(b))
}

async function regenererCreneaux(pharmacieId: string) {
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
        : data.error?.message ?? 'Erreur lors de la génération des créneaux'
    throw new Error(err)
  }
  return data.count as number
}

export default function HorairesForm({
  pharmacieId,
  horairesInitiaux,
  onDirtyChange,
  enregistrerRef,
}: {
  pharmacieId: string
  horairesInitiaux: Horaires
  onDirtyChange?: (dirty: boolean) => void
  enregistrerRef?: MutableRefObject<(() => Promise<void>) | null>
}) {
  const [horaires, setHoraires] = useState<Horaires>(() =>
    normaliserHoraires(horairesInitiaux ?? {})
  )
  const [sauvegardes, setSauvegardes] = useState<Horaires>(() =>
    normaliserHoraires(horairesInitiaux ?? {})
  )
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const dirty = useMemo(() => !horairesEgaux(horaires, sauvegardes), [horaires, sauvegardes])

  useEffect(() => {
    onDirtyChange?.(dirty)
  }, [dirty, onDirtyChange])

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
    if (!dirty || saving) return
    setSaving(true)
    setMessage('')
    const supabase = createClient()

    const { error } = await supabase
      .from('pharmacies')
      .update({ horaires_ouverture: horaires })
      .eq('id', pharmacieId)

    if (error) {
      setSaving(false)
      setMessage("Erreur lors de l'enregistrement des horaires")
      throw new Error("Erreur lors de l'enregistrement des horaires")
    }

    try {
      const count = await regenererCreneaux(pharmacieId)
      setSauvegardes(normaliserHoraires(horaires))
      setMessage(`Horaires enregistrés et ${count} créneaux régénérés ✓`)
    } catch (e) {
      const msg =
        e instanceof Error
          ? `Horaires enregistrés, mais créneaux : ${e.message}`
          : 'Horaires enregistrés, erreur lors de la génération des créneaux'
      setMessage(msg)
      setSaving(false)
      throw e instanceof Error ? e : new Error(msg)
    }

    setSaving(false)
  }

  useEffect(() => {
    if (!enregistrerRef) return
    enregistrerRef.current = enregistrer
    return () => {
      enregistrerRef.current = null
    }
  })

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
        onClick={() => void enregistrer()}
        disabled={saving || !dirty}
        className="ui-btn-primary mt-4 w-full sm:w-auto disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {saving ? 'Enregistrement...' : 'Enregistrer les horaires'}
      </button>
      {!dirty && !message && (
        <p className="mt-2 text-xs text-[var(--color-ink-soft)]">
          Modifiez un horaire pour activer l&apos;enregistrement et la génération des créneaux.
        </p>
      )}
      {message && <p className="mt-2 text-sm text-[var(--color-ink-soft)]">{message}</p>}
    </div>
  )
}
