'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

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
        <p className="text-lg font-semibold">Rendez-vous annulé</p>
        <p className="text-gray-600 mt-2">Ce créneau a été libéré.</p>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-xl font-bold mb-4">Votre rendez-vous</h1>

      <div className="border rounded-lg p-4 mb-6">
        <p className="font-semibold">{pharmacie?.nom}</p>
        <p className="text-sm text-gray-600">{pharmacie?.adresse}</p>
        <p className="text-sm text-gray-600 mb-3">{pharmacie?.telephone}</p>
        <p className="text-sm">
          <strong>
            Le {format(new Date(creneau!.debut), "EEEE d MMMM 'à' HH:mm", { locale: fr })}
          </strong>
        </p>
      </div>

      {erreur && <p className="text-red-600 text-sm mb-3">{erreur}</p>}

      <button
        onClick={annuler}
        disabled={loading}
        className="w-full border border-red-600 text-red-600 py-2 rounded disabled:opacity-50"
      >
        {loading ? 'Annulation...' : 'Annuler le rendez-vous'}
      </button>
    </div>
  )
}
