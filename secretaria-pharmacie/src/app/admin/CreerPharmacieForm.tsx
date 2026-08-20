'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Groupement = { id: string; nom: string }

export default function CreerPharmacieForm({ groupements }: { groupements: Groupement[] }) {
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [telephone, setTelephone] = useState('')
  const [groupementId, setGroupementId] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [erreur, setErreur] = useState('')
  const router = useRouter()

  const creer = async () => {
    if (!nom || !email || !telephone) {
      setErreur('Merci de remplir tous les champs obligatoires')
      return
    }

    setLoading(true)
    setErreur('')
    setMessage('')

    const res = await fetch('/api/admin/creer-pharmacie', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nom, email, telephone, groupementId }),
    })
    const data = await res.json()

    setLoading(false)

    if (data.error) {
      setErreur(data.error)
      return
    }

    setMessage(`Pharmacie créée. Un email d'invitation a été envoyé à ${email}.`)
    setNom('')
    setEmail('')
    setTelephone('')
    setGroupementId('')
    router.refresh()
  }

  return (
    <div className="bg-white border rounded-lg p-4 mb-6">
      <h2 className="font-semibold mb-3">Ajouter une pharmacie</h2>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <input
          type="text"
          placeholder="Nom de la pharmacie"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          className="border rounded px-3 py-2"
        />
        <input
          type="tel"
          placeholder="Téléphone"
          value={telephone}
          onChange={(e) => setTelephone(e.target.value)}
          className="border rounded px-3 py-2"
        />
        <input
          type="email"
          placeholder="Email de connexion"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border rounded px-3 py-2 col-span-2"
        />
        <select
          value={groupementId}
          onChange={(e) => setGroupementId(e.target.value)}
          className="border rounded px-3 py-2 col-span-2"
        >
          <option value="">Aucun groupement</option>
          {groupements.map((g) => (
            <option key={g.id} value={g.id}>
              {g.nom}
            </option>
          ))}
        </select>
      </div>

      {erreur && <p className="text-red-600 text-sm mb-2">{erreur}</p>}
      {message && <p className="text-green-700 text-sm mb-2">{message}</p>}

      <button
        onClick={creer}
        disabled={loading}
        className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {loading ? 'Envoi...' : 'Créer la pharmacie'}
      </button>

      <p className="text-xs text-gray-500 mt-2">
        La pharmacie recevra un email pour définir son mot de passe et configurer son espace.
      </p>
    </div>
  )
}
