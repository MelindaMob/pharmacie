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

    // Déterminer le rôle pour rediriger au bon endroit
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

    // Sinon, c'est un client
    router.push('/dashboard-client')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
      <div className="ticket-perforation bg-[var(--color-surface)] p-8 rounded-t-xl border border-[var(--color-line)] w-full max-w-sm pb-10">
        <div className="flex justify-center mb-6">
          <Logo className="h-10 w-auto" href="/" />
        </div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl text-center text-[var(--color-ink)] mb-6">
          Connexion
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wide text-[var(--color-ink-soft)] mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-[var(--color-line)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              placeholder="vous@exemple.com"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wide text-[var(--color-ink-soft)] mb-1.5">
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border border-[var(--color-line)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <p className="text-sm text-center mt-4 text-[var(--color-ink-soft)]">
          Pas encore de compte ?{' '}
          <a href="/inscription" className="text-[var(--color-primary)] underline">
            S&apos;inscrire
          </a>
        </p>
      </div>
    </div>
  )
}
