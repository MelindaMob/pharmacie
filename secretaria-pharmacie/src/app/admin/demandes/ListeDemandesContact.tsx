'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

type Demande = {
  id: string
  nom_pharmacie: string
  email: string
  telephone: string | null
  message: string | null
  est_independante: boolean | null
  nom_groupement: string | null
  statut: string
  created_at: string
}

const STATUTS = ['nouveau', 'contacte', 'converti', 'sans_suite'] as const

const LABELS_STATUT: Record<(typeof STATUTS)[number], string> = {
  nouveau: 'Nouveau',
  contacte: 'Contacté',
  converti: 'Converti',
  sans_suite: 'Sans suite',
}

export default function ListeDemandesContact({ demandes }: { demandes: Demande[] }) {
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const router = useRouter()

  const changerStatut = async (id: string, statut: string) => {
    setLoadingId(id)
    const supabase = createClient()
    await supabase.from('demandes_contact').update({ statut }).eq('id', id)
    setLoadingId(null)
    router.refresh()
  }

  const badgeStatut = (statut: string) => {
    const styles: Record<string, string> = {
      nouveau: 'bg-blue-100 text-blue-800',
      contacte: 'bg-amber-100 text-amber-800',
      converti: 'bg-green-100 text-green-800',
      sans_suite: 'bg-[var(--color-line)] text-[var(--color-ink-soft)]',
    }
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full ${styles[statut] ?? ''}`}>
        {LABELS_STATUT[statut as (typeof STATUTS)[number]] ?? statut}
      </span>
    )
  }

  if (demandes.length === 0) {
    return <p className="text-[var(--color-ink-soft)]">Aucune demande pour le moment.</p>
  }

  return (
    <div className="space-y-3">
      {demandes.map((d) => (
        <div key={d.id} className="ui-panel p-4">
          <div className="flex justify-between items-start gap-3 mb-2">
            <div>
              <p className="font-semibold text-[var(--color-ink)]">{d.nom_pharmacie}</p>
              <p className="text-sm text-[var(--color-ink-soft)]">
                {format(new Date(d.created_at), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
              </p>
            </div>
            {badgeStatut(d.statut)}
          </div>

          <div className="text-sm space-y-1 mb-3 text-[var(--color-ink)]">
            <p>
              <span className="text-[var(--color-ink-soft)]">Email :</span> {d.email}
            </p>
            {d.telephone && (
              <p>
                <span className="text-[var(--color-ink-soft)]">Téléphone :</span> {d.telephone}
              </p>
            )}
            <p>
              <span className="text-[var(--color-ink-soft)]">Situation :</span>{' '}
              {d.est_independante === true && 'Indépendante'}
              {d.est_independante === false &&
                `Groupement${d.nom_groupement ? ` — ${d.nom_groupement}` : ''}`}
              {d.est_independante === null && 'Non précisé'}
            </p>
            {d.message && (
              <p>
                <span className="text-[var(--color-ink-soft)]">Message :</span> {d.message}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {STATUTS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => changerStatut(d.id, s)}
                disabled={loadingId === d.id}
                className={`text-xs px-2 py-1 rounded border transition-colors disabled:opacity-50 ${
                  d.statut === s
                    ? 'bg-[var(--color-ink)] text-white border-[var(--color-ink)]'
                    : 'border-[var(--color-line)] text-[var(--color-ink)] hover:border-[var(--color-primary)]'
                }`}
              >
                {LABELS_STATUT[s]}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
