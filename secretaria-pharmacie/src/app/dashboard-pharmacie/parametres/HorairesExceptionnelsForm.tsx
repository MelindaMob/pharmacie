'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

type Exception = {
  id: string
  date: string
  ferme: boolean
  horaires_speciaux: { debut: string; fin: string } | null
}

export default function HorairesExceptionnelsForm({
  pharmacieId,
  exceptions,
}: {
  pharmacieId: string
  exceptions: Exception[]
}) {
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')
  const [ferme, setFerme] = useState(true)
  const [debut, setDebut] = useState('09:00')
  const [fin, setFin] = useState('19:00')
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState('')
  const [message, setMessage] = useState('')
  const router = useRouter()

  const ajouter = async () => {
    if (!dateDebut) {
      setErreur('Choisissez une date de début')
      return
    }
    const finPlage = dateFin || dateDebut
    if (dateFin && dateFin < dateDebut) {
      setErreur('La date de fin doit être après la date de début')
      return
    }

    setLoading(true)
    setErreur('')
    setMessage('')

    const res = await fetch('/api/pharmacie/horaires-exceptionnels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pharmacieId,
        dateDebut,
        dateFin: finPlage,
        ferme,
        horaires_speciaux: ferme ? null : { debut, fin },
      }),
    })
    const data = await res.json()

    setLoading(false)
    if (!res.ok) {
      setErreur(typeof data.error === 'string' ? data.error : "Erreur lors de l'ajout")
      return
    }

    const nbJours = data.nbJours ?? 1
    const libelleJours = nbJours === 1 ? '1 jour enregistré' : `${nbJours} jours enregistrés`
    const libelleCreneaux =
      typeof data.creneauxCount === 'number'
        ? ` — ${data.creneauxCount} créneaux régénérés ✓`
        : ''
    const avertissement =
      typeof data.warning === 'string' && data.warning
        ? ` (${data.warning})`
        : ''

    setMessage(`${libelleJours}${libelleCreneaux}${avertissement}`)
    setDateDebut('')
    setDateFin('')
    router.refresh()
  }

  const supprimer = async (id: string) => {
    setErreur('')
    setMessage('')

    const res = await fetch('/api/pharmacie/horaires-exceptionnels', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    const data = await res.json()

    if (!res.ok) {
      setErreur(typeof data.error === 'string' ? data.error : 'Erreur lors de la suppression')
      return
    }

    const libelleCreneaux =
      typeof data.creneauxCount === 'number'
        ? `${data.creneauxCount} créneaux régénérés ✓`
        : 'Exception retirée'
    const avertissement =
      typeof data.warning === 'string' && data.warning ? ` (${data.warning})` : ''

    setMessage(`${libelleCreneaux}${avertissement}`)
    router.refresh()
  }

  const exceptionsAVenir = exceptions
    .filter((e) => new Date(e.date) >= new Date(new Date().toDateString()))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const plageMultiple = dateFin && dateFin !== dateDebut

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl p-4 mb-6">
      <h2 className="font-medium text-[var(--color-ink)] mb-1">
        Fermetures et horaires exceptionnels
      </h2>
      <p className="text-sm text-[var(--color-ink-soft)] mb-4">
        Indiquez un jour férié, une fermeture sur plusieurs jours, ou des horaires différents
        pour une période. Les créneaux sont mis à jour automatiquement.
      </p>

      <div className="flex flex-col sm:flex-wrap sm:flex-row sm:items-end gap-3 mb-4">
        <div className="w-full sm:w-auto">
          <label className="ui-label">Du</label>
          <input
            type="date"
            value={dateDebut}
            min={format(new Date(), 'yyyy-MM-dd')}
            onChange={(e) => {
              setDateDebut(e.target.value)
              if (dateFin && e.target.value > dateFin) setDateFin('')
            }}
            className="ui-input"
          />
        </div>

        <div className="w-full sm:w-auto">
          <label className="ui-label">Au (optionnel)</label>
          <input
            type="date"
            value={dateFin}
            min={dateDebut || format(new Date(), 'yyyy-MM-dd')}
            onChange={(e) => setDateFin(e.target.value)}
            className="ui-input"
            placeholder="Même jour si vide"
          />
        </div>

        <div className="flex items-center gap-2 sm:pb-2">
          <input
            type="checkbox"
            id="ferme"
            checked={ferme}
            onChange={(e) => setFerme(e.target.checked)}
          />
          <label htmlFor="ferme" className="text-sm text-[var(--color-ink)]">
            {plageMultiple ? 'Fermé sur toute la période' : 'Fermé ce jour-là'}
          </label>
        </div>

        {!ferme && (
          <>
            <div className="w-full sm:w-auto">
              <label className="ui-label">Ouverture</label>
              <input
                type="time"
                value={debut}
                onChange={(e) => setDebut(e.target.value)}
                className="ui-input"
              />
            </div>
            <div className="w-full sm:w-auto">
              <label className="ui-label">Fermeture</label>
              <input
                type="time"
                value={fin}
                onChange={(e) => setFin(e.target.value)}
                className="ui-input"
              />
            </div>
          </>
        )}

        <button
          type="button"
          onClick={ajouter}
          disabled={loading}
          className="ui-btn-primary w-full sm:w-auto"
        >
          {loading ? 'Enregistrement…' : plageMultiple ? 'Ajouter la période' : 'Ajouter'}
        </button>
      </div>

      {erreur && <p className="text-red-600 text-sm mb-3">{erreur}</p>}
      {message && <p className="text-sm text-[var(--color-accent)] mb-3">{message}</p>}

      <div className="space-y-1">
        {exceptionsAVenir.length === 0 && (
          <p className="text-sm text-[var(--color-ink-soft)]">Aucune exception à venir.</p>
        )}
        {exceptionsAVenir.map((e) => (
          <div
            key={e.id}
            className="flex justify-between items-center text-sm py-1.5 border-b border-[var(--color-line)] last:border-0 gap-3"
          >
            <span className="font-[family-name:var(--font-mono)]">
              {format(new Date(e.date + 'T12:00:00'), 'EEEE d MMMM yyyy', { locale: fr })}
            </span>
            <span className="text-[var(--color-ink-soft)]">
              {e.ferme ? 'Fermé' : `${e.horaires_speciaux?.debut} – ${e.horaires_speciaux?.fin}`}
            </span>
            <button
              type="button"
              onClick={() => supprimer(e.id)}
              className="text-red-600 text-xs underline shrink-0"
            >
              Retirer
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
