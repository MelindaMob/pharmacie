'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type Fenetre = { id: string; jour: string; debut: string; fin: string }
type Exception = {
  id: string
  date_debut: string
  date_fin: string
  ferme: boolean
  debut: string | null
  fin: string | null
}

const JOURS = [
  { key: 'lundi', label: 'Lundi' },
  { key: 'mardi', label: 'Mardi' },
  { key: 'mercredi', label: 'Mercredi' },
  { key: 'jeudi', label: 'Jeudi' },
  { key: 'vendredi', label: 'Vendredi' },
  { key: 'samedi', label: 'Samedi' },
  { key: 'dimanche', label: 'Dimanche' },
]

/** Pas de plafond ici (contrairement aux 2 plages/jour des horaires généraux) :
 * un type de RDV peut avoir autant de plages que nécessaire sur une journée. */
type Plage = { debut: string; fin: string }
type Grille = Record<string, Plage[]> // jour -> plages (tableau vide = pas de fenêtre spécifique ce jour-là)

const PLAGE_DEFAUT: Plage = { debut: '10:00', fin: '12:00' }

function versGrille(fenetres: Fenetre[]): Grille {
  const grille: Grille = {}
  for (const { key } of JOURS) grille[key] = []
  for (const f of fenetres) {
    if (!grille[f.jour]) grille[f.jour] = []
    grille[f.jour].push({ debut: f.debut.slice(0, 5), fin: f.fin.slice(0, 5) })
  }
  return grille
}

function grillesEgales(a: Grille, b: Grille) {
  return JSON.stringify(a) === JSON.stringify(b)
}

