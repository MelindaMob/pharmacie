'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Logo from './Logo'
import { createClient } from '@/lib/supabase/client'

const ROUTES_SANS_HEADER = [
  '/dashboard-pharmacie',
  '/dashboard-client',
  '/admin',
  '/rdv/gestion',
  '/connexion',
  '/inscription',
  '/login',
  '/auth',
]

export default function Header() {
  const pathname = usePathname()
  const [estClient, setEstClient] = useState(false)

  const surFichePharmacie = pathname?.startsWith('/pharmacie/')

  useEffect(() => {
    if (!surFichePharmacie) {
      setEstClient(false)
      return
    }

    let annule = false
    const verifier = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user || annule) {
        if (!annule) setEstClient(false)
        return
      }
      const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('auth_user_id', user.id)
        .limit(1)
        .maybeSingle()
      if (!annule) setEstClient(!!client)
    }
    void verifier()
    return () => {
      annule = true
    }
  }, [surFichePharmacie, pathname])

  if (ROUTES_SANS_HEADER.some((route) => pathname?.startsWith(route))) {
    return null
  }

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--color-line)]/80 bg-[color-mix(in_srgb,var(--color-surface)_86%,transparent)] backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-6 sm:gap-10">
        <Logo className="h-7 sm:h-8 w-auto" priority />

        <nav className="ml-auto flex items-center gap-2 sm:gap-3 text-sm shrink-0">
          {estClient ? (
            <Link
              href="/dashboard-client"
              className="text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] px-2 sm:px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1.5"
            >
              <span aria-hidden>←</span>
              Retour à mon espace client
            </Link>
          ) : (
            <>
              <Link
                href="/connexion"
                className="text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] px-2 sm:px-3 py-1.5 rounded-lg transition-colors"
              >
                Connexion
              </Link>
              <Link
                href="/inscription"
                className="ui-btn-primary !py-1.5 !px-3 text-sm"
              >
                S&apos;inscrire
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
