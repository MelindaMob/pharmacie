'use client'

import { useEffect, useMemo, useState, type MutableRefObject } from 'react'
import { createClient } from '@/lib/supabase/client'
import { regenererCreneauxClient } from '@/lib/creneaux/regenererCreneauxClient'

const JOURS = [
  { key: 'lundi', label: 'Lundi' },
  { key: 'mardi', label: 'Mardi' },
  { key: 'mercredi', label: 'Mercredi' },
  { key: 'jeudi', label: 'Jeudi' },
  { key: 'vendredi', label: 'Vendredi' },
  { key: 'samedi', label: 'Samedi' },
  { key: 'dimanche', label: 'Dimanche' },
]

const MAX_PLAGES = 2

type Plage = { debut: string; fin: string }
type Horaires = Record<string, Plage[] | null>
/** Ancien format (un objet par jour) encore présent en base, ou nouveau (tableau). */
type HorairesInitiaux = Record<string, Plage[] | Plage | null | undefined>

const PLAGE_MATIN: Plage = { debut: '09:00', fin: '12:30' }
const PLAGE_APRES_MIDI: Plage = { debut: '14:00', fin: '19:00' }
const PLAGE_JOURNEE: Plage = { debut: '09:00', fin: '19:00' }

function versPlages(v: unknown): Plage[] | null {
  if (!v) return null
  if (Array.isArray(v) && v.length > 0) {
    return v.slice(0, MAX_PLAGES).map((p) => ({ debut: p.debut, fin: p.fin }))
  }
  if (typeof v === 'object' && v !== null && 'debut' in v && 'fin' in v) {
    const p = v as Plage
    return [{ debut: p.debut, fin: p.fin }]
  }
  return null
}

function normaliserHoraires(h: HorairesInitiaux): Horaires {
  const out: Horaires = {}
  for (const { key } of JOURS) {
    out[key] = versPlages(h[key])
  }
  return out
}

function horairesEgaux(a: Horaires, b: Horaires) {
  return JSON.stringify(normaliserHoraires(a)) === JSON.stringify(normaliserHoraires(b))
}

export default function HorairesForm({
  pharmacieId,
  horairesInitiaux,
  onDirtyChange,
  enregistrerRef,
}: {
  pharmacieId: string
  horairesInitiaux: HorairesInitiaux
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
      [jour]: prev[jour] ? null : [PLAGE_JOURNEE],
    }))
  }

  const ajouterPlage = (jour: string) => {
    setHoraires((prev) => {
      const plages = prev[jour] ?? []
      if (plages.length >= MAX_PLAGES) return prev
      // Suggestion matin/après-midi par défaut pour la 2e plage.
      const suggestion = plages.length === 1 && plages[0].fin <= '13:00' ? PLAGE_APRES_MIDI : PLAGE_MATIN
      return { ...prev, [jour]: [...plages, suggestion] }
    })
  }

  const retirerPlage = (jour: string, index: number) => {
    setHoraires((prev) => {
      const plages = (prev[jour] ?? []).filter((_, i) => i !== index)
      return { ...prev, [jour]: plages.length > 0 ? plages : null }
    })
  }

  const updatePlage = (jour: string, index: number, champ: 'debut' | 'fin', valeur: string) => {
    setHoraires((prev) => {
      const plages = [...(prev[jour] ?? [])]
      plages[index] = { ...plages[index], [champ]: valeur }
      return { ...prev, [jour]: plages }
    })
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
      const count = await regenererCreneauxClient(pharmacieId)
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
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-medium text-[var(--color-ink)]">Horaires d&apos;ouverture</h2>
        <a
          href="/dashboard-pharmacie/aide#horaires"
          className="text-xs underline text-[var(--color-ink-soft)]"
        >
          Aide
        </a>
      </div>
      <div className="space-y-3">
        {JOURS.map(({ key, label }) => {
          const plages = horaires[key]
          const ouvert = !!plages
          return (
            <div
              key={key}
              className="flex flex-col gap-2 py-2 border-b border-[var(--color-line)] last:border-0"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <label className="flex items-center gap-2 sm:w-32 shrink-0 text-sm">
                  <input
                    type="checkbox"
                    checked={ouvert}
                    onChange={() => toggleJour(key)}
                    className="rounded border-[var(--color-line)]"
                  />
                  {label}
                </label>

                {!ouvert && (
                  <span className="inline-flex items-center gap-1 pl-6 sm:pl-0 text-xs font-medium text-[var(--color-ink-soft)] bg-[var(--color-line)]/40 px-2 py-0.5 rounded">
                    Fermé
                  </span>
                )}

                {ouvert && (
                  <div className="flex flex-col gap-2 pl-6 sm:pl-0">
                    {plages!.map((plage, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="time"
                          value={plage.debut}
                          onChange={(e) => updatePlage(key, index, 'debut', e.target.value)}
                          className="ui-input !w-auto"
                        />
                        <span className="text-[var(--color-ink-soft)] text-sm">à</span>
                        <input
                          type="time"
                          value={plage.fin}
                          onChange={(e) => updatePlage(key, index, 'fin', e.target.value)}
                          className="ui-input !w-auto"
                        />
                        {plages!.length > 1 && (
                          <button
                            type="button"
                            onClick={() => retirerPlage(key, index)}
                            className="text-red-600 text-xs underline shrink-0"
                          >
                            Retirer
                          </button>
                        )}
                      </div>
                    ))}
                    {plages!.length < MAX_PLAGES && (
                      <button
                        type="button"
                        onClick={() => ajouterPlage(key)}
                        className="text-xs underline text-[var(--color-ink-soft)] w-fit"
                      >
                        + Ajouter une plage (ex : matin / après-midi)
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
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
