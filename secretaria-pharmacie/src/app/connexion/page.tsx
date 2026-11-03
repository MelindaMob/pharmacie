'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Logo from '@/components/Logo'

export default function ConnexionPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mdpVisible, setMdpVisible] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const supabase = createClient()
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError('Email ou mot de passe incorrect')
        return
      }

      const userId = data.user.id

      const [{ data: pharmacie }, { data: admin }] = await Promise.all([
        supabase.from('pharmacies').select('id').eq('auth_user_id', userId).maybeSingle(),
        supabase.from('admins').select('id').eq('auth_user_id', userId).maybeSingle(),
      ])

      const destination = pharmacie
        ? '/dashboard-pharmacie'
        : admin
          ? '/admin'
          : '/dashboard-client'

      router.push(destination)
      router.refresh()
    } catch {
      setError('Erreur de connexion, réessayez.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-10 sm:py-16">
      <div className="ticket-perforation ui-panel w-full max-w-sm p-6 sm:p-8 pb-10 rounded-t-2xl animate-fade-up">
        <div className="flex justify-center mb-6">
          <Logo className="h-9 sm:h-10 w-auto" href="/" />
        </div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl text-center text-[var(--color-ink)] mb-6">
          Connexion
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="ui-label">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="ui-input"
              placeholder="vous@exemple.com"
            />
          </div>

          <div>
            <label className="ui-label">Mot de passe</label>
            <div className="relative">
              <input
                type={mdpVisible ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="ui-input !pr-11"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setMdpVisible((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] p-0.5"
                aria-label={mdpVisible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {mdpVisible ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button type="submit" disabled={loading} className="ui-btn-primary w-full">
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <p className="text-sm text-center mt-5 text-[var(--color-ink-soft)]">
          Pas encore de compte ?{' '}
          <a href="/inscription" className="text-[var(--color-primary)] font-medium hover:underline">
            S&apos;inscrire
          </a>
        </p>

        <p className="text-xs text-center mt-3 text-[var(--color-ink-soft)] leading-relaxed">
          Vous avez déjà pris un rendez-vous mais n&apos;avez pas encore de compte ?{' '}
          <a href="/inscription" className="text-[var(--color-primary)] font-medium hover:underline">
            Inscrivez-vous avec le même numéro de téléphone
          </a>{' '}
          pour retrouver votre historique.
        </p>
      </div>
    </div>
  )
}
