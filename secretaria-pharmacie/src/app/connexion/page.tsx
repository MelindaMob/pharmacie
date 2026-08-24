'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Logo from '@/components/Logo'

export default function ConnexionPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      setLoading(false)
      setError('Email ou mot de passe incorrect')
      return
    }

    const userId = data.user.id

    const { data: pharmacie } = await supabase
      .from('pharmacies')
      .select('id')
      .eq('auth_user_id', userId)
      .single()

    if (pharmacie) {
      router.push('/dashboard-pharmacie')
      router.refresh()
      return
    }

    const { data: admin } = await supabase
      .from('admins')
      .select('id')
      .eq('auth_user_id', userId)
      .single()

    if (admin) {
      router.push('/admin')
      router.refresh()
      return
    }

    router.push('/dashboard-client')
    router.refresh()
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
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="ui-input"
              placeholder="••••••••"
            />
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
      </div>
    </div>
  )
}
