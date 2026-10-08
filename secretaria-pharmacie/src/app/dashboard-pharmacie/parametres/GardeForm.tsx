'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

type Periode = { id: string; debut: string; fin: string }

/** Valeur par défaut pour <input type="datetime-local"> : "yyyy-MM-ddTHH:mm" (heure locale). */
function versInputLocal(d: Date) {
  return format(d, "yyyy-MM-dd'T'HH:mm")
}

export default function GardeForm({
  pharmacieId,
  numeroGarde,
  periodes,
}: {
  pharmacieId: string
  numeroGarde: string | null
  periodes: Periode[]
}) {
  const aujourdhui20h = new Date()
  aujourdhui20h.setHours(20, 0, 0, 0)
  const demain8h = new Date(aujourdhui20h)
  demain8h.setDate(demain8h.getDate() + 1)
  demain8h.setHours(8, 0, 0, 0)

  const [debut, setDebut] = useState(versInputLocal(aujourdhui20h))
  const [fin, setFin] = useState(versInputLocal(demain8h))
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState('')
  const [message, setMessage] = useState('')
  const router = useRouter()

  const numeroOk = !!numeroGarde?.trim()
  // eslint-disable-next-line react-hooks/purity -- horodatage d'affichage des périodes en cours
  const maintenant = Date.now()

  const periodesAVenir = periodes
    .filter((p) => new Date(p.fin).getTime() > maintenant)
    .sort((a, b) => new Date(a.debut).getTime() - new Date(b.debut).getTime())

  const ajouter = async () => {
    if (!debut || !fin) {
      setErreur('Choisissez un début et une fin')
      return
    }
    setLoading(true)
    setErreur('')
    setMessage('')

    // new Date("yyyy-MM-ddTHH:mm") est interprété dans le fuseau du navigateur
    // (France pour les pharmaciens), puis converti en UTC pour la base.
    const res = await fetch('/api/pharmacie/garde-periodes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pharmacieId,
        debut: new Date(debut).toISOString(),
        fin: new Date(fin).toISOString(),
      }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setErreur(typeof data.error === 'string' ? data.error : "Erreur lors de l'ajout")
      return
    }

    setMessage('Période de garde programmée ✓')
    router.refresh()
  }

  const supprimer = async (id: string) => {
    setErreur('')
    setMessage('')

    const res = await fetch('/api/pharmacie/garde-periodes', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    const data = await res.json()

    if (!res.ok) {
      setErreur(typeof data.error === 'string' ? data.error : 'Erreur lors de la suppression')
      return
    }

    setMessage('Période retirée ✓')
    router.refresh()
  }

  return (
    <div className="ui-panel p-4 sm:p-5 mb-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-medium text-[var(--color-ink)]">Mode garde</h2>
        <a
          href="/dashboard-pharmacie/aide#garde"
          className="text-xs underline text-[var(--color-ink-soft)]"
        >
          Aide
        </a>
      </div>
      <p className="text-sm text-[var(--color-ink-soft)] mb-4">
        Pendant les périodes programmées ci-dessous, Paul fait le tri entre les vraies urgences
        (transférées à la pharmacie de garde) et les autres appels. En dehors de ces périodes,
        Paul fonctionne normalement.
      </p>

      {!numeroOk ? (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Le numéro de la pharmacie de garde n&apos;est pas encore renseigné. Contactez
          Secretar.IA pour l&apos;activer.
        </div>
      ) : (
        <p className="text-sm mb-4">
          Transfert des urgences vers :{' '}
          <span className="font-[family-name:var(--font-mono)]">{numeroGarde}</span>
        </p>
      )}

      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-3 mb-4">
        <div className="w-full sm:w-auto">
          <label className="ui-label">Début</label>
          <input
            type="datetime-local"
            value={debut}
            onChange={(e) => setDebut(e.target.value)}
            className="ui-input"
            disabled={!numeroOk}
          />
        </div>
        <div className="w-full sm:w-auto">
          <label className="ui-label">Fin</label>
          <input
            type="datetime-local"
            value={fin}
            min={debut}
            onChange={(e) => setFin(e.target.value)}
            className="ui-input"
            disabled={!numeroOk}
          />
        </div>
        <button
          type="button"
          onClick={ajouter}
          disabled={loading || !numeroOk}
          className="ui-btn-primary w-full sm:w-auto disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? 'Enregistrement…' : 'Programmer la garde'}
        </button>
      </div>

      {erreur && <p className="text-red-600 text-sm mb-3">{erreur}</p>}
      {message && <p className="text-sm text-[var(--color-accent)] mb-3">{message}</p>}

      <div className="space-y-1">
        {periodesAVenir.length === 0 && (
          <p className="text-sm text-[var(--color-ink-soft)]">Aucune période de garde programmée.</p>
        )}
        {periodesAVenir.map((p) => {
          const enCours = new Date(p.debut).getTime() <= maintenant
          return (
            <div
              key={p.id}
              className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-sm py-1.5 border-b border-[var(--color-line)] last:border-0 gap-1 sm:gap-3"
            >
              <span>
                {format(new Date(p.debut), "EEE d MMM 'à' HH:mm", { locale: fr })} →{' '}
                {format(new Date(p.fin), "EEE d MMM 'à' HH:mm", { locale: fr })}
              </span>
              <span className="flex items-center gap-3">
                {enCours && (
                  <span className="text-xs font-medium text-amber-900 bg-amber-100 px-2 py-0.5 rounded">
                    En cours
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => supprimer(p.id)}
                  className="text-red-600 text-xs underline shrink-0"
                >
                  {enCours ? 'Arrêter / retirer' : 'Retirer'}
                </button>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
