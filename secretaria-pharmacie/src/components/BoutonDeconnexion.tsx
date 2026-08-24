'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function BoutonDeconnexion() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const deconnecter = async () => {
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/connexion')
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={deconnecter}
      disabled={loading}
      className="text-sm border border-[var(--color-line)] rounded-lg px-3 py-1.5 text-[var(--color-ink-soft)] hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)] disabled:opacity-50"
    >
      {loading ? 'Déconnexion...' : 'Se déconnecter'}
    </button>
  )
}
