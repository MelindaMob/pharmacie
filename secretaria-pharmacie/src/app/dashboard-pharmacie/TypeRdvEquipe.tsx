'use client'

import { useRef, useState } from 'react'
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
  const [erreur, setErreur] = useState('')
  const [enregistrement, setEnregistrement] = useState(false)
  const router = useRouter()
  const aEnvoyer = useRef<string[] | null>(null)
  const enVol = useRef(false)

  const enregistrer = async (ids: string[]) => {
    aEnvoyer.current = ids
    if (enVol.current) return
    enVol.current = true
    setEnregistrement(true)
    setErreur('')

    while (aEnvoyer.current) {
      const payload = aEnvoyer.current
      aEnvoyer.current = null
      const res = await fetch('/api/pharmacie/types-rdv-professionnels', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pharmacieId, typeRdvId, professionnelIds: payload }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErreur(typeof data.error === 'string' ? data.error : "Erreur lors de l'enregistrement")
        enVol.current = false
        setEnregistrement(false)
        router.refresh()
        return
      }
    }

    enVol.current = false
    setEnregistrement(false)
    router.refresh()
  }

  const basculer = (proId: string) => {
    const prochaine = selection.includes(proId)
      ? selection.filter((x) => x !== proId)
      : [...selection, proId]
    onChange(prochaine)
    void enregistrer(prochaine)
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
              onClick={() => basculer(p.id)}
              className={`text-xs rounded-full border px-2.5 py-1 ${
                choisi ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700'
              } ${p.actif ? '' : 'opacity-50'}`}
            >
              {p.nom}
            </button>
          )
        })}
        {enregistrement && (
          <span className="text-[11px] text-gray-400">Enregistrement…</span>
        )}
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
