'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

type CatalogueItem = {
  id: string
  nom: string
  categorie: string
  duree_minutes_defaut: number
}

type TypeRdvActif = {
  id: string // id dans types_rdv (pas catalogue_id)
  catalogue_id: string
  duree_minutes: number
}

export default function TypesRdvForm({
  pharmacieId,
  catalogue,
  typesActifs,
}: {
  pharmacieId: string
  catalogue: CatalogueItem[]
  typesActifs: TypeRdvActif[]
}) {
  const [actifs, setActifs] = useState<Record<string, TypeRdvActif>>(() =>
    Object.fromEntries(typesActifs.map((t) => [t.catalogue_id, t]))
  )
  const [loading, setLoading] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [erreur, setErreur] = useState('')

  const parCategorie = useMemo(() => {
    const groupes: Record<string, CatalogueItem[]> = {}
    catalogue.forEach((item) => {
      if (!groupes[item.categorie]) groupes[item.categorie] = []
      groupes[item.categorie].push(item)
    })
    return groupes
  }, [catalogue])

  const toggleType = async (item: CatalogueItem) => {
    if (loading) return

    setLoading(item.id)
    setMessage('')
    setErreur('')
    const supabase = createClient()
    const dejaActif = actifs[item.id]

    if (dejaActif) {
      const { error } = await supabase.from('types_rdv').delete().eq('id', dejaActif.id)

      if (error) {
        setErreur(`Impossible de désactiver : ${error.message}`)
      } else {
        setActifs((prev) => {
          const next = { ...prev }
          delete next[item.id]
          return next
        })
        setMessage(`${item.nom} désactivé`)
      }
    } else {
      const { data, error } = await supabase
        .from('types_rdv')
        .insert({
          pharmacie_id: pharmacieId,
          catalogue_id: item.id,
          nom: item.nom,
          duree_minutes: item.duree_minutes_defaut,
        })
        .select('id, catalogue_id, duree_minutes')
        .single()

      if (error || !data) {
        setErreur(`Impossible d'activer : ${error?.message ?? 'réponse vide'}`)
      } else {
        setActifs((prev) => ({
          ...prev,
          [item.id]: {
            id: data.id,
            catalogue_id: data.catalogue_id ?? item.id,
            duree_minutes: data.duree_minutes,
          },
        }))
        setMessage(`${item.nom} activé`)
      }
    }

    setLoading(null)
  }

  const modifierDuree = async (item: CatalogueItem, dureeMinutes: number) => {
    const actif = actifs[item.id]
    if (!actif) return

    setActifs((prev) => ({
      ...prev,
      [item.id]: { ...actif, duree_minutes: dureeMinutes },
    }))

    const supabase = createClient()
    const { error } = await supabase
      .from('types_rdv')
      .update({ duree_minutes: dureeMinutes })
      .eq('id', actif.id)

    if (error) {
      setErreur(`Impossible de modifier la durée : ${error.message}`)
    }
  }

  return (
    <div className="bg-white rounded-lg border p-4 mb-6">
      <h2 className="font-semibold mb-1">Types de rendez-vous proposés</h2>
      <p className="text-sm text-gray-500 mb-4">
        Cochez les prestations que votre pharmacie propose. Vous pouvez ajuster la durée de chaque
        créneau.
      </p>

      <div className="space-y-5 max-h-[500px] overflow-y-auto pr-2">
        {Object.entries(parCategorie).map(([categorie, items]) => (
          <div key={categorie}>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">{categorie}</h3>
            <div className="space-y-2">
              {items.map((item) => {
                const actif = actifs[item.id]
                return (
                  <label
                    key={item.id}
                    className="flex items-center gap-3 cursor-pointer select-none"
                  >
                    <input
                      type="checkbox"
                      checked={!!actif}
                      disabled={loading === item.id}
                      onChange={() => toggleType(item)}
                    />
                    <span className="flex-1 text-sm">{item.nom}</span>
                    {actif && (
                      <div
                        className="flex items-center gap-1"
                        onClick={(e) => e.preventDefault()}
                      >
                        <input
                          type="number"
                          min={5}
                          step={5}
                          value={actif.duree_minutes}
                          onChange={(e) =>
                            modifierDuree(item, parseInt(e.target.value) || 15)
                          }
                          className="w-16 border rounded px-2 py-1 text-sm"
                        />
                        <span className="text-xs text-gray-500">min</span>
                      </div>
                    )}
                  </label>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {message && <p className="text-sm text-green-700 mt-3">{message}</p>}
      {erreur && <p className="text-sm text-red-600 mt-3">{erreur}</p>}
    </div>
  )
}
