'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { normaliserNumeroFrancais } from '@/lib/telephone'

type Groupement = { id: string; nom: string }

const inputClass =
  'border border-[var(--color-line)] rounded-lg px-3 py-2 text-sm bg-[var(--color-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent'

export default function CreerPharmacieForm({ groupements }: { groupements: Groupement[] }) {
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [telephone, setTelephone] = useState('')
  const [retellPhoneNumber, setRetellPhoneNumber] = useState('')
  const [gardeActive, setGardeActive] = useState(false)
  const [numeroGarde, setNumeroGarde] = useState('')
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
    if (gardeActive && !numeroGarde.trim()) {
      setErreur('Indiquez le numéro de la pharmacie de garde, ou désactivez le mode garde')
      return
    }

    setLoading(true)
    setErreur('')
    setMessage('')

    const res = await fetch('/api/admin/creer-pharmacie', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nom,
        email,
        telephone,
        groupementId,
        retellPhoneNumber,
        numeroGarde: gardeActive ? normaliserNumeroFrancais(numeroGarde) : '',
      }),
    })
    const data = await res.json()

    setLoading(false)

    if (data.error) {
      setErreur(typeof data.error === 'string' ? data.error : JSON.stringify(data.error))
      return
    }

    setMessage(
      data.lienInvitation
        ? `Pharmacie créée. L’email d’invitation n’a pas pu partir automatiquement. Lien à envoyer : ${data.lienInvitation}`
        : `Pharmacie créée. Un email d'invitation a été envoyé à ${email}.`
    )
    setNom('')
    setEmail('')
    setTelephone('')
    setRetellPhoneNumber('')
    setGardeActive(false)
    setNumeroGarde('')
    setGroupementId('')
    router.refresh()
  }

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-lg p-4 mb-6">
      <h2 className="font-semibold text-[var(--color-ink)] mb-3">Ajouter une pharmacie</h2>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <input
          type="text"
          placeholder="Nom de la pharmacie"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          className={inputClass}
        />
        <input
          type="tel"
          placeholder="Téléphone"
          value={telephone}
          onChange={(e) => setTelephone(e.target.value)}
          className={inputClass}
        />
        <input
          type="tel"
          placeholder="Numéro vocal Paul (Telnyx/Retell, optionnel)"
          value={retellPhoneNumber}
          onChange={(e) => setRetellPhoneNumber(e.target.value)}
          className={`${inputClass} col-span-2`}
        />
        <label className="col-span-2 flex items-center gap-2 text-sm text-[var(--color-ink)] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={gardeActive}
            onChange={(e) => {
              setGardeActive(e.target.checked)
              if (!e.target.checked) setNumeroGarde('')
            }}
            className="rounded border-[var(--color-line)]"
          />
          Mode garde activé
        </label>
        {gardeActive && (
          <input
            type="tel"
            placeholder="Numéro de garde — ex. 0652107571"
            value={numeroGarde}
            onChange={(e) => setNumeroGarde(normaliserNumeroFrancais(e.target.value))}
            className={`${inputClass} col-span-2`}
            inputMode="tel"
          />
        )}
        <input
          type="email"
          placeholder="Email de connexion"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={`${inputClass} col-span-2`}
        />
        <select
          value={groupementId}
          onChange={(e) => setGroupementId(e.target.value)}
          className={`${inputClass} col-span-2`}
        >
          <option value="">Aucun groupement</option>
          {groupements.map((g) => (
            <option key={g.id} value={g.id}>
              {g.nom}
            </option>
          ))}
        </select>
      </div>

      {erreur && <p className="text-red-600 text-sm mb-2 break-words">{erreur}</p>}
      {message && (
        <p className="text-[var(--color-accent)] text-sm mb-2 break-all whitespace-pre-wrap">
          {message}
        </p>
      )}

      <button
        type="button"
        onClick={creer}
        disabled={loading}
        className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50 transition-colors"
      >
        {loading ? 'Envoi...' : 'Créer la pharmacie'}
      </button>

      <p className="text-xs text-[var(--color-ink-soft)] mt-2">
        La pharmacie recevra un email pour définir son mot de passe et configurer son espace.
      </p>
    </div>
  )
}
