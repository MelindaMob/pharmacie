'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
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
  const [date, setDate] = useState('')
  const [ferme, setFerme] = useState(true)
  const [debut, setDebut] = useState('09:00')
  const [fin, setFin] = useState('19:00')
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState('')
  const router = useRouter()

  const ajouter = async () => {
    if (!date) {
      setErreur('Choisissez une date')
      return
    }
    setLoading(true)
    setErreur('')
    const supabase = createClient()

    const { error } = await supabase.from('horaires_exceptionnels').insert({
      pharmacie_id: pharmacieId,
      date,
      ferme,
      horaires_speciaux: ferme ? null : { debut, fin },
    })

    setLoading(false)
    if (error) {
      setErreur('Erreur : cette date a peut-être déjà une exception enregistrée')
      return
    }
    setDate('')
    router.refresh()
  }

  const supprimer = async (id: string) => {
    const supabase = createClient()
    await supabase.from('horaires_exceptionnels').delete().eq('id', id)
    router.refresh()
  }

  const exceptionsAVenir = exceptions
    .filter((e) => new Date(e.date) >= new Date(new Date().toDateString()))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl p-4 mb-6">
      <h2 className="font-medium text-[var(--color-ink)] mb-1">
        Fermetures et horaires exceptionnels
      </h2>
      <p className="text-sm text-[var(--color-ink-soft)] mb-4">
        Indiquez un jour férié, une fermeture imprévue, ou des horaires différents pour une date
        précise. Pensez à relancer la génération des créneaux après ajout.
      </p>

      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div>
          <label className="block text-xs uppercase tracking-wide text-[var(--color-ink-soft)] mb-1.5">
            Date
          </label>
          <input
            type="date"
            value={date}
            min={format(new Date(), 'yyyy-MM-dd')}
            onChange={(e) => setDate(e.target.value)}
            className="border border-[var(--color-line)] rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div className="flex items-center gap-2 pb-2">
          <input
            type="checkbox"
            id="ferme"
            checked={ferme}
            onChange={(e) => setFerme(e.target.checked)}
          />
          <label htmlFor="ferme" className="text-sm text-[var(--color-ink)]">
            Fermé ce jour-là
          </label>
        </div>

        {!ferme && (
          <>
            <div>
              <label className="block text-xs uppercase tracking-wide text-[var(--color-ink-soft)] mb-1.5">
                Ouverture
              </label>
              <input
                type="time"
                value={debut}
                onChange={(e) => setDebut(e.target.value)}
                className="border border-[var(--color-line)] rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wide text-[var(--color-ink-soft)] mb-1.5">
                Fermeture
              </label>
              <input
                type="time"
                value={fin}
                onChange={(e) => setFin(e.target.value)}
                className="border border-[var(--color-line)] rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </>
        )}

        <button
          type="button"
          onClick={ajouter}
          disabled={loading}
          className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50"
        >
          Ajouter
        </button>
      </div>

      {erreur && <p className="text-red-600 text-sm mb-3">{erreur}</p>}

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
