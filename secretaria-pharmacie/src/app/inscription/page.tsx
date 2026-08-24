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
    <div className="flex-1 flex items-center justify-center px-4 py-10 sm:py-16">
      <div className="ticket-perforation ui-panel w-full max-w-sm p-6 sm:p-8 pb-10 rounded-t-2xl animate-fade-up">
        <div className="flex justify-center mb-6">
          <Logo className="h-9 sm:h-10 w-auto" href="/" />
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
              <label className="ui-label">{f.label}</label>
              <input
                type={f.type}
                value={f.value}
                onChange={(e) => f.setter(e.target.value)}
                required
                placeholder={'placeholder' in f ? f.placeholder : undefined}
                minLength={f.type === 'password' ? 6 : undefined}
                className="ui-input"
              />
            </div>
          ))}
          <p className="text-xs text-[var(--color-ink-soft)] leading-relaxed">
            Si vous avez déjà pris un RDV avec ce numéro, il sera automatiquement lié à votre
            compte.
          </p>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button type="submit" disabled={loading} className="ui-btn-primary w-full">
            {loading ? 'Création...' : 'Créer mon compte'}
          </button>
        </form>

        <p className="text-sm text-center mt-5 text-[var(--color-ink-soft)]">
          Déjà un compte ?{' '}
          <a href="/connexion" className="text-[var(--color-primary)] font-medium hover:underline">
            Se connecter
          </a>
        </p>
      </div>
    </div>
  )
}
