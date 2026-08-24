'use client'

import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

type Conversation = {
  id: string
  client_nom?: string
  token_gestion?: string
  creneaux: { debut: string; pharmacies?: { nom: string } | null } | null
  messages: { contenu: string; created_at: string; expediteur: string }[]
}

export default function ListeConversations({
  reservations,
  role,
}: {
  reservations: Conversation[]
  role: 'pharmacie' | 'client'
}) {
  const avecMessages = reservations
    .filter((r) => r.messages && r.messages.length > 0)
    .sort((a, b) => {
      const lastA = Math.max(...a.messages.map((m) => new Date(m.created_at).getTime()))
      const lastB = Math.max(...b.messages.map((m) => new Date(m.created_at).getTime()))
      return lastB - lastA
    })

  if (avecMessages.length === 0) {
    return <p className="text-gray-500 text-sm">Aucune conversation pour le moment.</p>
  }

  return (
    <div className="space-y-2">
      {avecMessages.map((r) => {
        const dernierMessage = [...r.messages].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0]
        const titre = role === 'pharmacie' ? r.client_nom : r.creneaux?.pharmacies?.nom
        const href =
          role === 'pharmacie'
            ? `/dashboard-pharmacie/messages/${r.id}`
            : `/rdv/gestion/${r.token_gestion}`

        return (
          <a key={r.id} href={href} className="block border rounded-lg p-4 hover:bg-gray-50">
            <div className="flex justify-between items-center gap-2">
              <p className="font-medium">{titre ?? 'Conversation'}</p>
              <span className="text-xs text-gray-500 whitespace-nowrap">
                {formatDistanceToNow(new Date(dernierMessage.created_at), {
                  addSuffix: true,
                  locale: fr,
                })}
              </span>
            </div>
            <p className="text-sm text-gray-600 truncate mt-1">{dernierMessage.contenu}</p>
          </a>
        )
      })}
    </div>
  )
}
