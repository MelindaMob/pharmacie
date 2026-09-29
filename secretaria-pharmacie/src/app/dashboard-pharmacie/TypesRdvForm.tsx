'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { regenererCreneauxClient } from '@/lib/creneaux/regenererCreneauxClient'
import TypeRdvFenetresForm from './TypeRdvFenetresForm'

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

const DUREES_MINUTES = [5, 10, 15, 20, 25, 30, 45, 60]
const CAPACITES = [1, 2, 3, 4, 5, 6, 7, 8]

type Fenetre = { id: string; jour: string; debut: string; fin: string }
type Exception = {
  id: string
  date_debut: string
  date_fin: string
  ferme: boolean
  debut: string | null
  fin: string | null
}

export default function TypesRdvForm({
  pharmacieId,
  catalogue,
  typesRdv,
  fenetresParTypeId,
  exceptionsParTypeId,
}: {
  pharmacieId: string
  catalogue: CatalogueItem[]
  /** Toutes les lignes types_rdv de la pharmacie, actives ou non (on ne supprime plus jamais une ligne : on la désactive, pour ne pas casser les créneaux déjà générés). */
  typesRdv: TypeRdvLigne[]
  /** Fenêtres hebdomadaires existantes, indexées par id de ligne types_rdv. */
  fenetresParTypeId: Record<string, Fenetre[]>
  /** Dérogations exceptionnelles existantes, indexées par id de ligne types_rdv. */
  exceptionsParTypeId: Record<string, Exception[]>
}) {
  const [lignes, setLignes] = useState<Record<string, TypeRdvLigne>>(() =>
    Object.fromEntries(typesRdv.map((t) => [t.catalogue_id, t]))
  )
  const [loading, setLoading] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [erreur, setErreur] = useState('')
  const [ouverts, setOuverts] = useState<Set<string>>(new Set())
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

  const toggleOuvert = (catalogueId: string) => {
    setOuverts((prev) => {
      const next = new Set(prev)
      if (next.has(catalogueId)) next.delete(catalogueId)
      else next.add(catalogueId)
      return next
    })
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
    if (!ligne?.actif || loading) return

    setLoading(item.id)
    setMessage('')
    setErreur('')
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
      setLoading(null)
      return
    }

    try {
      const count = await regenererCreneauxClient(pharmacieId)
      setMessage(`Durée de « ${item.nom} » : ${dureeMinutes} min — ${count} créneaux régénérés ✓`)
    } catch (e) {
      const detail = e instanceof Error ? e.message : 'erreur inconnue'
      setMessage(`Durée enregistrée, mais créneaux non régénérés : ${detail}`)
    }
    setLoading(null)
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

      <div className="space-y-5 max-h-[600px] overflow-y-auto pr-2">
        {Object.entries(parCategorie).map(([categorie, items]) => (
          <div key={categorie}>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">{categorie}</h3>
            <div className="space-y-2">
              {items.map((item) => {
                const ligne = lignes[item.id]
                const actif = !!ligne?.actif
                const estOuvert = ouverts.has(item.id)
                const durees =
                  ligne && !DUREES_MINUTES.includes(ligne.duree_minutes)
                    ? [...DUREES_MINUTES, ligne.duree_minutes].sort((a, b) => a - b)
                    : DUREES_MINUTES
                const capacites =
                  ligne && !CAPACITES.includes(ligne.capacite)
                    ? [...CAPACITES, ligne.capacite].sort((a, b) => a - b)
                    : CAPACITES
                return (
                  <div key={item.id}>
                    <div className="flex items-center gap-3">
                    <label className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={actif}
                        disabled={loading === item.id}
                        onChange={() => toggleType(item)}
                      />
                      <span className="text-sm truncate">{item.nom}</span>
                    </label>
                    {actif && ligne && (
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center gap-1">
                          <select
                            value={ligne.duree_minutes}
                            disabled={loading === item.id}
                            onChange={(e) =>
                              void modifierDuree(item, parseInt(e.target.value, 10))
                            }
                            className="ui-input !w-auto !py-1 !px-2"
                            aria-label={`Durée de ${item.nom}`}
                          >
                            {durees.map((d) => (
                              <option key={d} value={d}>
                                {d}
                              </option>
                            ))}
                          </select>
                          <span className="text-xs text-gray-500">min</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <select
                            value={ligne.capacite}
                            disabled={loading === item.id}
                            onChange={(e) =>
                              void modifierCapacite(item, parseInt(e.target.value, 10))
                            }
                            className="ui-input !w-auto !py-1 !px-2"
                            aria-label={`Capacité de ${item.nom}`}
                          >
                            {capacites.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                          <span className="text-xs text-gray-500">en même temps</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleOuvert(item.id)}
                          className="text-xs underline text-gray-500 shrink-0"
                        >
                          {estOuvert ? 'Masquer' : 'Créneaux spécifiques'}
                        </button>
                      </div>
                    )}
                    </div>
                    {actif && estOuvert && ligne && (
                      <TypeRdvFenetresForm
                        pharmacieId={pharmacieId}
                        typeRdvId={ligne.id}
                        fenetresInitiales={fenetresParTypeId[ligne.id] ?? []}
                        exceptionsInitiales={exceptionsParTypeId[ligne.id] ?? []}
                      />
                    )}
                  </div>
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
