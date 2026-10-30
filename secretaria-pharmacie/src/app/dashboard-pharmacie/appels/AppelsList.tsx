'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export type MessageAppel = {
  id: string
  created_at: string
  categorie: 'demarchage' | 'professionnel_sante' | 'patient' | 'fournisseur' | 'autre'
  demandeur_nom: string | null
  organisme: string | null
  telephone: string | null
  resume: string
  traite: boolean
}

const CATEGORIES: Record<string, { label: string; couleur: string }> = {
  professionnel_sante: { label: 'Professionnel de santé', couleur: '#B33951' },
  patient: { label: 'Patient', couleur: '#B45309' },
  fournisseur: { label: 'Fournisseur', couleur: '#2563EB' },
  autre: { label: 'Autre', couleur: '#6B7280' },
  demarchage: { label: 'Démarchage', couleur: '#9CA3AF' },
}

export default function AppelsList({ messages }: { messages: MessageAppel[] }) {
  const [enCours, setEnCours] = useState<string | null>(null)
  const [erreur, setErreur] = useState('')
  const [masquerTraites, setMasquerTraites] = useState(true)
  const [filtre, setFiltre] = useState<string>('tous')
  const [tri, setTri] = useState<'recent' | 'ancien' | 'categorie'>('recent')
  const router = useRouter()

  const basculer = async (m: MessageAppel) => {
    setEnCours(m.id)
    setErreur('')
    const res = await fetch('/api/pharmacie/appels', {
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

  const ordreCategories = Object.keys(CATEGORIES)
  const compte = (cle: string) =>
    messages.filter((m) => !(masquerTraites && m.traite) && (cle === 'tous' || m.categorie === cle)).length

  const visibles = messages
    .filter((m) => !(masquerTraites && m.traite))
    .filter((m) => filtre === 'tous' || m.categorie === filtre)
    .sort((a, b) => {
      const ta = new Date(a.created_at).getTime()
      const tb = new Date(b.created_at).getTime()
      if (tri === 'ancien') return ta - tb
      if (tri === 'categorie') {
        return ordreCategories.indexOf(a.categorie) - ordreCategories.indexOf(b.categorie) || tb - ta
      }
      return tb - ta
    })

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-3">
        {['tous', ...ordreCategories].map((cle) => (
          <button
            key={cle}
            type="button"
            onClick={() => setFiltre(cle)}
            className={`text-xs rounded-full px-3 py-1 border ${
              filtre === cle ? 'font-semibold bg-[var(--color-surface)]' : 'text-[var(--color-ink-soft)]'
            }`}
          >
            {cle === 'tous' ? 'Tous' : CATEGORIES[cle].label} ({compte(cle)})
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={masquerTraites}
            onChange={(e) => setMasquerTraites(e.target.checked)}
          />
          Masquer les messages traités
        </label>
        <select
          value={tri}
          onChange={(e) => setTri(e.target.value as 'recent' | 'ancien' | 'categorie')}
          className="ui-input !w-auto !py-1.5 !px-2 text-sm"
          aria-label="Trier les messages"
        >
          <option value="recent">Plus récents d&apos;abord</option>
          <option value="ancien">Plus anciens d&apos;abord</option>
          <option value="categorie">Par catégorie</option>
        </select>
      </div>
      {erreur && <p className="text-red-600 text-sm mb-3">{erreur}</p>}
      {visibles.length === 0 && (
        <p className="text-sm text-[var(--color-ink-soft)]">Aucun message à afficher.</p>
      )}
      <div className="space-y-3">
        {visibles.map((m) => {
          const cat = CATEGORIES[m.categorie] ?? CATEGORIES.autre
          const qui = [m.demandeur_nom, m.organisme].filter(Boolean).join(' · ')
          return (
            <div
              key={m.id}
              className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl p-4"
              style={{ borderLeft: `4px solid ${cat.couleur}` }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="text-sm">
                  <span className="font-medium">{qui || 'Appelant'}</span>
                  {m.telephone && (
                    <a href={`tel:${m.telephone}`} className="ml-2 underline text-[var(--color-ink-soft)]">
                      {m.telephone}
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span
                    className="rounded-full px-2 py-0.5 border font-medium"
                    style={{ borderColor: cat.couleur, color: cat.couleur }}
                  >
                    {cat.label}
                  </span>
                  <span className="text-[var(--color-ink-soft)]">
                    {format(new Date(m.created_at), "EEEE d MMMM 'à' HH:mm", { locale: fr })}
                  </span>
                </div>
              </div>
              <p className="text-sm text-[var(--color-ink)] mb-3">{m.resume}</p>
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
