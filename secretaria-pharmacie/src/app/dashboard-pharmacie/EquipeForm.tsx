'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Professionnel } from './TypeRdvEquipe'
import ProHorairesForm, { type PlageHebdo } from './ProHorairesForm'

export default function EquipeForm({
  pharmacieId,
  professionnels,
  horairesParPro = {},
}: {
  pharmacieId: string
  professionnels: Professionnel[]
  /** Plages de présence hebdomadaires, indexées par id de professionnel. */
  horairesParPro?: Record<string, PlageHebdo[]>
}) {
  const [nom, setNom] = useState('')
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState('')
  const [message, setMessage] = useState('')
  const router = useRouter()
  const [ouvert, setOuvert] = useState<string | null>(null)

  const appeler = async (method: string, body: object, succes: string) => {
    setLoading(true)
    setErreur('')
    setMessage('')
    const res = await fetch('/api/pharmacie/professionnels', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    setLoading(false)
    if (!res.ok) {
      setErreur(typeof data.error === 'string' ? data.error : 'Erreur')
      return false
    }
    setMessage(succes)
    router.refresh()
    return true
  }

  const ajouter = async () => {
    if (!nom.trim()) return
    const ok = await appeler('POST', { pharmacieId, nom }, 'Personne ajoutée ✓')
    if (ok) setNom('')
  }

  const supprimer = async (p: Professionnel) => {
    if (!confirm(`Supprimer ${p.nom} de l'équipe ? Ses RDV à venir seront ré-attribués si possible.`)) return
    await appeler('DELETE', { id: p.id }, `${p.nom} retiré(e) ✓`)
  }

  return (
    <div className="bg-white rounded-lg border p-4 mb-6">
      <div className="mb-3">
        <h2 className="font-semibold">Équipe (agendas)</h2>
        <p className="text-xs text-gray-500 mt-1">
          Ajoutez les personnes qui reçoivent les patients, puis indiquez dans « Types de rendez-vous »
          qui réalise quoi. Une personne ne peut pas avoir deux RDV en même temps, tous types confondus.
        </p>
      </div>

      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void ajouter()}
          placeholder="Prénom (ex : Julia)"
          maxLength={60}
          className="ui-input flex-1"
        />
        <button type="button" onClick={ajouter} disabled={loading || !nom.trim()} className="ui-btn-primary">
          Ajouter
        </button>
      </div>

      {professionnels.length === 0 && (
        <p className="text-sm text-gray-500">Aucune personne ajoutée.</p>
      )}
      <ul className="space-y-1">
        {professionnels.map((p) => (
          <li key={p.id} className="text-sm py-1.5 border-b last:border-0">
            <div className="flex items-center justify-between">
            <span className={p.actif ? '' : 'text-gray-400 line-through'}>
              {p.nom}
              <span className="ml-2 text-xs text-gray-400">
                {(horairesParPro[p.id] ?? []).length > 0 ? 'horaires perso' : "horaires de la pharmacie"}
              </span>
            </span>
            <span className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setOuvert(ouvert === p.id ? null : p.id)}
                className="text-xs underline text-gray-500"
              >
                {ouvert === p.id ? 'Masquer' : 'Horaires'}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => appeler('PATCH', { id: p.id, actif: !p.actif }, p.actif ? 'Mis(e) en pause ✓' : 'Réactivé(e) ✓')}
                className="text-xs underline text-gray-500"
              >
                {p.actif ? 'Mettre en pause' : 'Réactiver'}
              </button>
              <button type="button" disabled={loading} onClick={() => void supprimer(p)} className="text-xs underline text-red-600">
                Supprimer
              </button>
            </span>
            </div>
            {ouvert === p.id && (
              <ProHorairesForm professionnelId={p.id} initiales={horairesParPro[p.id] ?? []} />
            )}
          </li>
        ))}
      </ul>

      {erreur && <p className="text-red-600 text-sm mt-3">{erreur}</p>}
      {message && <p className="text-sm text-green-700 mt-3">{message}</p>}
    </div>
  )
}
