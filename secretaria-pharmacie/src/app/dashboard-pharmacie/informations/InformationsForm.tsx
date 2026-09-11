'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Info = {
  id: string
  contenu: string
  date_debut: string | null
  date_fin: string | null
  active: boolean
  created_at: string
}

function aujourdhui(): string {
  return new Date().toDateString()
}

function estExpiree(dateFin: string | null): boolean {
  if (!dateFin) return false
  return new Date(dateFin) < new Date(aujourdhui())
}

function pasEncoreActive(dateDebut: string | null): boolean {
  if (!dateDebut) return false
  return new Date(dateDebut) > new Date(aujourdhui())
}

function libellePeriode(dateDebut: string | null, dateFin: string | null): string | null {
  const formatee = (d: string) => new Date(d).toLocaleDateString('fr-FR')
  if (dateDebut && dateFin) return `du ${formatee(dateDebut)} au ${formatee(dateFin)}`
  if (dateDebut) return `à partir du ${formatee(dateDebut)}`
  if (dateFin) return `jusqu'au ${formatee(dateFin)}`
  return null
}

export default function InformationsForm({
  pharmacieId,
  infos,
}: {
  pharmacieId: string
  infos: Info[]
}) {
  const [contenu, setContenu] = useState('')
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState('')
  const router = useRouter()

  const ajouter = async () => {
    if (!contenu.trim()) return

    setLoading(true)
    setErreur('')

    const res = await fetch('/api/pharmacie/infos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pharmacieId,
        contenu: contenu.trim(),
        dateDebut: dateDebut || null,
        dateFin: dateFin || null,
      }),
    })
    const data = await res.json()

    setLoading(false)
    if (!res.ok) {
      setErreur(typeof data.error === 'string' ? data.error : "Erreur lors de l'ajout")
      return
    }

    setContenu('')
    setDateDebut('')
    setDateFin('')
    router.refresh()
  }

  const basculerActif = async (id: string, active: boolean) => {
    setErreur('')
    const res = await fetch('/api/pharmacie/infos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, pharmacieId, active: !active }),
    })
    if (!res.ok) {
      setErreur('Erreur lors de la mise à jour')
      return
    }
    router.refresh()
  }

  const supprimer = async (id: string) => {
    setErreur('')
    const res = await fetch('/api/pharmacie/infos', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, pharmacieId }),
    })
    if (!res.ok) {
      setErreur('Erreur lors de la suppression')
      return
    }
    router.refresh()
  }

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl p-4 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-stretch gap-2 mb-4">
        <div className="min-w-0 flex-1">
          <input
            type="text"
            value={contenu}
            onChange={(e) => setContenu(e.target.value)}
            placeholder="Ex : Plus de lunettes éclipse solaire en stock"
            className="ui-input"
          />
        </div>
        <div className="w-full sm:w-40 shrink-0">
          <input
            type="date"
            value={dateDebut}
            onChange={(e) => setDateDebut(e.target.value)}
            title="Date de début (optionnel)"
            className="ui-input"
          />
        </div>
        <div className="w-full sm:w-40 shrink-0">
          <input
            type="date"
            value={dateFin}
            onChange={(e) => setDateFin(e.target.value)}
            title="Date de fin (optionnel)"
            className="ui-input"
          />
        </div>
        <button
          type="button"
          onClick={ajouter}
          disabled={loading || !contenu.trim()}
          className="ui-btn-primary shrink-0"
        >
          {loading ? '…' : 'Ajouter'}
        </button>
      </div>

      {erreur && <p className="text-red-600 text-sm mb-3">{erreur}</p>}

      {infos.length === 0 ? (
        <p className="text-sm text-[var(--color-ink-soft)]">Aucune information pour le moment.</p>
      ) : (
        <ul className="space-y-1">
          {infos.map((info) => {
            const expiree = estExpiree(info.date_fin)
            const pasActive = pasEncoreActive(info.date_debut)
            const periode = libellePeriode(info.date_debut, info.date_fin)
            return (
              <li
                key={info.id}
                className="flex items-center justify-between gap-3 py-1.5 border-b border-[var(--color-line)] last:border-0"
                style={{ opacity: info.active && !expiree ? 1 : 0.5 }}
              >
                <span className="text-sm text-[var(--color-ink)]">
                  {info.contenu}
                  {periode && (
                    <span className="ml-2 text-xs text-[var(--color-ink-soft)]">
                      ({expiree ? 'expirée, ' : pasActive ? 'à venir, ' : ''}
                      {periode})
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-3 text-xs shrink-0">
                  <button
                    type="button"
                    onClick={() => basculerActif(info.id, info.active)}
                    className="underline text-[var(--color-accent)]"
                  >
                    {info.active ? 'Désactiver' : 'Réactiver'}
                  </button>
                  <button
                    type="button"
                    onClick={() => supprimer(info.id)}
                    className="underline text-red-600"
                  >
                    Supprimer
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
