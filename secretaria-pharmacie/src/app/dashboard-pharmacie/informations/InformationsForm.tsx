'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Info = {
  id: string
  contenu: string
  date_fin: string | null
  active: boolean
  created_at: string
}

function estExpiree(dateFin: string | null): boolean {
  if (!dateFin) return false
  return new Date(dateFin) < new Date(new Date().toDateString())
}

export default function InformationsForm({
  pharmacieId,
  infos,
}: {
  pharmacieId: string
  infos: Info[]
}) {
  const [contenu, setContenu] = useState('')
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
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          type="text"
          value={contenu}
          onChange={(e) => setContenu(e.target.value)}
          placeholder="Ex : Plus de lunettes éclipse solaire en stock"
          className="ui-input flex-1"
        />
        <input
          type="date"
          value={dateFin}
          onChange={(e) => setDateFin(e.target.value)}
          title="Date de fin (optionnel)"
          className="ui-input sm:w-40"
        />
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
            return (
              <li
                key={info.id}
                className="flex items-center justify-between gap-3 py-1.5 border-b border-[var(--color-line)] last:border-0"
                style={{ opacity: info.active && !expiree ? 1 : 0.5 }}
              >
                <span className="text-sm text-[var(--color-ink)]">
                  {info.contenu}
                  {info.date_fin && (
                    <span className="ml-2 text-xs text-[var(--color-ink-soft)]">
                      {expiree ? '(expirée le ' : "(jusqu'au "}
                      {new Date(info.date_fin).toLocaleDateString('fr-FR')})
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