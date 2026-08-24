'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

type Message = {
  id: string
  expediteur: 'pharmacie' | 'client'
  contenu: string
  created_at: string
}

export default function MessagerieInvite({
  token,
  embedded = false,
}: {
  token: string
  /** Sans cadre ni titre — pour usage dans une modale */
  embedded?: boolean
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [nouveauMessage, setNouveauMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [chargementInitial, setChargementInitial] = useState(true)

  const chargerMessages = useCallback(async () => {
    const res = await fetch('/api/messages/lister', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    const data = await res.json()
    setMessages(data.messages ?? [])
    setChargementInitial(false)
  }, [token])

  useEffect(() => {
    chargerMessages()
    fetch('/api/messages/marquer-lus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    const interval = setInterval(chargerMessages, 5000)
    return () => clearInterval(interval)
  }, [chargerMessages, token])

  const envoyer = async () => {
    if (!nouveauMessage.trim() || loading) return

    setLoading(true)
    await fetch('/api/messages/envoyer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, contenu: nouveauMessage.trim() }),
    })
    setNouveauMessage('')
    setLoading(false)
    chargerMessages()
  }

  if (chargementInitial) {
    return <p className="text-sm text-gray-500">Chargement des messages...</p>
  }

  return (
    <div className={embedded ? '' : 'border rounded-lg p-4'}>
      {!embedded && <h3 className="font-semibold text-sm mb-3">Messages avec la pharmacie</h3>}

      <div className="space-y-2 max-h-64 overflow-y-auto mb-3">
        {messages.length === 0 && (
          <p className="text-sm text-gray-500">Aucun message pour ce rendez-vous.</p>
        )}
        {messages.map((m) => {
          const estMoi = m.expediteur === 'client'
          return (
            <div key={m.id} className={`flex ${estMoi ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                  estMoi ? 'bg-black text-white' : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p>{m.contenu}</p>
                <p className={`text-xs mt-1 ${estMoi ? 'text-gray-300' : 'text-gray-500'}`}>
                  {formatDistanceToNow(new Date(m.created_at), { addSuffix: true, locale: fr })}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Écrire un message..."
          value={nouveauMessage}
          onChange={(e) => setNouveauMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && envoyer()}
          className="flex-1 border rounded px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={envoyer}
          disabled={loading || !nouveauMessage.trim()}
          className="bg-black text-white px-4 py-2 rounded text-sm disabled:opacity-50"
        >
          Envoyer
        </button>
      </div>
    </div>
  )
}
