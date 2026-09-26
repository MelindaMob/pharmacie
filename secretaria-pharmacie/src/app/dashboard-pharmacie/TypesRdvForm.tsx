'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { regenererCreneauxClient } from '@/lib/creneaux/regenererCreneauxClient'

type CatalogueItem = {
  id: string
  nom: string
  categorie: string
  duree_minutes_defaut: number
}

type TypeRdvLigne = {
  id: string // id dans types_rdv (pas catalogue_id)
  catalogue_id: string
  duree_minutes: number
  capacite: number
  actif: boolean
}

export default function TypesRdvForm({
  pharmacieId,
  catalogue,
  typesRdv,
}: {
  pharmacieId: string
  catalogue: CatalogueItem[]
  /** Toutes les lignes types_rdv de la pharmacie, actives ou non (on ne supprime plus jamais une ligne : on la désactive, pour ne pas casser les créneaux déjà générés). */
  typesRdv: TypeRdvLigne[]
}) {
  const [lignes, setLignes] = useState<Record<string, TypeRdvLigne>>(() =>
    Object.fromEntries(typesRdv.map((t) => [t.catalogue_id, t]))
  )
  const [loading, setLoading] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [erreur, setErreur] = useState('')
  const router = useRouter()

  const parCategorie = useMemo(() => {
    const groupes: Record<string, CatalogueItem[]> = {}
    catalogue.forEach((item) => {
      if (!groupes[item.categorie]) groupes[item.categorie] = []
      groupes[item.categorie].push(item)
    })
    return groupes
  }, [catalogue])

  const regenererApresChangement = async (libelle: string, action: 'activé' | 'désactivé') => {
    try {
      const count = await regenererCreneauxClient(pharmacieId)
      setMessage(`${libelle} ${action} — ${count} créneaux régénérés ✓`)
      router.refresh()
    } catch (e) {
      const detail = e instanceof Error ? e.message : 'erreur inconnue'
      setMessage(`${libelle} ${action}, mais créneaux non régénérés : ${detail}`)
    }
  }

  const toggleType = async (item: CatalogueItem) => {
    if (loading) return

    setLoading(item.id)
    setMessage('')
    setErreur('')
    const supabase = createClient()
    const ligne = lignes[item.id]
    const dejaActif = !!ligne?.actif

    if (dejaActif) {
      // On ne supprime jamais la ligne : des créneaux existants la référencent
      // (contrainte creneaux_type_rdv_id_fkey). On la désactive à la place.
      const { error } = await supabase
        .from('types_rdv')
        .update({ actif: false })
        .eq('id', ligne.id)

      if (error) {
        setErreur(`Impossible de désactiver : ${error.message}`)
      } else {
        setLignes((prev) => ({ ...prev, [item.id]: { ...ligne, actif: false } }))
        await regenererApresChangement(item.nom, 'désactivé')
      }
    } else if (ligne) {
      // Une ligne inactive existe déjà pour ce catalogue_id (désactivée
      // précédemment) : on la réactive au lieu d'en recréer une.
      const { data, error } = await supabase
        .from('types_rdv')
        .update({ actif: true, duree_minutes: item.duree_minutes_defaut })
        .eq('id', ligne.id)
        .select('id, catalogue_id, duree_minutes, capacite, actif')
        .single()

      if (error || !data) {
        setErreur(`Impossible d'activer : ${error?.message ?? 'réponse vide'}`)
      } else {
        setLignes((prev) => ({
          ...prev,
          [item.id]: {
            id: data.id,
            catalogue_id: data.catalogue_id ?? item.id,
            duree_minutes: data.duree_minutes,
            capacite: data.capacite ?? 1,
            actif: true,
          },
        }))
        await regenererApresChangement(item.nom, 'activé')
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
        .select('id, catalogue_id, duree_minutes, capacite, actif')
        .single()

      if (error || !data) {
        setErreur(`Impossible d'activer : ${error?.message ?? 'réponse vide'}`)
      } else {
        setLignes((prev) => ({
          ...prev,
          [item.id]: {
            id: data.id,
            catalogue_id: data.catalogue_id ?? item.id,
            duree_minutes: data.duree_minutes,
            capacite: data.capacite ?? 1,
            actif: true,
          },
        }))
        await regenererApresChangement(item.nom, 'activé')
      }
    }

    setLoading(null)
  }

  const modifierDuree = async (item: CatalogueItem, dureeMinutes: number) => {
    const ligne = lignes[item.id]
    if (!ligne?.actif) return

    setLignes((prev) => ({
      ...prev,
      [item.id]: { ...ligne, duree_minutes: dureeMinutes },
    }))

    const supabase = createClient()
    const { error } = await supabase
      .from('types_rdv')
      .update({ duree_minutes: dureeMinutes })
      .eq('id', ligne.id)

    if (error) {
      setErreur(`Impossible de modifier la durée : ${error.message}`)
    }
  }

  const modifierCapacite = async (item: CatalogueItem, capacite: number) => {
    const ligne = lignes[item.id]
    if (!ligne?.actif) return

    const capaciteValide = Math.max(1, capacite)

    setLignes((prev) => ({
      ...prev,
      [item.id]: { ...ligne, capacite: capaciteValide },
    }))

    const supabase = createClient()
    const { error } = await supabase
      .from('types_rdv')
      .update({ capacite: capaciteValide })
      .eq('id', ligne.id)

    if (error) {
      setErreur(`Impossible de modifier la capacité : ${error.message}`)
    }
  }

  return (
    <div className="bg-white rounded-lg border p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">Types de rendez-vous proposés</h2>
        <a href="/dashboard-pharmacie/aide#types-rdv" className="text-xs underline text-gray-500">
          Aide
        </a>
      </div>

      <div className="space-y-5 max-h-[500px] overflow-y-auto pr-2">
        {Object.entries(parCategorie).map(([categorie, items]) => (
          <div key={categorie}>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">{categorie}</h3>
            <div className="space-y-2">
              {items.map((item) => {
                const ligne = lignes[item.id]
                const actif = !!ligne?.actif
                return (
                  <label
                    key={item.id}
                    className="flex items-center gap-3 cursor-pointer select-none"
                  >
                    <input
                      type="checkbox"
                      checked={actif}
                      disabled={loading === item.id}
                      onChange={() => toggleType(item)}
                    />
                    <span className="flex-1 text-sm">{item.nom}</span>
                    {actif && (
                      <div
                        className="flex items-center gap-3"
                        onClick={(e) => e.preventDefault()}
                      >
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={5}
                            step={5}
                            value={ligne.duree_minutes}
                            onChange={(e) =>
                              modifierDuree(item, parseInt(e.target.value) || 15)
                            }
                            className="w-16 border rounded px-2 py-1 text-sm"
                          />
                          <span className="text-xs text-gray-500">min</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={1}
                            step={1}
                            value={ligne.capacite}
                            onChange={(e) =>
                              modifierCapacite(item, parseInt(e.target.value) || 1)
                            }
                            className="w-14 border rounded px-2 py-1 text-sm"
                          />
                          <span className="text-xs text-gray-500">en même temps</span>
                        </div>
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
