'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Logo from '@/components/Logo'
import PharmacyCross from '@/components/PharmacyCross'

export default function LandingPage() {
  const [nomPharmacie, setNomPharmacie] = useState('')
  const [email, setEmail] = useState('')
  const [telephone, setTelephone] = useState('')
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
    })
    setLoading(false)
    if (error) {
      setErreur("Erreur lors de l'envoi, réessayez.")
      return
    }
    setEnvoye(true)
  }

  const inputClass =
    'w-full border border-[var(--color-line)] rounded-lg px-3 py-2.5 text-sm bg-[var(--color-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-[var(--color-bg)]">
      <div className="max-w-xl w-full text-center">
        <div className="flex justify-center mb-6">
          <Logo className="h-14 w-auto" href={null} priority />
        </div>
        <p className="text-[var(--color-ink-soft)] mb-10">
          La solution de prise de rendez-vous pensée pour les pharmacies : agenda en ligne,
          gestion des créneaux, et mise en relation avec votre groupement en cas
          d&apos;indisponibilité.
        </p>

        {envoye ? (
          <div className="ticket-perforation bg-[var(--color-accent-soft)] border border-[var(--color-accent)]/30 rounded-t-xl p-6 pb-8">
            <PharmacyCross className="w-6 h-6 text-[var(--color-accent)] mx-auto mb-2" />
            <p className="text-[var(--color-ink)] font-medium">Merci pour votre demande !</p>
            <p className="text-sm text-[var(--color-ink-soft)] mt-1">
              Nous revenons vers vous très rapidement.
            </p>
          </div>
        ) : (
          <form
            onSubmit={envoyer}
            className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl p-6 text-left space-y-3"
          >
            <h2 className="font-[family-name:var(--font-display)] text-center text-lg text-[var(--color-ink)] mb-3">
              Vous êtes une pharmacie ?
            </h2>
            <input
              type="text"
              placeholder="Nom de la pharmacie"
              value={nomPharmacie}
              onChange={(e) => setNomPharmacie(e.target.value)}
              className={inputClass}
            />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
            <input
              type="tel"
              placeholder="Téléphone (optionnel)"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              className={inputClass}
            />
            <textarea
              placeholder="Votre message (optionnel)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className={inputClass}
            />
            {erreur && <p className="text-red-600 text-sm">{erreur}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
            >
              {loading ? 'Envoi...' : 'Demander une démo'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
