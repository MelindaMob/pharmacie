'use client'

import { useMemo } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

type Reservation = {
  id: string
  statut: string
  canal: string
  token_gestion: string
  creneaux: {
    debut: string
    pharmacies: {
      id: string
      nom: string
      adresse: string
      telephone: string
      groupement_id: string | null
    } | null
  } | null
}

const LABELS_STATUT: Record<string, string> = {
  confirme: 'Confirmé',
  annule: 'Annulé',
  termine: 'Terminé',
  no_show: 'Absence',
}

const STYLES_STATUT: Record<string, string> = {
  confirme: 'text-[var(--color-accent)]',
  annule: 'text-red-700',
  termine: 'text-[var(--color-ink-soft)]',
  no_show: 'text-[var(--color-warning-text)]',
}

export default function ListeRdvClient({ reservations }: { reservations: Reservation[] }) {
  const { groupesAVenir, historique } = useMemo(() => {
    const maintenant = new Date()
    const aVenir: Reservation[] = []
    const historique: Reservation[] = []

    reservations.forEach((r) => {
      if (!r.creneaux) return
      const debut = new Date(r.creneaux.debut)
      if (debut > maintenant && r.statut === 'confirme') aVenir.push(r)
      else historique.push(r)
    })

    aVenir.sort(
      (a, b) => new Date(a.creneaux!.debut).getTime() - new Date(b.creneaux!.debut).getTime()
    )
    historique.sort(
      (a, b) => new Date(b.creneaux!.debut).getTime() - new Date(a.creneaux!.debut).getTime()
    )

    const groupes = new Map<
      string,
      {
        pharmacie: NonNullable<Reservation['creneaux']>['pharmacies']
        rdvs: Reservation[]
      }
    >()

    aVenir.forEach((r) => {
      const p = r.creneaux?.pharmacies
      const key = p?.id ?? r.id
      const existant = groupes.get(key)
      if (existant) existant.rdvs.push(r)
      else groupes.set(key, { pharmacie: p, rdvs: [r] })
    })

    return { groupesAVenir: Array.from(groupes.values()), historique }
  }, [reservations])

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-sm font-medium text-[var(--color-ink-soft)] mb-2">À venir</h2>
        {groupesAVenir.length === 0 ? (
          <p className="text-sm text-[var(--color-ink-soft)]">Aucun rendez-vous à venir.</p>
        ) : (
          <div className="divide-y divide-[var(--color-line)] border-t border-b border-[var(--color-line)]">
            {groupesAVenir.map(({ pharmacie, rdvs }) => (
              <div key={pharmacie?.id ?? rdvs[0].id} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-[var(--color-ink)]">{pharmacie?.nom}</p>
                    {pharmacie?.adresse && (
                      <p className="text-xs text-[var(--color-ink-soft)] truncate">
                        {pharmacie.adresse}
                      </p>
                    )}
                  </div>
                  {pharmacie?.id && (
                    <a
                      href={`/pharmacie/${pharmacie.id}`}
                      className="text-xs text-[var(--color-primary)] hover:underline whitespace-nowrap"
                    >
                      Nouveau RDV
                    </a>
                  )}
                </div>
                <ul className="mt-2 space-y-1">
                  {rdvs.map((r) => (
                    <li key={r.id}>
                      <a
                        href={`/rdv/gestion/${r.token_gestion}`}
                        className="flex items-center justify-between gap-2 text-sm py-1 hover:text-[var(--color-primary)]"
                      >
                        <span className="font-[family-name:var(--font-mono)] text-[var(--color-ink)]">
                          {format(new Date(r.creneaux!.debut), "EEE d MMM 'à' HH:mm", {
                            locale: fr,
                          })}
                        </span>
                        <span className="text-xs text-[var(--color-ink-soft)]">Gérer</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-medium text-[var(--color-ink-soft)] mb-2">Historique</h2>
        {historique.length === 0 ? (
          <p className="text-sm text-[var(--color-ink-soft)]">Aucun historique.</p>
        ) : (
          <ul className="divide-y divide-[var(--color-line)] border-t border-b border-[var(--color-line)]">
            {historique.map((r) => {
              const pharmacie = r.creneaux?.pharmacies
              return (
                <li key={r.id}>
                  <a
                    href={`/rdv/gestion/${r.token_gestion}`}
                    className="flex items-baseline justify-between gap-3 py-2.5 hover:bg-[var(--color-bg)]"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--color-ink)] truncate">
                        {pharmacie?.nom}
                      </p>
                      <p className="text-xs font-[family-name:var(--font-mono)] text-[var(--color-ink-soft)]">
                        {format(new Date(r.creneaux!.debut), "d MMM yyyy 'à' HH:mm", {
                          locale: fr,
                        })}
                      </p>
                    </div>
                    {r.statut !== 'confirme' && (
                      <span className={`text-xs shrink-0 ${STYLES_STATUT[r.statut] ?? ''}`}>
                        {LABELS_STATUT[r.statut] ?? r.statut}
                      </span>
                    )}
                  </a>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
