'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export type MessageGarde = {
  id: string
  created_at: string
  priorite: 'P1' | 'P2' | 'P3' | 'U'
  appelant_type: string | null
  demandeur_nom: string | null
  patient_nom: string | null
  telephone: string | null
  age_patient: string | null
  ordonnance: string | null
  medicament: string | null
  categorie: string | null
  type_delivrance: string | null
  traitement_restant: string | null
  motif: string | null
  patient_a_risque: string | null
  delai_souhaite: string | null
  resume: string
  traite: boolean
}

const PRIORITES: Record<string, { label: string; couleur: string }> = {
  U: { label: 'U · Urgence médicale', couleur: '#7F1D1D' },
  P1: { label: 'P1 · Transmission immédiate', couleur: '#B33951' },
  P2: { label: 'P2 · Rappel prioritaire', couleur: '#B45309' },
  P3: { label: 'P3 · Message différé', couleur: '#6B7280' },
}

const ORDONNANCE_LIBELLE: Record<string, string> = {
  aujourdhui: "Ordonnance d'aujourd'hui",
  anterieure: 'Ordonnance antérieure',
  date_inconnue: "Ordonnance, date inconnue",
  illisible: 'Ordonnance illisible',
  absente: "Pas d'ordonnance",
}

const APPELANT_LIBELLE: Record<string, string> = {
  patient: 'Patient',
  proche: 'Proche du patient',
  professionnel_sante: 'Professionnel de santé',
  structure_soins: 'Structure de soins / autre pharmacie',
}

const ORDRE: Record<string, number> = { U: 0, P1: 1, P2: 2, P3: 3 }

export default function MessagesGardeList({ messages }: { messages: MessageGarde[] }) {
  const [enCours, setEnCours] = useState<string | null>(null)
  const [erreur, setErreur] = useState('')
  const [masquerTraites, setMasquerTraites] = useState(true)
  const [filtre, setFiltre] = useState<string>('tous')
  const router = useRouter()

  const basculer = async (m: MessageGarde) => {
    setEnCours(m.id)
    setErreur('')
    const res = await fetch('/api/pharmacie/garde-messages', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: m.id, traite: !m.traite }),
    })
    setEnCours(null)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setErreur(typeof data.error === 'string' ? data.error : 'Erreur')
      return
    }
    router.refresh()
  }

  const visibles = messages
    .filter((m) => !(masquerTraites && m.traite))
    .filter((m) => filtre === 'tous' || m.priorite === filtre)
    .sort(
      (a, b) =>
        (ORDRE[a.priorite] ?? 9) - (ORDRE[b.priorite] ?? 9) ||
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={masquerTraites}
            onChange={(e) => setMasquerTraites(e.target.checked)}
          />
          Masquer les appels traités
        </label>
        <select
          value={filtre}
          onChange={(e) => setFiltre(e.target.value)}
          className="ui-input !w-auto !py-1.5 !px-2 text-sm"
          aria-label="Filtrer par priorité"
        >
          <option value="tous">Toutes les priorités</option>
          <option value="U">U</option>
          <option value="P1">P1</option>
          <option value="P2">P2</option>
          <option value="P3">P3</option>
        </select>
      </div>
      {erreur && <p className="text-red-600 text-sm mb-3">{erreur}</p>}
      {visibles.length === 0 && (
        <p className="text-sm text-[var(--color-ink-soft)]">Aucun appel à afficher.</p>
      )}
      <div className="space-y-3">
        {visibles.map((m) => {
          const prio = PRIORITES[m.priorite] ?? PRIORITES.P3
          const details = [
            m.appelant_type ? APPELANT_LIBELLE[m.appelant_type] : null,
            m.demandeur_nom ? `Demandeur : ${m.demandeur_nom}` : null,
            m.age_patient ? `Âge : ${m.age_patient}` : null,
            m.ordonnance ? ORDONNANCE_LIBELLE[m.ordonnance] : null,
            m.medicament ? `Médicament : ${m.medicament}` : null,
            m.categorie ? `Catégorie : ${m.categorie}` : null,
            m.type_delivrance
              ? m.type_delivrance === 'premiere'
                ? 'Première délivrance'
                : 'Renouvellement'
              : null,
            m.traitement_restant ? `Traitement restant : ${m.traitement_restant}` : null,
            m.motif ? `Motif : ${m.motif}` : null,
            m.patient_a_risque ? `Patient à risque : ${m.patient_a_risque}` : null,
            m.delai_souhaite ? `Délai souhaité : ${m.delai_souhaite}` : null,
          ].filter(Boolean)
          return (
            <div
              key={m.id}
              className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl p-4"
              style={{ borderLeft: `4px solid ${prio.couleur}` }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="text-sm">
                  <span className="font-medium">{m.patient_nom || 'Patient non nommé'}</span>
                  {m.telephone && (
                    <a href={`tel:${m.telephone}`} className="ml-2 underline text-[var(--color-ink-soft)]">
                      {m.telephone}
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span
                    className="rounded-full px-2 py-0.5 border font-medium"
                    style={{ borderColor: prio.couleur, color: prio.couleur }}
                  >
                    {prio.label}
                  </span>
                  <span className="text-[var(--color-ink-soft)]">
                    {format(new Date(m.created_at), "EEEE d MMMM 'à' HH:mm", { locale: fr })}
                  </span>
                </div>
              </div>
              <p className="text-sm text-[var(--color-ink)] mb-2">{m.resume}</p>
              {details.length > 0 && (
                <p className="text-xs text-[var(--color-ink-soft)] mb-3">{details.join(' · ')}</p>
              )}
              <button
                type="button"
                disabled={enCours === m.id}
                onClick={() => void basculer(m)}
                className="text-xs underline text-[var(--color-ink-soft)]"
              >
                {m.traite ? 'Remettre à traiter' : 'Marquer comme traité'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
