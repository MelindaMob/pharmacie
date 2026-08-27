'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Logo from '@/components/Logo'

/**
 * Pourquoi une session admin pouvait "gagner" malgré le lien email :
 * le token d'invitation est dans l'URL, mais getSession() renvoyait d'abord
 * la session déjà stockée (cookies). updateUser() modifiait donc l'admin.
 * Ici on lit le token URL, on écarte la session locale, puis on pose la session invite.
 */
export default function DefinirMotDePassePage() {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [erreur, setErreur] = useState('')
  const [loading, setLoading] = useState(false)
  const [pret, setPret] = useState(false)
  const initDone = useRef(false)
  const router = useRouter()

  useEffect(() => {
    if (initDone.current) return
    initDone.current = true

    const initialiser = async () => {
      const supabase = createClient()
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
      const query = new URLSearchParams(window.location.search)

      const accessToken = hash.get('access_token')
      const refreshToken = hash.get('refresh_token')
      const type = hash.get('type') ?? query.get('type')
      const code = query.get('code')
      const tokenHash = query.get('token_hash')

      const hasInviteTokens =
        Boolean(accessToken && refreshToken) ||
        Boolean(code) ||
        Boolean(tokenHash && (type === 'invite' || type === 'recovery'))

      if (hasInviteTokens) {
        // Écarte admin / autre compte déjà connecté dans ce navigateur
        await supabase.auth.signOut({ scope: 'local' })

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (error) {
            setErreur('Lien invalide ou expiré. Contactez Secretar.IA pour un nouveau lien.')
            return
          }
        } else if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) {
            setErreur('Lien invalide ou expiré. Contactez Secretar.IA pour un nouveau lien.')
            return
          }
        } else if (tokenHash && type) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as 'invite' | 'recovery',
          })
          if (error) {
            setErreur('Lien invalide ou expiré. Contactez Secretar.IA pour un nouveau lien.')
            return
          }
        }

        window.history.replaceState(null, '', window.location.pathname)
      }

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        setErreur('Lien invalide ou expiré. Contactez Secretar.IA pour un nouveau lien.')
        return
      }

      const { data: pharmacie } = await supabase
        .from('pharmacies')
        .select('id')
        .eq('auth_user_id', session.user.id)
        .maybeSingle()

      if (!pharmacie) {
        await supabase.auth.signOut({ scope: 'local' })
        setErreur(
          'Ce lien ne correspond pas à un compte pharmacie. Déconnectez-vous de tout autre compte, puis rouvrez le lien reçu par email.'
        )
        return
      }

      setPret(true)
      setErreur('')
    }

    initialiser()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return

    if (password.length < 6) {
      setErreur('Le mot de passe doit contenir au moins 6 caractères')
      return
    }
    if (password !== confirmation) {
      setErreur('Les mots de passe ne correspondent pas')
      return
    }

    setLoading(true)
    setErreur('')
    const supabase = createClient()

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      // MDP déjà défini (double envoi) : on laisse entrer
      if (error.code === 'same_password' || error.message.includes('same_password') || error.message.includes('different from the old')) {
        router.push('/dashboard-pharmacie')
        router.refresh()
        return
      }
      setLoading(false)
      setErreur(error.message)
      return
    }

    router.push('/dashboard-pharmacie')
    router.refresh()
  }

  if (!pret && !erreur) {
    return (
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <p className="text-sm text-[var(--color-ink-soft)] animate-fade-up">Chargement…</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-10 sm:py-16">
      <div className="ticket-perforation ui-panel w-full max-w-sm p-6 sm:p-8 pb-10 rounded-t-2xl animate-fade-up">
        <div className="flex justify-center mb-6">
          <Logo className="h-9 sm:h-10 w-auto" href="/" />
        </div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl text-center text-[var(--color-ink)] mb-2">
          Bienvenue
        </h1>
        <p className="text-sm text-[var(--color-ink-soft)] text-center mb-6 leading-relaxed">
          Choisissez votre mot de passe pour accéder à votre espace pharmacie.
        </p>

        {erreur && !pret ? (
          <p className="text-red-600 text-sm text-center leading-relaxed">{erreur}</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="nouveau-mdp" className="ui-label">
                Nouveau mot de passe
              </label>
              <input
                id="nouveau-mdp"
                name="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="ui-input"
              />
            </div>

            <div>
              <label htmlFor="confirm-mdp" className="ui-label">
                Confirmer le mot de passe
              </label>
              <input
                id="confirm-mdp"
                name="password_confirmation"
                type="password"
                autoComplete="new-password"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                required
                minLength={6}
                className="ui-input"
              />
            </div>

            {erreur && <p className="text-red-600 text-sm">{erreur}</p>}

            <button type="submit" disabled={loading} className="ui-btn-primary w-full">
              {loading ? 'Enregistrement...' : 'Accéder à mon espace'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
