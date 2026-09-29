'use client'

import { useState } from 'react'
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

function libelleJour(jour: string) {
  return JOURS.find((j) => j.key === jour)?.label ?? jour
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
  const [fenetres, setFenetres] = useState(fenetresInitiales)
  const [exceptions, setExceptions] = useState(exceptionsInitiales)
  const [jour, setJour] = useState('mardi')
  const [debut, setDebut] = useState('10:00')
  const [fin, setFin] = useState('12:00')
  const [ajoutFenetreEnCours, setAjoutFenetreEnCours] = useState(false)

  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')
  const [exceptionFerme, setExceptionFerme] = useState(true)
  const [exceptionDebut, setExceptionDebut] = useState('10:00')
  const [exceptionFin, setExceptionFin] = useState('12:00')
  const [ajoutExceptionEnCours, setAjoutExceptionEnCours] = useState(false)

  const [message, setMessage] = useState('')
  const [erreur, setErreur] = useState('')
  const router = useRouter()

  const ajouterFenetre = async () => {
    setAjoutFenetreEnCours(true)
    setErreur('')
    setMessage('')

    const res = await fetch('/api/pharmacie/types-rdv-horaires', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pharmacieId, typeRdvId, jour, debut, fin }),
    })
    const data = await res.json()
    setAjoutFenetreEnCours(false)

    if (!res.ok) {
      setErreur(typeof data.error === 'string' ? data.error : "Erreur lors de l'ajout")
      return
    }

    setFenetres((prev) => [...prev, data.fenetre])
    setMessage(`Fenêtre ajoutée — ${data.creneauxCount} créneaux régénérés ✓`)
    router.refresh()
  }

  const retirerFenetre = async (id: string) => {
    setErreur('')
    setMessage('')

    const res = await fetch('/api/pharmacie/types-rdv-horaires', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, pharmacieId }),
    })
    const data = await res.json()

    if (!res.ok) {
      setErreur(typeof data.error === 'string' ? data.error : 'Erreur lors de la suppression')
      return
    }

    setFenetres((prev) => prev.filter((f) => f.id !== id))
    setMessage(`Fenêtre retirée — ${data.creneauxCount} créneaux régénérés ✓`)
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
        <p className="text-xs font-medium text-gray-600 mb-1">
          Fenêtres hebdomadaires (optionnel)
        </p>
        {fenetres.length === 0 ? (
          <p className="text-xs text-gray-500 mb-2">
            Aucune fenêtre définie : ce type reste proposé sur toute l&apos;amplitude
            d&apos;ouverture de la pharmacie.
          </p>
        ) : (
          <ul className="space-y-1 mb-2">
            {fenetres.map((f) => (
              <li key={f.id} className="flex items-center justify-between text-xs">
                <span>
                  {libelleJour(f.jour)} {f.debut.slice(0, 5)}–{f.fin.slice(0, 5)}
                </span>
                <button
                  type="button"
                  onClick={() => retirerFenetre(f.id)}
                  className="text-red-600 underline"
                >
                  Retirer
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={jour}
            onChange={(e) => setJour(e.target.value)}
            className="border rounded px-2 py-1 text-xs"
          >
            {JOURS.map((j) => (
              <option key={j.key} value={j.key}>
                {j.label}
              </option>
            ))}
          </select>
          <input
            type="time"
            value={debut}
            onChange={(e) => setDebut(e.target.value)}
            className="border rounded px-2 py-1 text-xs"
          />
          <span className="text-xs text-gray-500">à</span>
          <input
            type="time"
            value={fin}
            onChange={(e) => setFin(e.target.value)}
            className="border rounded px-2 py-1 text-xs"
          />
          <button
            type="button"
            onClick={ajouterFenetre}
            disabled={ajoutFenetreEnCours}
            className="text-xs bg-black text-white px-2 py-1 rounded disabled:opacity-50"
          >
            {ajoutFenetreEnCours ? '…' : '+ Ajouter'}
          </button>
        </div>
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
