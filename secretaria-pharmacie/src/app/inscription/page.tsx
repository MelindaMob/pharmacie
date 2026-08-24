'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Logo from '@/components/Logo'

export default function InscriptionPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nom, setNom] = useState('')
  const [telephone, setTelephone] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/inscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, nom, telephone }),
    })
    const data = await res.json()

    if (data.error) {
      setLoading(false)
      setError(data.error)
      return
    }

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setLoading(false)

    if (signInError) {
      setError(
        'Compte créé, mais erreur de connexion automatique. Essayez de vous connecter.'
      )
      return
    }

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
          Créer un compte
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {(
            [
              { label: 'Nom', value: nom, setter: setNom, type: 'text' as const },
              {
                label: 'Téléphone',
                value: telephone,
                setter: setTelephone,
                type: 'tel' as const,
                placeholder: '0652774261',
              },
              { label: 'Email', value: email, setter: setEmail, type: 'email' as const },
              {
                label: 'Mot de passe',
                value: password,
                setter: setPassword,
                type: 'password' as const,
              },
            ] as const
          ).map((f) => (
            <div key={f.label}>
              <label className="block text-xs uppercase tracking-wide text-[var(--color-ink-soft)] mb-1.5">
                {f.label}
              </label>
              <input
                type={f.type}
                value={f.value}
                onChange={(e) => f.setter(e.target.value)}
                required
                placeholder={'placeholder' in f ? f.placeholder : undefined}
                minLength={f.type === 'password' ? 6 : undefined}
                className="w-full border border-[var(--color-line)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              />
            </div>
          ))}
          <p className="text-xs text-[var(--color-ink-soft)]">
            Si vous avez déjà pris un RDV avec ce numéro, il sera automatiquement lié à votre
            compte.
          </p>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {loading ? 'Création...' : 'Créer mon compte'}
          </button>
        </form>

        <p className="text-sm text-center mt-4 text-[var(--color-ink-soft)]">
          Déjà un compte ?{' '}
          <a href="/connexion" className="text-[var(--color-primary)] underline">
            Se connecter
          </a>
        </p>
      </div>
    </div>
  )
}
