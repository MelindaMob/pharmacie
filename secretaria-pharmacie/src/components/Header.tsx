'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Logo from './Logo'

const ROUTES_SANS_HEADER = [
  '/dashboard-pharmacie',
  '/dashboard-client',
  '/admin',
  '/rdv/gestion',
]

export default function Header() {
  const pathname = usePathname()

  if (ROUTES_SANS_HEADER.some((route) => pathname?.startsWith(route))) {
    return null
  }

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--color-line)] bg-[var(--color-surface)]">
      <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between gap-8">
        <Logo className="h-8 w-auto" priority />

        <nav className="flex items-center gap-4 text-sm shrink-0">
          <Link
            href="/connexion"
            className="text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
          >
            Connexion
          </Link>
          <Link
            href="/inscription"
            className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            S&apos;inscrire
          </Link>
        </nav>
      </div>
    </header>
  )
}
