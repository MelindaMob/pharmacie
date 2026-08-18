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
    pharmacies: { nom: string; adresse: string; telephone: string } | null
  } | null
}

export default function ListeRdvClient({
  reservations,
}: {
  reservations: Reservation[]
}) {
  const { aVenir, historique } = useMemo(() => {
    const maintenant = new Date()
    const aVenir: Reservation[] = []
    const historique: Reservation[] = []

    reservations.forEach((r) => {
      if (!r.creneaux) return
      const debut = new Date(r.creneaux.debut)
      if (debut > maintenant && r.statut === 'confirme') {
        aVenir.push(r)
      } else {
        historique.push(r)
      }
    })

    aVenir.sort(
      (a, b) =>
        new Date(a.creneaux!.debut).getTime() - new Date(b.creneaux!.debut).getTime()
    )

    return { aVenir, historique }
  }, [reservations])

  const badgeStatut = (statut: string) => {
    const styles: Record<string, string> = {
      confirme: 'bg-green-100 text-green-800',
      annule: 'bg-red-100 text-red-800',
      termine: 'bg-gray-100 text-gray-600',
      no_show: 'bg-orange-100 text-orange-800',
    }
    const labels: Record<string, string> = {
      confirme: 'Confirmé',
      annule: 'Annulé',
      termine: 'Terminé',
      no_show: 'Absence',
    }
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full ${styles[statut] ?? ''}`}>
        {labels[statut] ?? statut}
      </span>
    )
  }

  const CarteRdv = ({ r }: { r: Reservation }) => {
    const pharmacie = r.creneaux?.pharmacies
    return (
      <div className="border rounded-lg p-4">
        <div className="flex justify-between items-start mb-1">
          <p className="font-semibold">{pharmacie?.nom}</p>
          {badgeStatut(r.statut)}
        </div>
        <p className="text-sm text-gray-600">{pharmacie?.adresse}</p>
        <p className="text-sm mt-2">
          {format(new Date(r.creneaux!.debut), "EEEE d MMMM 'à' HH:mm", { locale: fr })}
        </p>
        {r.statut === 'confirme' && new Date(r.creneaux!.debut) > new Date() && (
          <a
            href={`/rdv/gestion/${r.token_gestion}`}
            className="inline-block mt-3 text-sm underline text-gray-700"
          >
            Gérer ce rendez-vous
          </a>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-semibold mb-3">À venir</h2>
        {aVenir.length === 0 ? (
          <p className="text-gray-500 text-sm">Aucun rendez-vous à venir.</p>
        ) : (
          <div className="space-y-3">
            {aVenir.map((r) => (
              <CarteRdv key={r.id} r={r} />
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="font-semibold mb-3">Historique</h2>
        {historique.length === 0 ? (
          <p className="text-gray-500 text-sm">Aucun historique.</p>
        ) : (
          <div className="space-y-3">
            {historique.map((r) => (
              <CarteRdv key={r.id} r={r} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
