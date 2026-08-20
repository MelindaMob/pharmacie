'use client'

import { useState, useMemo, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, isSameDay, addDays } from 'date-fns'
import { fr } from 'date-fns/locale'

type TypeRdv = { id: string; nom: string; duree_minutes: number }
type Creneau = { id: string; debut: string; fin: string; type_rdv_id: string; statut: string }
type Alternative = {
  pharmacie_id: string
  nom: string
  adresse: string
  telephone: string
  distance_km: number
  prochain_creneau: string
  creneaux_proches: string[]
}

function debutDuJourLocal(dateStr: string) {
  return new Date(
    Number(dateStr.slice(0, 4)),
    Number(dateStr.slice(5, 7)) - 1,
    Number(dateStr.slice(8, 10)),
    0,
    0,
    0
  )
}

function minutesDepuisMinuitLocales(date: Date) {
  return date.getHours() * 60 + date.getMinutes()
}

function minutesUtcPourHeureLocale(dateStr: string, heureStr: string) {
  const [h, m] = heureStr.split(':').map(Number)
  const momentLocal = new Date(
    Number(dateStr.slice(0, 4)),
    Number(dateStr.slice(5, 7)) - 1,
    Number(dateStr.slice(8, 10)),
    h,
    m,
    0
  )
  return momentLocal.getUTCHours() * 60 + momentLocal.getUTCMinutes()
}

function choisirCreneauxProches(
  slots: { debut: string }[],
  dateSouhaitee: string,
  heureSouhaitee: string
) {
  const dateVoulue = debutDuJourLocal(dateSouhaitee)
  const minutesVoulues = heureSouhaitee
    ? (() => {
        const [h, m] = heureSouhaitee.split(':').map(Number)
        return h * 60 + m
      })()
    : null

  const duJour = slots.filter((c) => isSameDay(new Date(c.debut), dateVoulue))
  const pool = duJour.length > 0 ? duJour : slots

  const tries = [...pool].sort((a, b) => {
    if (minutesVoulues === null) {
      return new Date(a.debut).getTime() - new Date(b.debut).getTime()
    }
    const minutesA = minutesDepuisMinuitLocales(new Date(a.debut))
    const minutesB = minutesDepuisMinuitLocales(new Date(b.debut))
    const diff = Math.abs(minutesA - minutesVoulues) - Math.abs(minutesB - minutesVoulues)
    if (diff !== 0) return diff
    return new Date(a.debut).getTime() - new Date(b.debut).getTime()
  })

  return tries.slice(0, 4).map((c) => c.debut)
}

const NB_JOURS_RECHERCHE_ETENDUE = 3 // si rien le jour demandé, on regarde jusqu'à 3 jours après avant de proposer le fallback

