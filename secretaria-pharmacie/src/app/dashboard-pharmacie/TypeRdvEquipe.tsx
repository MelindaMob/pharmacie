'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export type Professionnel = { id: string; nom: string; actif: boolean }

export default function TypeRdvEquipe({
  pharmacieId,
  typeRdvId,
  equipe,
  selection,
  onChange,
}: {
  pharmacieId: string
  typeRdvId: string
  equipe: Professionnel[]
  selection: string[]
  onChange: (ids: string[]) => void
}) {
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState('')
  const router = useRouter()

  const basculer = async (proId: string) => {
    if (loading) return
    const prochaine = selection.includes(proId)
      ? selection.filter((x) => x !== proId)
      : [...selection, proId]

    setLoading(true)
    setErreur('')
    const res = await fetch('/api/pharmacie/types-rdv-professionnels', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pharmacieId, typeRdvId, professionnelIds: prochaine }),
    })
    const data = await res.json().catch(() => ({}))
    setLoading(false)

    if (!res.ok) {
      setErreur(typeof data.error === 'string' ? data.error : "Erreur lors de l'enregistrement")
      return
    }
    onChange(prochaine)
    router.refresh()
  }

  return (
    <div className="pl-7 mt-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-gray-500">Réalisé par :</span>
        {equipe.map((p) => {
          const choisi = selection.includes(p.id)
          return (
            <button
              key={p.id}
              type="button"
              disabled={loading}
              onClick={() => void basculer(p.id)}
              className={`text-xs rounded-full border px-2.5 py-1 ${
                choisi ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700'
              } ${p.actif ? '' : 'opacity-50'}`}
            >
              {p.nom}
            </button>
          )
        })}
      </div>
      {selection.length === 0 && (
        <p className="text-xs text-gray-500 mt-1">
          Aucun choix : la capacité « en même temps » s&apos;applique.
        </p>
      )}
      {selection.length > 0 && (
        <p className="text-xs text-gray-500 mt-1">
          {selection.length} personne{selection.length > 1 ? 's' : ''} : jusqu&apos;à {selection.length} RDV
          en même temps, chacun attribué automatiquement.
        </p>
      )}
      {erreur && <p className="text-xs text-red-600 mt-1">{erreur}</p>}
    </div>
  )
}
