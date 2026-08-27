'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import PharmacyCross from '@/components/PharmacyCross'

export default function DemandePharmacieForm({
  titre = 'Vous êtes une pharmacie ?',
  className = '',
}: {
  titre?: string
  className?: string
}) {
  const [nomPharmacie, setNomPharmacie] = useState('')
  const [email, setEmail] = useState('')
  const [telephone, setTelephone] = useState('')
  const [estIndependante, setEstIndependante] = useState('')
  const [nomGroupement, setNomGroupement] = useState('')
  const [message, setMessage] = useState('')
  const [envoye, setEnvoye] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState('')

  const envoyer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nomPharmacie || !email) {
      setErreur("Merci de renseigner au moins le nom et l'email")
      return
    }

    setLoading(true)
    setErreur('')
    const supabase = createClient()

    const { error } = await supabase.from('demandes_contact').insert({
      nom_pharmacie: nomPharmacie,
      email,
      telephone,
      message,
      est_independante: estIndependante === 'independante',
      nom_groupement: estIndependante === 'groupement' ? nomGroupement : null,
    })

    setLoading(false)
    if (error) {
      setErreur("Erreur lors de l'envoi, réessayez.")
      return
    }
    setEnvoye(true)
  }

  if (envoye) {
    return (
      <div
        className={`ticket-perforation ui-panel rounded-t-2xl p-6 sm:p-8 pb-10 text-center bg-[var(--color-accent-soft)] border-[var(--color-accent)]/25 ${className}`}
      >
        <PharmacyCross className="w-6 h-6 text-[var(--color-accent)] mx-auto mb-2" />
        <p className="text-[var(--color-ink)] font-medium">Merci pour votre demande !</p>
        <p className="text-sm text-[var(--color-ink-soft)] mt-1">
          Nous revenons vers vous très rapidement.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={envoyer} className={`ui-panel p-5 sm:p-6 text-left space-y-3 ${className}`}>
      <h2 className="font-[family-name:var(--font-display)] text-center text-lg sm:text-xl text-[var(--color-ink)] mb-4">
        {titre}
      </h2>
      <input
        type="text"
        placeholder="Nom de la pharmacie"
        value={nomPharmacie}
        onChange={(e) => setNomPharmacie(e.target.value)}
        className="ui-input"
      />
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="ui-input"
      />
      <input
        type="tel"
        placeholder="Téléphone (optionnel)"
        value={telephone}
        onChange={(e) => setTelephone(e.target.value)}
        className="ui-input"
      />

      <select
        value={estIndependante}
        onChange={(e) => setEstIndependante(e.target.value)}
        className="ui-input"
      >
        <option value="">Situation de votre pharmacie</option>
        <option value="independante">Pharmacie indépendante</option>
        <option value="groupement">Membre d&apos;un groupement</option>
      </select>

      {estIndependante === 'groupement' && (
        <input
          type="text"
          placeholder="Nom du groupement"
          value={nomGroupement}
          onChange={(e) => setNomGroupement(e.target.value)}
          className="ui-input"
        />
      )}

      <textarea
        placeholder="Votre message (optionnel)"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
        className="ui-input resize-y min-h-[5rem]"
      />
      {erreur && <p className="text-red-600 text-sm">{erreur}</p>}
      <button type="submit" disabled={loading} className="ui-btn-primary w-full mt-1">
        {loading ? 'Envoi...' : 'Demander une démo'}
      </button>
    </form>
  )
}
