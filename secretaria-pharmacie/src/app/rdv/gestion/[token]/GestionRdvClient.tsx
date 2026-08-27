'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
      delai_annulation_heures?: number
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
  const router = useRouter()
  const [statut, setStatut] = useState(reservation.statut)
  const [debut, setDebut] = useState(reservation.creneaux?.debut ?? '')
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState('')
  const [messagerieOuverte, setMessagerieOuverte] = useState(false)
  const [modeDeplacement, setModeDeplacement] = useState(false)
  const [creneauxDispo, setCreneauxDispo] = useState<{ id: string; debut: string }[]>([])
  const [chargementCreneaux, setChargementCreneaux] = useState(false)
  const [estConnecte, setEstConnecte] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => setEstConnecte(!!data.session))
  }, [])

  useEffect(() => {
    setStatut(reservation.statut)
    setDebut(reservation.creneaux?.debut ?? '')
  }, [reservation])

  useEffect(() => {
    if (!modeDeplacement) return
    let annule = false
    const charger = async () => {
      setChargementCreneaux(true)
      setErreur('')
      const res = await fetch('/api/rdv/creneaux-disponibles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json()
      if (!annule) {
        setChargementCreneaux(false)
        if (data.error) {
          setErreur(data.error)
          setCreneauxDispo([])
        } else {
          setCreneauxDispo(data.creneaux ?? [])
        }
      }
    }
    void charger()
    return () => {
      annule = true
    }
  }, [modeDeplacement, token])

  const pharmacie = reservation.creneaux?.pharmacies

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

  const deplacer = async (nouveauCreneauId: string) => {
    setLoading(true)
    setErreur('')

    const res = await fetch('/api/deplacer-rdv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, nouveauCreneauId }),
    })
    const data = await res.json()
    setLoading(false)

    if (data.error) {
      setErreur(data.error)
      return
    }

    if (data.debut) setDebut(data.debut)
    setModeDeplacement(false)
    setCreneauxDispo([])
    router.refresh()
  }

  if (statut === 'annule') {
    return (
      <div className="max-w-md mx-auto px-4 py-8 sm:p-6 text-center">
        <p className="text-lg font-semibold text-[var(--color-ink)]">Rendez-vous annulé</p>
        <p className="text-[var(--color-ink-soft)] mt-2">Ce créneau a été libéré.</p>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 py-6 sm:p-6">
      <a
        href={estConnecte ? '/dashboard-client' : '/'}
        className="text-sm text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] mb-4 inline-block"
      >
        {estConnecte ? '← Mes rendez-vous' : '← Secretar.IA Pharmacie'}
      </a>
      <h1 className="font-[family-name:var(--font-display)] text-xl text-[var(--color-ink)] mb-4">
        Votre rendez-vous
      </h1>

      <div className="ui-panel p-4 mb-4">
        <p className="font-semibold text-[var(--color-ink)]">{pharmacie?.nom}</p>
        <p className="text-sm text-[var(--color-ink-soft)] break-words">{pharmacie?.adresse}</p>
        <p className="text-sm text-[var(--color-ink-soft)] mb-3">{pharmacie?.telephone}</p>
        <p className="text-sm font-[family-name:var(--font-mono)] text-[var(--color-ink)]">
          {debut
            ? format(new Date(debut), "EEEE d MMMM 'à' HH:mm", { locale: fr })
            : '—'}
        </p>
      </div>

      {!modeDeplacement ? (
        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <button
            type="button"
            onClick={() => setModeDeplacement(true)}
            disabled={loading}
            className="ui-btn-ghost flex-1 !py-2.5"
          >
            Déplacer
          </button>
          <button
            type="button"
            onClick={() => setMessagerieOuverte(true)}
            className="ui-btn-primary flex-1"
          >
            Envoyer un message
          </button>
        </div>
      ) : (
        <div className="ui-panel p-4 mb-3">
          <p className="text-sm font-medium text-[var(--color-ink)] mb-2">
            Choisir un nouveau créneau
          </p>
          {chargementCreneaux ? (
            <p className="text-xs text-[var(--color-ink-soft)]">Chargement…</p>
          ) : creneauxDispo.length === 0 ? (
            <p className="text-xs text-[var(--color-ink-soft)]">
              Aucun autre créneau disponible pour ce motif.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2 mb-2">
              {creneauxDispo.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => deplacer(c.id)}
                  disabled={loading}
                  className="font-[family-name:var(--font-mono)] text-xs border border-[var(--color-line)] rounded-lg px-2.5 py-1.5 hover:border-[var(--color-primary)] disabled:opacity-50"
                >
                  {format(new Date(c.debut), 'd MMM HH:mm', { locale: fr })}
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              setModeDeplacement(false)
              setErreur('')
            }}
            className="text-xs text-[var(--color-ink-soft)] underline mt-1"
          >
            Retour
          </button>
        </div>
      )}

      {erreur && <p className="text-red-600 text-sm mb-3">{erreur}</p>}

      {!modeDeplacement && (
        <button
          type="button"
          onClick={annuler}
          disabled={loading}
          className="w-full border border-red-600 text-red-600 py-2.5 rounded-xl text-sm disabled:opacity-50"
        >
          {loading ? 'Annulation...' : 'Annuler le rendez-vous'}
        </button>
      )}

      {messagerieOuverte && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-[var(--color-surface)] rounded-t-2xl sm:rounded-2xl p-5 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-xl">
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
