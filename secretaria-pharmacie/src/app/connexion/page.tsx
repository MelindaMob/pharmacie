'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-sm border w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 text-center">Connexion</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border rounded px-3 py-2"
              placeholder="vous@exemple.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border rounded px-3 py-2"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-2 rounded disabled:opacity-50"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <p className="text-sm text-center mt-4 text-gray-600">
          Pas encore de compte ?{' '}
          <a href="/inscription" className="underline">
            S&apos;inscrire
          </a>
        </p>
      </div>
    </div>
  )
}
