'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

type Message = {
  id: string
  expediteur: 'pharmacie' | 'client'
  contenu: string
  created_at: string
  lu: boolean
}

export default function Messagerie({
  reservationId,
  role,
  embedded = false,
}: {
  reservationId: string
  role: 'pharmacie' | 'client'
  embedded?: boolean
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [nouveauMessage, setNouveauMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [chargementInitial, setChargementInitial] = useState(true)

  const chargerMessages = useCallback(async () => {
    // Côté pharmacie : API service role (RLS messages souvent fermée)
    if (role === 'pharmacie') {
      const res = await fetch('/api/messages/pharmacie/lister', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservationId }),
      })
      const data = await res.json()
      setMessages(data.messages ?? [])
    } else {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data } = await supabase
        .from('messages')
        .select('id, expediteur, contenu, created_at, lu')
        .eq('reservation_id', reservationId)
        .order('created_at', { ascending: true })
      setMessages(data ?? [])
    }

    setChargementInitial(false)

    await fetch('/api/messages/marquer-lus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reservationId }),
    })
  }, [reservationId, role])

  useEffect(() => {
    chargerMessages()
    const interval = setInterval(chargerMessages, 5000)
    return () => clearInterval(interval)
  }, [chargerMessages])

  const envoyer = async () => {
    if (!nouveauMessage.trim() || loading) return

    setLoading(true)
    const contenu = nouveauMessage.trim()

    if (role === 'pharmacie') {
      await fetch('/api/messages/pharmacie/envoyer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservationId, contenu }),
      })
    } else {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      await supabase.from('messages').insert({
        reservation_id: reservationId,
        expediteur: role,
        contenu,
        lu: false,
      })
    }

    setNouveauMessage('')
    setLoading(false)
    await chargerMessages()
  }

  if (chargementInitial) {
    return <p className="text-sm text-gray-500">Chargement des messages...</p>
  }

  return (
    <div className={embedded ? '' : 'border rounded-lg p-4'}>
      {!embedded && <h3 className="font-semibold text-sm mb-3">Messages</h3>}

      <div className="space-y-2 max-h-64 overflow-y-auto mb-3">
        {messages.length === 0 && (
          <p className="text-sm text-gray-500">Aucun message pour ce rendez-vous.</p>
        )}
        {messages.map((m) => {
          const estMoi = m.expediteur === role
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
