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

  return (
    <div className="relative flex-1 flex flex-col">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -top-24 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-[var(--color-accent)]/10 blur-3xl" />
        <div className="absolute top-40 -right-20 h-64 w-64 rounded-full bg-[var(--color-primary)]/10 blur-3xl" />
      </div>

      <div className="relative z-[1] flex-1 flex flex-col items-center px-4 sm:px-6 pt-10 sm:pt-14 pb-16">
        <div className="max-w-xl w-full text-center">
          <div className="flex justify-center mb-5 animate-fade-up">
            <Logo className="h-12 sm:h-14 w-auto" href={null} priority />
          </div>
          <p className="text-[var(--color-ink-soft)] text-sm sm:text-base leading-relaxed mb-8 sm:mb-10 animate-fade-up-delay">
            La solution de prise de rendez-vous pensée pour les pharmacies : agenda en ligne,
            gestion des créneaux, et mise en relation avec votre groupement en cas
            d&apos;indisponibilité.
          </p>

          {envoye ? (
            <div className="ticket-perforation ui-panel rounded-t-2xl p-6 sm:p-8 pb-10 text-center bg-[var(--color-accent-soft)] border-[var(--color-accent)]/25 animate-fade-up">
              <PharmacyCross className="w-6 h-6 text-[var(--color-accent)] mx-auto mb-2" />
              <p className="text-[var(--color-ink)] font-medium">Merci pour votre demande !</p>
              <p className="text-sm text-[var(--color-ink-soft)] mt-1">
                Nous revenons vers vous très rapidement.
              </p>
            </div>
          ) : (
            <form
              onSubmit={envoyer}
              className="ui-panel p-5 sm:p-6 text-left space-y-3 animate-fade-up-delay"
            >
              <h2 className="font-[family-name:var(--font-display)] text-center text-lg sm:text-xl text-[var(--color-ink)] mb-4">
                Vous êtes une pharmacie ?
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
          )}
        </div>
      </div>
    </div>
  )
}