export default function TypeRdvFenetresForm({
  pharmacieId,
  typeRdvId,
  fenetresInitiales,
  exceptionsInitiales,
}: {
  pharmacieId: string
  typeRdvId: string
  fenetresInitiales: Fenetre[]
  exceptionsInitiales: Exception[]
}) {
  const [grille, setGrille] = useState<Grille>(() => versGrille(fenetresInitiales))
  const [grilleSauvegardee, setGrilleSauvegardee] = useState<Grille>(() =>
    versGrille(fenetresInitiales)
  )
  const [saving, setSaving] = useState(false)

  const [exceptions, setExceptions] = useState(exceptionsInitiales)
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')
  const [exceptionFerme, setExceptionFerme] = useState(true)
  const [exceptionDebut, setExceptionDebut] = useState('10:00')
  const [exceptionFin, setExceptionFin] = useState('12:00')
  const [ajoutExceptionEnCours, setAjoutExceptionEnCours] = useState(false)

  const [message, setMessage] = useState('')
  const [erreur, setErreur] = useState('')
  const router = useRouter()

  const dirty = useMemo(() => !grillesEgales(grille, grilleSauvegardee), [grille, grilleSauvegardee])

  const toggleJour = (jour: string) => {
    setGrille((prev) => ({
      ...prev,
      [jour]: prev[jour].length > 0 ? [] : [{ ...PLAGE_DEFAUT }],
    }))
  }

  const ajouterPlage = (jour: string) => {
    setGrille((prev) => {
      const plages = prev[jour] ?? []
      const derniere = plages[plages.length - 1]
      // Suggestion : juste après la dernière plage du jour, sinon la plage par défaut.
      const suggestion =
        derniere && derniere.fin <= '18:00'
          ? { debut: derniere.fin, fin: '19:00' }
          : { ...PLAGE_DEFAUT }
      return { ...prev, [jour]: [...plages, suggestion] }
    })
  }

  const retirerPlage = (jour: string, index: number) => {
    setGrille((prev) => ({
      ...prev,
      [jour]: prev[jour].filter((_, i) => i !== index),
    }))
  }

  const updatePlage = (jour: string, index: number, champ: 'debut' | 'fin', valeur: string) => {
    setGrille((prev) => {
      const plages = [...prev[jour]]
      plages[index] = { ...plages[index], [champ]: valeur }
      return { ...prev, [jour]: plages }
    })
  }

  /** Copie les plages du jour donné sur tous les autres jours, comme pour
   * les horaires généraux de la pharmacie. */
  const copierSurTousLesJours = (jourSource: string) => {
    const plagesSource = grille[jourSource]
    if (!plagesSource || plagesSource.length === 0) return
    setGrille((prev) => {
      const next = { ...prev }
      for (const { key } of JOURS) {
        if (key === jourSource) continue
        next[key] = plagesSource.map((p) => ({ ...p }))
      }
      return next
    })
  }

  const enregistrer = async () => {
    if (!dirty || saving) return
    setSaving(true)
    setErreur('')
    setMessage('')

    const fenetresAEnvoyer = JOURS.flatMap(({ key }) =>
      grille[key].map((p) => ({ jour: key, debut: p.debut, fin: p.fin }))
    )

    const res = await fetch('/api/pharmacie/types-rdv-horaires', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pharmacieId, typeRdvId, fenetres: fenetresAEnvoyer }),
    })
    const data = await res.json()
    setSaving(false)

    if (!res.ok) {
      setErreur(typeof data.error === 'string' ? data.error : "Erreur lors de l'enregistrement")
      return
    }

    const grilleFinale = versGrille(data.fenetres ?? [])
    setGrille(grilleFinale)
    setGrilleSauvegardee(grilleFinale)
    setMessage(`Créneaux spécifiques enregistrés — ${data.creneauxCount} créneaux régénérés ✓`)
    router.refresh()
  }

  const ajouterException = async () => {
    if (!dateDebut) {
      setErreur('Choisissez une date de début')
      return
    }
    setAjoutExceptionEnCours(true)
    setErreur('')
    setMessage('')

    const res = await fetch('/api/pharmacie/types-rdv-exceptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pharmacieId,
        typeRdvId,
        dateDebut,
        dateFin: dateFin || dateDebut,
        ferme: exceptionFerme,
        debut: exceptionFerme ? null : exceptionDebut,
        fin: exceptionFerme ? null : exceptionFin,
      }),
    })
    const data = await res.json()
    setAjoutExceptionEnCours(false)

    if (!res.ok) {
      setErreur(typeof data.error === 'string' ? data.error : "Erreur lors de l'ajout")
      return
    }

    setExceptions((prev) => [...prev, data.exception])
    setDateDebut('')
    setDateFin('')
    setMessage(`Dérogation ajoutée — ${data.creneauxCount} créneaux régénérés ✓`)
    router.refresh()
  }

  const retirerException = async (id: string) => {
    setErreur('')
    setMessage('')

    const res = await fetch('/api/pharmacie/types-rdv-exceptions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, pharmacieId }),
    })
    const data = await res.json()

    if (!res.ok) {
      setErreur(typeof data.error === 'string' ? data.error : 'Erreur lors de la suppression')
      return
    }

    setExceptions((prev) => prev.filter((e) => e.id !== id))
    setMessage(`Dérogation retirée — ${data.creneauxCount} créneaux régénérés ✓`)
    router.refresh()
  }

  return (
    <div className="mt-2 mb-1 pl-4 border-l-2 border-gray-200 space-y-4">
      <div>
        <p className="text-xs font-medium text-gray-600 mb-2">
          Créneaux hebdomadaires spécifiques (optionnel) — laissez tout décoché pour proposer ce
          type sur toute l&apos;amplitude d&apos;ouverture de la pharmacie.
        </p>

        <div className="space-y-2">
          {JOURS.map(({ key, label }) => {
            const plages = grille[key] ?? []
            const actif = plages.length > 0
            return (
              <div
                key={key}
                className="flex flex-col gap-1.5 py-1.5 border-b border-gray-100 last:border-0"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
                  <label className="flex items-center gap-2 sm:w-24 shrink-0 text-xs">
                    <input
                      type="checkbox"
                      checked={actif}
                      onChange={() => toggleJour(key)}
                      className="rounded border-gray-300"
                    />
                    {label}
                  </label>

                  {!actif && (
                    <span className="pl-6 sm:pl-0 text-[11px] text-gray-400">Aucun</span>
                  )}

                  {actif && (
                    <div className="flex flex-col gap-1.5 pl-6 sm:pl-0">
                      {plages.map((plage, index) => (
                        <div key={index} className="flex items-center gap-1.5">
                          <input
                            type="time"
                            value={plage.debut}
                            onChange={(e) => updatePlage(key, index, 'debut', e.target.value)}
                            className="border rounded px-2 py-1 text-xs"
                          />
                          <span className="text-[11px] text-gray-500">à</span>
                          <input
                            type="time"
                            value={plage.fin}
                            onChange={(e) => updatePlage(key, index, 'fin', e.target.value)}
                            className="border rounded px-2 py-1 text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => retirerPlage(key, index)}
                            className="text-red-600 text-[11px] underline shrink-0"
                          >
                            Retirer
                          </button>
                        </div>
                      ))}
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => ajouterPlage(key)}
                          className="text-[11px] underline text-gray-500 w-fit py-1"
                        >
                          + Ajouter une plage
                        </button>
                        <button
                          type="button"
                          onClick={() => copierSurTousLesJours(key)}
                          className="text-[11px] underline text-gray-500 w-fit py-1"
                        >
                          Copier sur tous les jours
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <button
          type="button"
          onClick={() => void enregistrer()}
          disabled={saving || !dirty}
          className="mt-3 text-xs bg-black text-white px-3 py-1.5 rounded disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? 'Enregistrement...' : 'Enregistrer les créneaux spécifiques'}
        </button>
      </div>

      <div>
        <p className="text-xs font-medium text-gray-600 mb-1">
          Dérogation exceptionnelle sur une période (optionnel)
        </p>
        {exceptions.length > 0 && (
          <ul className="space-y-1 mb-2">
            {exceptions.map((e) => (
              <li key={e.id} className="flex items-center justify-between text-xs">
                <span>
                  Du {e.date_debut} au {e.date_fin} :{' '}
                  {e.ferme ? 'fermé' : `${e.debut?.slice(0, 5)}–${e.fin?.slice(0, 5)}`}
                </span>
                <button
                  type="button"
                  onClick={() => retirerException(e.id)}
                  className="text-red-600 underline"
                >
                  Retirer
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={dateDebut}
            onChange={(e) => setDateDebut(e.target.value)}
            className="border rounded px-2 py-1 text-xs"
          />
          <span className="text-xs text-gray-500">au</span>
          <input
            type="date"
            value={dateFin}
            onChange={(e) => setDateFin(e.target.value)}
            placeholder="même jour si vide"
            className="border rounded px-2 py-1 text-xs"
          />
          <label className="flex items-center gap-1 text-xs">
            <input
              type="checkbox"
              checked={exceptionFerme}
              onChange={(e) => setExceptionFerme(e.target.checked)}
            />
            Fermé sur cette période
          </label>
          {!exceptionFerme && (
            <>
              <input
                type="time"
                value={exceptionDebut}
                onChange={(e) => setExceptionDebut(e.target.value)}
                className="border rounded px-2 py-1 text-xs"
              />
              <span className="text-xs text-gray-500">à</span>
              <input
                type="time"
                value={exceptionFin}
                onChange={(e) => setExceptionFin(e.target.value)}
                className="border rounded px-2 py-1 text-xs"
              />
            </>
          )}
          <button
            type="button"
            onClick={ajouterException}
            disabled={ajoutExceptionEnCours}
            className="text-xs bg-black text-white px-2 py-1 rounded disabled:opacity-50"
          >
            {ajoutExceptionEnCours ? '…' : '+ Ajouter'}
          </button>
        </div>
      </div>

      {erreur && <p className="text-xs text-red-600">{erreur}</p>}
      {message && <p className="text-xs text-green-700">{message}</p>}
    </div>
  )
}