export default function CreneauxDisponibles({
  pharmacieId,
  typesRdv,
  creneaux,
}: {
  pharmacieId: string
  typesRdv: TypeRdv[]
  creneaux: Creneau[]
}) {
  const [typeSelectionne, setTypeSelectionne] = useState<string>(typesRdv[0]?.id ?? '')
  const [dateSouhaitee, setDateSouhaitee] = useState<string>(format(new Date(), 'yyyy-MM-dd'))
  const [heureSouhaitee, setHeureSouhaitee] = useState<string>('')
  const [rechercheEffectuee, setRechercheEffectuee] = useState(false)

  const [creneauSelectionne, setCreneauSelectionne] = useState<Creneau | null>(null)
  const [nom, setNom] = useState('')
  const [telephone, setTelephone] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState('')
  const [alternatives, setAlternatives] = useState<Alternative[]>([])
  const [chargementAlternatives, setChargementAlternatives] = useState(false)

  const creneauxDuType = useMemo(
    () => creneaux.filter((c) => c.type_rdv_id === typeSelectionne),
    [creneaux, typeSelectionne]
  )

  // Résultat de la recherche : soit des créneaux le jour demandé, soit dans les jours suivants, soit rien
  const resultatRecherche = useMemo(() => {
    if (!rechercheEffectuee) return null

    const dateVoulue = new Date(dateSouhaitee)
    const minutesVoulues = heureSouhaitee
      ? parseInt(heureSouhaitee.split(':')[0]) * 60 + parseInt(heureSouhaitee.split(':')[1])
      : null

    // 1. Chercher les créneaux exactement le jour demandé
    const creneauxDuJour = creneauxDuType.filter((c) => isSameDay(new Date(c.debut), dateVoulue))

    if (creneauxDuJour.length > 0) {
      // Trier par proximité avec l'heure demandée (si donnée), sinon par heure croissante
      const tries = [...creneauxDuJour].sort((a, b) => {
        if (minutesVoulues === null) {
          return new Date(a.debut).getTime() - new Date(b.debut).getTime()
        }
        const minutesA = new Date(a.debut).getHours() * 60 + new Date(a.debut).getMinutes()
        const minutesB = new Date(b.debut).getHours() * 60 + new Date(b.debut).getMinutes()
        return Math.abs(minutesA - minutesVoulues) - Math.abs(minutesB - minutesVoulues)
      })
      return { type: 'meme_jour' as const, creneaux: tries.slice(0, 6) }
    }

    // 2. Rien ce jour-là : chercher dans les jours suivants (jusqu'à NB_JOURS_RECHERCHE_ETENDUE)
    for (let i = 1; i <= NB_JOURS_RECHERCHE_ETENDUE; i++) {
      const jourSuivant = addDays(dateVoulue, i)
      const creneauxJourSuivant = creneauxDuType
        .filter((c) => isSameDay(new Date(c.debut), jourSuivant))
        .sort((a, b) => new Date(a.debut).getTime() - new Date(b.debut).getTime())

      if (creneauxJourSuivant.length > 0) {
        return { type: 'jour_proche' as const, creneaux: creneauxJourSuivant.slice(0, 6) }
      }
    }

    // 3. Rien trouvé dans la fenêtre → déclenche le fallback groupement
    return { type: 'rien' as const, creneaux: [] }
  }, [rechercheEffectuee, dateSouhaitee, heureSouhaitee, creneauxDuType])

  // Déclenche la recherche d'alternatives groupement si rien trouvé
  useEffect(() => {
    setAlternatives([])
    if (resultatRecherche?.type !== 'rien') return

    const typeNom = typesRdv.find((t) => t.id === typeSelectionne)?.nom
    if (!typeNom) return

    const chercherAlternatives = async () => {
      setChargementAlternatives(true)
      const supabase = createClient()
      const debutJourLocal = debutDuJourLocal(dateSouhaitee)
      const minutesVoulues = heureSouhaitee
        ? minutesUtcPourHeureLocale(dateSouhaitee, heureSouhaitee)
        : null

      const { data, error } = await supabase.rpc('rechercher_alternatives_groupement', {
        p_pharmacie_id: pharmacieId,
        p_type_rdv_nom: typeNom,
        p_date_min: debutJourLocal.toISOString(),
        p_heure_souhaitee_minutes: minutesVoulues,
      })

      if (error || !data) {
        setChargementAlternatives(false)
        setAlternatives([])
        return
      }

      const finRecherche = addDays(debutJourLocal, NB_JOURS_RECHERCHE_ETENDUE + 1)
      const alternativesRpc = (data as Omit<Alternative, 'creneaux_proches'>[]) ?? []

      const alternativesEnrichies = await Promise.all(
        alternativesRpc.map(async (alt) => {
          const { data: typeAlt } = await supabase
            .from('types_rdv')
            .select('id')
            .eq('pharmacie_id', alt.pharmacie_id)
            .eq('nom', typeNom)
            .maybeSingle()

          if (!typeAlt) {
            return { ...alt, creneaux_proches: [alt.prochain_creneau] }
          }

          const { data: slots } = await supabase
            .from('creneaux')
            .select('debut')
            .eq('pharmacie_id', alt.pharmacie_id)
            .eq('type_rdv_id', typeAlt.id)
            .eq('statut', 'disponible')
            .gte('debut', debutJourLocal.toISOString())
            .lt('debut', finRecherche.toISOString())
            .order('debut', { ascending: true })
            .limit(100)

          const creneauxProches = choisirCreneauxProches(slots ?? [], dateSouhaitee, heureSouhaitee)
          const prochain = creneauxProches[0] ?? alt.prochain_creneau

          return {
            ...alt,
            prochain_creneau: prochain,
            creneaux_proches: creneauxProches.length > 0 ? creneauxProches : [alt.prochain_creneau],
          }
        })
      )

      setChargementAlternatives(false)
      setAlternatives(alternativesEnrichies)
    }

    chercherAlternatives()
  }, [resultatRecherche, typeSelectionne, dateSouhaitee, heureSouhaitee, typesRdv, pharmacieId])

  const lancerRecherche = () => {
    setRechercheEffectuee(true)
    setCreneauSelectionne(null)
  }

  const reserver = async () => {
    if (!creneauSelectionne || !nom || !telephone) {
      setErreur('Merci de remplir votre nom et téléphone')
      return
    }

    setLoading(true)
    setErreur('')

    const res = await fetch('/api/reserver', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creneauId: creneauSelectionne.id, nom, telephone }),
    })

    const data = await res.json()
    setLoading(false)

    if (data.error) {
      setErreur(data.error)
      return
    }

    setConfirmation(
      `Rendez-vous confirmé le ${data.dateFormatee}. Lien de gestion : ${window.location.origin}/rdv/gestion/${data.tokenGestion}`
    )
  }

  if (confirmation) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <p className="text-green-800 font-semibold">{confirmation}</p>
        <p className="text-sm text-green-700 mt-2">
          Vous recevrez un SMS de rappel avant votre rendez-vous.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Étape 1 : type de RDV */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Type de rendez-vous</label>
        <select
          value={typeSelectionne}
          onChange={(e) => {
            setTypeSelectionne(e.target.value)
            setRechercheEffectuee(false)
            setCreneauSelectionne(null)
          }}
          className="border rounded px-3 py-2 w-full"
        >
          {typesRdv.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nom} ({t.duree_minutes} min)
            </option>
          ))}
        </select>
      </div>

      {/* Étape 2 : date + heure souhaitées */}
      <div className="mb-4 flex gap-3">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">Date souhaitée</label>
          <input
            type="date"
            value={dateSouhaitee}
            min={format(new Date(), 'yyyy-MM-dd')}
            onChange={(e) => {
              setDateSouhaitee(e.target.value)
              setRechercheEffectuee(false)
              setCreneauSelectionne(null)
            }}
            className="border rounded px-3 py-2 w-full"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">Heure souhaitée (optionnel)</label>
          <input
            type="time"
            value={heureSouhaitee}
            onChange={(e) => {
              setHeureSouhaitee(e.target.value)
              setRechercheEffectuee(false)
              setCreneauSelectionne(null)
            }}
            className="border rounded px-3 py-2 w-full"
          />
        </div>
      </div>

      <button
        onClick={lancerRecherche}
        className="w-full bg-black text-white py-2 rounded mb-6"
      >
        Rechercher un créneau
      </button>

      {/* Résultats */}
      {resultatRecherche && resultatRecherche.type === 'meme_jour' && (
        <div className="mb-6">
          <p className="text-sm font-medium mb-2">
            Créneaux disponibles le {format(new Date(dateSouhaitee), 'EEEE d MMMM', { locale: fr })} :
          </p>
          <div className="flex flex-wrap gap-2">
            {resultatRecherche.creneaux.map((c) => (
              <button
                key={c.id}
                onClick={() => setCreneauSelectionne(c)}
                className={`px-3 py-1.5 rounded border text-sm ${
                  creneauSelectionne?.id === c.id
                    ? 'bg-black text-white border-black'
                    : 'bg-white hover:bg-gray-50'
                }`}
              >
                {format(new Date(c.debut), 'HH:mm')}
              </button>
            ))}
          </div>
        </div>
      )}

      {resultatRecherche && resultatRecherche.type === 'jour_proche' && (
        <div className="mb-6">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
            <p className="text-sm text-amber-800">
              Rien de disponible le {format(new Date(dateSouhaitee), 'EEEE d MMMM', { locale: fr })}. Voici le prochain jour disponible :
            </p>
          </div>
          <p className="text-sm font-medium mb-2">
            {format(new Date(resultatRecherche.creneaux[0].debut), 'EEEE d MMMM', { locale: fr })} :
          </p>
          <div className="flex flex-wrap gap-2">
            {resultatRecherche.creneaux.map((c) => (
              <button
                key={c.id}
                onClick={() => setCreneauSelectionne(c)}
                className={`px-3 py-1.5 rounded border text-sm ${
                  creneauSelectionne?.id === c.id
                    ? 'bg-black text-white border-black'
                    : 'bg-white hover:bg-gray-50'
                }`}
              >
                {format(new Date(c.debut), 'HH:mm')}
              </button>
            ))}
          </div>
        </div>
      )}

      {resultatRecherche && resultatRecherche.type === 'rien' && (
        <div className="mb-6">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-amber-800">
              Aucune disponibilité proche de cette date pour ce motif dans cette pharmacie.
            </p>
          </div>

          {chargementAlternatives && (
            <p className="text-sm text-gray-500">Recherche de pharmacies du groupement à proximité...</p>
          )}

          {!chargementAlternatives && alternatives.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Souhaitez-vous être redirigé vers une autre pharmacie du groupement ?</p>
              <div className="space-y-2">
                {alternatives.map((alt) => (
                  <a
                    key={alt.pharmacie_id}
                    href={`/pharmacie/${alt.pharmacie_id}`}
                    className="block border rounded-lg p-3 hover:bg-gray-50"
                  >
                    <div className="flex justify-between">
                      <span className="font-medium text-sm">{alt.nom}</span>
                      <span className="text-xs text-gray-500">{alt.distance_km} km</span>
                    </div>
                    <p className="text-xs text-gray-600">{alt.adresse}</p>
                    <p className="text-xs text-green-700 mt-1">
                      Créneau le plus proche :{' '}
                      {format(new Date(alt.prochain_creneau), "EEEE d MMMM 'à' HH:mm", { locale: fr })}
                    </p>
                    {alt.creneaux_proches.length > 1 && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        Aussi :{' '}
                        {alt.creneaux_proches
                          .slice(1)
                          .map((d) => format(new Date(d), 'HH:mm'))
                          .join(' · ')}
                      </p>
                    )}
                  </a>
                ))}
              </div>
            </div>
          )}

          {!chargementAlternatives && alternatives.length === 0 && (
            <p className="text-sm text-gray-500">
              Aucune pharmacie du groupement à proximité n&apos;a de disponibilité pour ce motif.
              Contactez directement la pharmacie pour plus d&apos;options.
            </p>
          )}
        </div>
      )}

      {/* Formulaire de résa */}
      {creneauSelectionne && (
        <div className="border rounded-lg p-4 bg-gray-50">
          <p className="text-sm font-medium mb-3">
            Créneau choisi : {format(new Date(creneauSelectionne.debut), "EEEE d MMMM 'à' HH:mm", { locale: fr })}
          </p>

          <div className="space-y-3">
            <input
              type="text"
              placeholder="Votre nom"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
            <input
              type="tel"
              placeholder="Votre téléphone"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />

            {erreur && <p className="text-red-600 text-sm">{erreur}</p>}

            <button
              onClick={reserver}
              disabled={loading}
              className="w-full bg-black text-white py-2 rounded disabled:opacity-50"
            >
              {loading ? 'Réservation...' : 'Confirmer le rendez-vous'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
