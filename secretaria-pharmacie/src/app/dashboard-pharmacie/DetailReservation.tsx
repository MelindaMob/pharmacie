'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import Messagerie from '@/components/Messagerie'

function labelCanal(c?: string) {
  if (c === 'vocal') return '📞 Pris par téléphone (Paul)'
  if (c === 'manuel') return '✍️ Ajouté manuellement'
  return '💻 Pris en ligne'
}

export default function DetailReservation({
  reservationId,
  clientNom,
  clientTelephone,
  clientEmail,
  typeRdv,
  typeRdvId,
  pharmacieId,
  dateHeure,
  canal,
  onClose,
}: {
  reservationId: string
  clientNom: string
  clientTelephone: string
  clientEmail?: string | null
  typeRdv: string
  typeRdvId: string
  pharmacieId: string
  dateHeure: string
  canal?: string
  onClose: () => void
}) {
  const [modeDeplacement, setModeDeplacement] = useState(false)
  const [creneauxDispo, setCreneauxDispo] = useState<{ id: string; debut: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messagerieOuverte, setMessagerieOuverte] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (!modeDeplacement) return
    const charger = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('creneaux')
        .select('id, debut')
        .eq('pharmacie_id', pharmacieId)
        .eq('type_rdv_id', typeRdvId)
        .eq('statut', 'disponible')
        .gt('debut', new Date().toISOString())
        .order('debut', { ascending: true })
        .limit(20)
      setCreneauxDispo(data ?? [])
    }
    charger()
  }, [modeDeplacement, pharmacieId, typeRdvId])

  const deplacer = async (nouveauCreneauId: string) => {
    setLoading(true)
    setMessage('')
    const res = await fetch('/api/pharmacie/deplacer-rdv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reservationId, nouveauCreneauId }),
    })
    const data = await res.json()
    setLoading(false)

    if (data.error) {
      setMessage(data.error)
      return
    }
    onClose()
    router.refresh()
  }

  const annuler = async () => {
    if (!confirm('Annuler ce rendez-vous ?')) return
    setLoading(true)
    const res = await fetch('/api/pharmacie/annuler-rdv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reservationId }),
    })
    const data = await res.json()
    setLoading(false)

    if (data.error) {
      setMessage(data.error)
      return
    }
    onClose()
    router.refresh()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--color-surface)] rounded-xl p-6 max-w-md w-full max-h-[85vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-[family-name:var(--font-display)] text-lg text-[var(--color-ink)]">
            Rendez-vous
          </h2>
          <button type="button" onClick={onClose} className="text-[var(--color-ink-soft)]">
            ✕
          </button>
        </div>

        <div className="bg-[var(--color-bg)] rounded-lg p-3 mb-4 space-y-1 text-sm">
          <p>
            <span className="text-[var(--color-ink-soft)]">Client :</span>{' '}
            <strong>{clientNom}</strong>
          </p>
          <p>
            <span className="text-[var(--color-ink-soft)]">Téléphone :</span> {clientTelephone}
          </p>
          {clientEmail && (
            <p>
              <span className="text-[var(--color-ink-soft)]">Email :</span> {clientEmail}
            </p>
          )}
          <p>
            <span className="text-[var(--color-ink-soft)]">Motif :</span> {typeRdv}
          </p>
          <p>
            <span className="text-[var(--color-ink-soft)]">Créneau :</span>{' '}
            <span className="font-[family-name:var(--font-mono)]">{dateHeure}</span>
          </p>
          <p className="text-xs text-[var(--color-ink-soft)] pt-1">{labelCanal(canal)}</p>
        </div>

        {!modeDeplacement ? (
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setModeDeplacement(true)}
              className="flex-1 border border-[var(--color-line)] py-2 rounded-lg text-sm"
            >
              Déplacer
            </button>
            <button
              type="button"
              onClick={annuler}
              disabled={loading}
              className="flex-1 border border-red-300 text-red-600 py-2 rounded-lg text-sm disabled:opacity-50"
            >
              Annuler le RDV
            </button>
          </div>
        ) : (
          <div className="mb-4">
            <p className="text-sm font-medium mb-2">Choisir un nouveau créneau :</p>
            <div className="flex flex-wrap gap-2 mb-2">
              {creneauxDispo.length === 0 ? (
                <p className="text-xs text-[var(--color-ink-soft)]">Aucun créneau disponible.</p>
              ) : (
                creneauxDispo.map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => deplacer(c.id)}
                    disabled={loading}
                    className="font-[family-name:var(--font-mono)] text-xs border border-[var(--color-line)] rounded px-2 py-1 hover:border-[var(--color-primary)] disabled:opacity-50"
                  >
                    {format(new Date(c.debut), 'd MMM HH:mm', { locale: fr })}
                  </button>
                ))
              )}
            </div>
            {message && <p className="text-red-600 text-xs mb-1">{message}</p>}
            <button
              type="button"
              onClick={() => setModeDeplacement(false)}
              className="text-xs text-[var(--color-ink-soft)] underline"
            >
              Retour
            </button>
          </div>
        )}

        {message && !modeDeplacement && (
          <p className="text-red-600 text-xs mb-3">{message}</p>
        )}

        <button
          type="button"
          onClick={() => setMessagerieOuverte(true)}
          className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          Envoyer un message
        </button>
      </div>

      {messagerieOuverte && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4">
          <div className="bg-[var(--color-surface)] rounded-xl p-5 max-w-md w-full max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-[family-name:var(--font-display)] text-lg text-[var(--color-ink)]">
                Messages
              </h2>
              <button
                type="button"
                onClick={() => setMessagerieOuverte(false)}
                className="text-[var(--color-ink-soft)] text-lg leading-none px-1"
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-[var(--color-ink-soft)] mb-3">
              Discussion avec {clientNom}
            </p>
            <Messagerie reservationId={reservationId} role="pharmacie" embedded />
          </div>
        </div>
      )}
    </div>
  )
}
