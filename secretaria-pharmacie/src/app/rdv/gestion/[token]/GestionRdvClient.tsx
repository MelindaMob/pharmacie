'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'
import MessagerieInvite from '@/components/MessagerieInvite'

type Reservation = {
  id: string
  statut: string
  client_nom: string
  creneaux: {
    debut: string
    pharmacies: {
      nom: string
      adresse: string
      telephone: string
    } | null
  } | null
}

export default function GestionRdvClient({
  reservation,
  token,
}: {
  reservation: Reservation
  token: string
}) {
  const [statut, setStatut] = useState(reservation.statut)
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState('')
  const [messagerieOuverte, setMessagerieOuverte] = useState(false)
  const [estConnecte, setEstConnecte] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => setEstConnecte(!!data.session))
  }, [])

  const creneau = reservation.creneaux
  const pharmacie = creneau?.pharmacies

  const annuler = async () => {
    if (!confirm("Confirmer l'annulation de ce rendez-vous ?")) return

    setLoading(true)
    setErreur('')

    const res = await fetch('/api/annuler-rdv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    const data = await res.json()

    setLoading(false)
    if (data.error) setErreur(data.error)
    else setStatut('annule')
  }

  if (statut === 'annule') {
    return (
      <div className="max-w-md mx-auto p-6 text-center">
        <p className="text-lg font-semibold text-[var(--color-ink)]">Rendez-vous annulé</p>
        <p className="text-[var(--color-ink-soft)] mt-2">Ce créneau a été libéré.</p>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <a
        href={estConnecte ? '/dashboard-client' : '/'}
        className="text-sm text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] mb-4 inline-block"
      >
        {estConnecte ? '← Mes rendez-vous' : '← Secretar.IA Pharmacie'}
      </a>
      <h1 className="font-[family-name:var(--font-display)] text-xl text-[var(--color-ink)] mb-4">
        Votre rendez-vous
      </h1>

      <div className="border border-[var(--color-line)] rounded-lg p-4 mb-4 bg-[var(--color-surface)]">
        <p className="font-semibold text-[var(--color-ink)]">{pharmacie?.nom}</p>
        <p className="text-sm text-[var(--color-ink-soft)]">{pharmacie?.adresse}</p>
        <p className="text-sm text-[var(--color-ink-soft)] mb-3">{pharmacie?.telephone}</p>
        <p className="text-sm font-[family-name:var(--font-mono)] text-[var(--color-ink)]">
          {format(new Date(creneau!.debut), "EEEE d MMMM 'à' HH:mm", { locale: fr })}
        </p>
      </div>

      <button
        type="button"
        onClick={() => setMessagerieOuverte(true)}
        className="w-full mb-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
      >
        Envoyer un message
      </button>

      {erreur && <p className="text-red-600 text-sm mb-3">{erreur}</p>}

      <button
        type="button"
        onClick={annuler}
        disabled={loading}
        className="w-full border border-red-600 text-red-600 py-2.5 rounded-lg text-sm disabled:opacity-50"
      >
        {loading ? 'Annulation...' : 'Annuler le rendez-vous'}
      </button>

      {messagerieOuverte && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
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
              Discussion avec {pharmacie?.nom ?? 'la pharmacie'}
            </p>
            <MessagerieInvite token={token} embedded />
          </div>
        </div>
      )}
    </div>
  )
}
