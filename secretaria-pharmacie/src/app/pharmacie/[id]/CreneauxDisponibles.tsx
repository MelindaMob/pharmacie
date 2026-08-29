'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, isSameDay, addDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import PharmacyCross from '@/components/PharmacyCross'

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

type ResultatRecherche =
  | { type: 'meme_jour'; creneaux: Creneau[] }
  | { type: 'jour_proche'; creneaux: Creneau[] }
  | { type: 'ferme'; creneaux: []; nomJour: string }
  | { type: 'rien'; creneaux: [] }

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

const NB_JOURS_RECHERCHE_ETENDUE = 3

export default function CreneauxDisponibles({
  pharmacieId,
  typesRdv,
  clientConnecte = null,
}: {
  pharmacieId: string
  typesRdv: TypeRdv[]
  clientConnecte?: { nom: string; telephone: string } | null
}) {
  const [typeSelectionne, setTypeSelectionne] = useState<string>(typesRdv[0]?.id ?? '')
  const [dateSouhaitee, setDateSouhaitee] = useState<string>(format(new Date(), 'yyyy-MM-dd'))
  const [heureSouhaitee, setHeureSouhaitee] = useState<string>('')
  const [resultatRecherche, setResultatRecherche] = useState<ResultatRecherche | null>(null)
  const [rechercheEnCours, setRechercheEnCours] = useState(false)

  const [creneauSelectionne, setCreneauSelectionne] = useState<Creneau | null>(null)
  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [telephone, setTelephone] = useState(clientConnecte?.telephone ?? '')
  const [confirmation, setConfirmation] = useState('')
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState('')
  const [alternatives, setAlternatives] = useState<Alternative[]>([])
  const [chargementAlternatives, setChargementAlternatives] = useState(false)

  const lancerRecherche = async () => {
    if (!typeSelectionne) return

    setRechercheEnCours(true)
    setCreneauSelectionne(null)
    setAlternatives([])
    setErreur('')
    setResultatRecherche(null)

    const params = new URLSearchParams({
      pharmacieId,
      typeRdvId: typeSelectionne,
      date: dateSouhaitee,
    })
    if (heureSouhaitee) params.set('heure', heureSouhaitee)

    const res = await fetch(`/api/pharmacie/rechercher-creneaux?${params.toString()}`)
    const data = await res.json()

    setRechercheEnCours(false)

    if (!res.ok) {
      setErreur(typeof data.error === 'string' ? data.error : 'Erreur lors de la recherche')
      return
    }

    setResultatRecherche(data.resultat as ResultatRecherche)
  }

  useEffect(() => {
    setAlternatives([])
    if (resultatRecherche?.type !== 'rien' && resultatRecherche?.type !== 'jour_proche') {
      return
    }

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

          const { data: slotsAlt } = await supabase
            .from('creneaux')
            .select('debut')
            .eq('pharmacie_id', alt.pharmacie_id)
            .eq('type_rdv_id', typeAlt.id)
            .eq('statut', 'disponible')
            .gte('debut', debutJourLocal.toISOString())
            .lt('debut', finRecherche.toISOString())
            .order('debut', { ascending: true })
            .limit(100)

          const creneauxProches = choisirCreneauxProches(slotsAlt ?? [], dateSouhaitee, heureSouhaitee)
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

  const reserver = async () => {
    const nomComplet = clientConnecte
      ? clientConnecte.nom
      : [prenom.trim(), nom.trim()].filter(Boolean).join(' ')
    const tel = clientConnecte ? clientConnecte.telephone : telephone

    if (!creneauSelectionne || !nomComplet || !tel) {
      setErreur(
        clientConnecte
          ? 'Impossible de réserver : profil client incomplet'
          : 'Merci de renseigner votre prénom, nom et téléphone'
      )
      return
    }

    setLoading(true)
    setErreur('')

    const res = await fetch('/api/reserver', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creneauId: creneauSelectionne.id,
        nom: nomComplet,
        telephone: tel,
      }),
    })

    const data = await res.json()
    setLoading(false)

    if (data.error) {
      setErreur(data.error)
      return
    }

    setConfirmation(`Rendez-vous confirmé le ${data.dateFormatee}.`)
  }

  const inputClass =
    'w-full border border-[var(--color-line)] rounded-lg px-3 py-2.5 text-sm bg-[var(--color-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent'

  if (confirmation) {
    return (
      <div className="ticket-perforation bg-[var(--color-accent-soft)] border border-[var(--color-accent)]/30 rounded-t-xl p-6 pb-8 text-center">
        <PharmacyCross className="w-6 h-6 text-[var(--color-accent)] mx-auto mb-3" />
        <p className="font-medium text-[var(--color-ink)]">{confirmation}</p>
        <p className="text-sm text-[var(--color-ink-soft)] mt-2 leading-relaxed">
          Un SMS de confirmation vient de vous être envoyé, avec un lien pour gérer ou annuler
          votre rendez-vous si besoin.
        </p>
      </div>
    )
  }

  return (
    <div>
      <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--color-ink)] mb-5">
        Prendre rendez-vous
      </h2>

      <div className="mb-4">
        <label className="block text-xs uppercase tracking-wide text-[var(--color-ink-soft)] mb-1.5">
          Motif du rendez-vous
        </label>
        <select
          value={typeSelectionne}
          onChange={(e) => {
            setTypeSelectionne(e.target.value)
            setResultatRecherche(null)
            setCreneauSelectionne(null)
          }}
          className={inputClass}
        >
          {typesRdv.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nom} ({t.duree_minutes} min)
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs uppercase tracking-wide text-[var(--color-ink-soft)] mb-1.5">
            Date souhaitée
          </label>
          <input
            type="date"
            value={dateSouhaitee}
            min={format(new Date(), 'yyyy-MM-dd')}
            onChange={(e) => {
              setDateSouhaitee(e.target.value)
              setResultatRecherche(null)
              setCreneauSelectionne(null)
            }}
            className={`${inputClass} font-[family-name:var(--font-mono)]`}
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wide text-[var(--color-ink-soft)] mb-1.5">
            Heure (optionnel)
          </label>
          <input
            type="time"
            value={heureSouhaitee}
            onChange={(e) => {
              setHeureSouhaitee(e.target.value)
              setResultatRecherche(null)
              setCreneauSelectionne(null)
            }}
            className={`${inputClass} font-[family-name:var(--font-mono)]`}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => void lancerRecherche()}
        disabled={rechercheEnCours || !typeSelectionne}
        className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white py-2.5 rounded-lg text-sm font-medium transition-colors mb-6 disabled:opacity-50"
      >
        {rechercheEnCours ? 'Recherche en cours…' : 'Rechercher un créneau'}
      </button>

      {(resultatRecherche?.type === 'meme_jour' || resultatRecherche?.type === 'jour_proche') && (
        <div className="mb-6">
          {resultatRecherche.type === 'jour_proche' && (
            <div className="bg-[var(--color-warning-bg)] rounded-lg p-3 mb-3">
              <p className="text-sm text-[var(--color-warning-text)]">
                Complet le{' '}
                {format(debutDuJourLocal(dateSouhaitee), 'EEEE d MMMM', { locale: fr })}.
                Prochain jour disponible :
              </p>
            </div>
          )}
          <p className="text-xs uppercase tracking-wide text-[var(--color-ink-soft)] mb-2">
            {format(new Date(resultatRecherche.creneaux[0].debut), 'EEEE d MMMM', { locale: fr })}
          </p>
          <div className="flex flex-wrap gap-2">
            {resultatRecherche.creneaux.map((c) => (
              <button
                type="button"
                key={c.id}
                onClick={() => setCreneauSelectionne(c)}
                className={`font-[family-name:var(--font-mono)] px-3 py-1.5 rounded-md border text-sm transition-colors ${
                  creneauSelectionne?.id === c.id
                    ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-white'
                    : 'bg-[var(--color-surface)] border-[var(--color-line)] hover:border-[var(--color-accent)]'
                }`}
              >
                {format(new Date(c.debut), 'HH:mm')}
              </button>
            ))}
          </div>

          {resultatRecherche.type === 'jour_proche' && chargementAlternatives && (
            <p className="text-sm text-[var(--color-ink-soft)] flex items-center gap-2 mt-4">
              <PharmacyCross className="w-4 h-4 text-[var(--color-accent)] animate-pulse-cross" />
              Recherche de pharmacies du groupement à proximité...
            </p>
          )}

          {resultatRecherche.type === 'jour_proche' &&
            !chargementAlternatives &&
            alternatives.length > 0 && (
              <div className="mt-4 pt-4 border-t border-dashed border-[var(--color-line)]">
                <p className="text-sm text-[var(--color-ink-soft)] mb-2">
                  Ou une pharmacie du groupement plus tôt :
                </p>
                <div className="space-y-2">
                  {alternatives.map((alt) => (
                    <a
                      key={alt.pharmacie_id}
                      href={`/pharmacie/${alt.pharmacie_id}`}
                      className="block border border-[var(--color-line)] rounded-lg p-3 hover:border-[var(--color-primary)] transition-colors"
                    >
                      <div className="flex justify-between">
                        <span className="font-medium text-sm text-[var(--color-ink)]">{alt.nom}</span>
                        <span className="font-[family-name:var(--font-mono)] text-xs text-[var(--color-ink-soft)]">
                          {alt.distance_km} km
                        </span>
                      </div>
                      <p className="text-xs text-[var(--color-ink-soft)]">{alt.adresse}</p>
                      <p className="text-xs text-[var(--color-accent)] mt-1">
                        Disponible dès le{' '}
                        {format(new Date(alt.prochain_creneau), "EEEE d MMMM 'à' HH:mm", {
                          locale: fr,
                        })}
                      </p>
                      {alt.creneaux_proches.length > 1 && (
                        <p className="text-xs text-[var(--color-ink-soft)] mt-0.5 font-[family-name:var(--font-mono)]">
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
        </div>
      )}

      {resultatRecherche?.type === 'ferme' && (
        <div className="mb-6">
          <div className="bg-[var(--color-warning-bg)] rounded-lg p-4">
            <p className="text-sm text-[var(--color-warning-text)]">
              Nous sommes fermés le {resultatRecherche.nomJour}. Choisissez une autre date.
            </p>
          </div>
        </div>
      )}

      {resultatRecherche?.type === 'rien' && (
        <div className="mb-6">
          <div className="bg-[var(--color-warning-bg)] rounded-lg p-4 mb-4">
            <p className="text-sm text-[var(--color-warning-text)]">
              Aucune disponibilité proche de cette date pour ce motif dans cette pharmacie.
            </p>
          </div>

          {chargementAlternatives && (
            <p className="text-sm text-[var(--color-ink-soft)] flex items-center gap-2">
              <PharmacyCross className="w-4 h-4 text-[var(--color-accent)] animate-pulse-cross" />
              Recherche de pharmacies du groupement à proximité...
            </p>
          )}

          {!chargementAlternatives && alternatives.length > 0 && (
            <div>
              <p className="text-sm font-medium text-[var(--color-ink)] mb-2">
                Souhaitez-vous être redirigé vers une autre pharmacie du groupement ?
              </p>
              <div className="space-y-2">
                {alternatives.map((alt) => (
                  <a
                    key={alt.pharmacie_id}
                    href={`/pharmacie/${alt.pharmacie_id}`}
                    className="block border border-[var(--color-line)] rounded-lg p-3 hover:border-[var(--color-primary)] transition-colors"
                  >
                    <div className="flex justify-between">
                      <span className="font-medium text-sm text-[var(--color-ink)]">{alt.nom}</span>
                      <span className="font-[family-name:var(--font-mono)] text-xs text-[var(--color-ink-soft)]">
                        {alt.distance_km} km
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-ink-soft)]">{alt.adresse}</p>
                    <p className="text-xs text-[var(--color-accent)] mt-1">
                      Créneau le plus proche :{' '}
                      {format(new Date(alt.prochain_creneau), "EEEE d MMMM 'à' HH:mm", {
                        locale: fr,
                      })}
                    </p>
                    {alt.creneaux_proches.length > 1 && (
                      <p className="text-xs text-[var(--color-ink-soft)] mt-0.5 font-[family-name:var(--font-mono)]">
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
            <p className="text-sm text-[var(--color-ink-soft)]">
              Aucune pharmacie du groupement à proximité n&apos;a de disponibilité. Contactez
              directement la pharmacie.
            </p>
          )}
        </div>
      )}

      {creneauSelectionne && (
        <div className="border-t border-dashed border-[var(--color-line)] pt-5">
          <p className="text-sm font-medium text-[var(--color-ink)] mb-3">
            Créneau choisi :{' '}
            <span className="font-[family-name:var(--font-mono)] text-[var(--color-accent)]">
              {format(new Date(creneauSelectionne.debut), "EEEE d MMMM 'à' HH:mm", { locale: fr })}
            </span>
          </p>

          <div className="space-y-3">
            {clientConnecte ? (
              <div className="rounded-lg border border-[var(--color-line)] bg-[var(--color-bg)] px-3 py-3 text-sm">
                <p className="font-medium text-[var(--color-ink)]">{clientConnecte.nom}</p>
                <p className="text-[var(--color-ink-soft)] font-[family-name:var(--font-mono)] mt-0.5">
                  {clientConnecte.telephone}
                </p>
                <p className="text-xs text-[var(--color-ink-soft)] mt-2">
                  Réservation avec votre compte client.
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Prénom"
                    value={prenom}
                    onChange={(e) => setPrenom(e.target.value)}
                    className={inputClass}
                    autoComplete="given-name"
                  />
                  <input
                    type="text"
                    placeholder="Nom de famille"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    className={inputClass}
                    autoComplete="family-name"
                  />
                </div>
                <input
                  type="tel"
                  placeholder="Votre téléphone"
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  className={inputClass}
                />
              </>
            )}

            {erreur && <p className="text-red-600 text-sm">{erreur}</p>}

            <button
              type="button"
              onClick={reserver}
              disabled={loading}
              className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
            >
              {loading ? 'Réservation...' : 'Confirmer le rendez-vous'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
