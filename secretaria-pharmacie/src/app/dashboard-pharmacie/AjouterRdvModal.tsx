'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

type TypeRdv = { id: string; nom: string; duree_minutes: number }
type Creneau = { id: string; debut: string }

export default function AjouterRdvModal({
  pharmacieId,
  preselection,
  onClose,
  onCree,
}: {
  pharmacieId: string
  preselection?: {
    creneauId: string
    typeNom: string
    dateHeure: string
    options?: { creneauId: string; typeNom: string }[]
  }
  onClose: () => void
  onCree: () => void
}) {
  const [typesRdv, setTypesRdv] = useState<TypeRdv[]>([])
  const [typeSelectionne, setTypeSelectionne] = useState('')
  const [creneauxDispo, setCreneauxDispo] = useState<Creneau[]>([])
  const [creneauSelectionne, setCreneauSelectionne] = useState<Creneau | null>(
    preselection ? { id: preselection.creneauId, debut: preselection.dateHeure } : null
  )
  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [telephone, setTelephone] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    if (preselection) return
    const charger = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('types_rdv')
        .select('id, nom, duree_minutes')
        .eq('pharmacie_id', pharmacieId)
      setTypesRdv(data ?? [])
      if (data && data.length > 0) setTypeSelectionne(data[0].id)
    }
    charger()
  }, [pharmacieId, preselection])

  useEffect(() => {
    if (preselection || !typeSelectionne) return
    const chargerCreneaux = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('creneaux')
        .select('id, debut')
        .eq('pharmacie_id', pharmacieId)
        .eq('type_rdv_id', typeSelectionne)
        .eq('statut', 'disponible')
        .gt('debut', new Date().toISOString())
        .order('debut', { ascending: true })
        .limit(30)
      setCreneauxDispo(data ?? [])
      setCreneauSelectionne(null)
    }
    chargerCreneaux()
  }, [typeSelectionne, pharmacieId, preselection])

  const creer = async () => {
    if (!creneauSelectionne || !prenom.trim() || !nom.trim() || !telephone) {
      setErreur('Renseignez un prénom, un nom et un téléphone')
      return
    }
    setLoading(true)
    setErreur('')

    const res = await fetch('/api/pharmacie/creer-rdv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creneauId: creneauSelectionne.id,
        prenom: prenom.trim(),
        nom: nom.trim(),
        telephone,
        email,
      }),
    })
    const data = await res.json()
    setLoading(false)

    if (data.error) {
      setErreur(data.error)
      return
    }
    onCree()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--color-surface)] rounded-xl p-6 max-w-md w-full max-h-[85vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-[family-name:var(--font-display)] text-lg text-[var(--color-ink)]">
            {preselection ? 'Réserver ce créneau' : 'Ajouter un rendez-vous'}
          </h2>
          <button type="button" onClick={onClose} className="text-[var(--color-ink-soft)]">
            ✕
          </button>
        </div>

        {preselection ? (
          <div className="mb-4">
            <div className="bg-[var(--color-bg)] rounded-lg p-3 mb-3 text-sm font-[family-name:var(--font-mono)]">
              {preselection.dateHeure}
            </div>
            {preselection.options && preselection.options.length > 1 ? (
              <div className="flex flex-wrap gap-2">
                {preselection.options.map((o) => (
                  <button
                    key={o.creneauId}
                    type="button"
                    onClick={() =>
                      setCreneauSelectionne({ id: o.creneauId, debut: preselection.dateHeure })
                    }
                    className={`text-xs px-2.5 py-1.5 rounded-md border ${
                      creneauSelectionne?.id === o.creneauId
                        ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white'
                        : 'border-[var(--color-line)] hover:border-[var(--color-primary)]'
                    }`}
                  >
                    {o.typeNom}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--color-ink)]">{preselection.typeNom}</p>
            )}
          </div>
        ) : (
          <>
            <div className="mb-4">
              <label className="block text-xs uppercase tracking-wide text-[var(--color-ink-soft)] mb-1.5">
                Motif
              </label>
              <select
                value={typeSelectionne}
                onChange={(e) => setTypeSelectionne(e.target.value)}
                className="w-full border border-[var(--color-line)] rounded-lg px-3 py-2 text-sm"
              >
                {typesRdv.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nom} ({t.duree_minutes} min)
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-xs uppercase tracking-wide text-[var(--color-ink-soft)] mb-1.5">
                Créneau
              </label>
              {creneauxDispo.length === 0 ? (
                <p className="text-sm text-[var(--color-ink-soft)]">
                  Aucun créneau disponible pour ce motif.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                  {creneauxDispo.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCreneauSelectionne(c)}
                      className={`font-[family-name:var(--font-mono)] text-xs px-2.5 py-1.5 rounded-md border transition-colors ${
                        creneauSelectionne?.id === c.id
                          ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white'
                          : 'border-[var(--color-line)] hover:border-[var(--color-primary)]'
                      }`}
                    >
                      {format(new Date(c.debut), 'd MMM HH:mm', { locale: fr })}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {creneauSelectionne && (
          <div className="space-y-3 pt-3 border-t border-dashed border-[var(--color-line)]">
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Prénom"
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                className="w-full border border-[var(--color-line)] rounded-lg px-3 py-2 text-sm"
                autoComplete="given-name"
              />
              <input
                type="text"
                placeholder="Nom de famille"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                className="w-full border border-[var(--color-line)] rounded-lg px-3 py-2 text-sm"
                autoComplete="family-name"
              />
            </div>
            <input
              type="tel"
              placeholder="Téléphone"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              className="w-full border border-[var(--color-line)] rounded-lg px-3 py-2 text-sm"
            />
            <p className="text-xs text-[var(--color-ink-soft)] -mt-1">
              Un SMS de confirmation avec le lien de gestion sera envoyé à ce numéro.
            </p>
            <input
              type="email"
              placeholder="Email (optionnel)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-[var(--color-line)] rounded-lg px-3 py-2 text-sm"
            />

            {erreur && <p className="text-red-600 text-sm">{erreur}</p>}

            <button
              type="button"
              onClick={creer}
              disabled={loading}
              className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {loading ? 'Création...' : 'Créer le rendez-vous'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
