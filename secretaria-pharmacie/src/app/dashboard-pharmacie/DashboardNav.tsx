'use client'

import Link from 'next/link'
import BoutonDeconnexion from '@/components/BoutonDeconnexion'
import Logo from '@/components/Logo'

function BadgeNonLus({ n }: { n: number }) {
  if (n <= 0) return null
  return (
    <span className="ml-1.5 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-[var(--color-accent)] text-white text-xs font-medium">
      {n > 99 ? '99+' : n}
    </span>
  )
}

export default function DashboardNav({
  actif,
  nbNonLus = 0,
}: {
  actif: 'calendrier' | 'parametres' | 'messages'
  nbNonLus?: number
}) {
  const onglets = [
    { key: 'calendrier', label: 'Calendrier', href: '/dashboard-pharmacie' },
    { key: 'messages', label: 'Messages', href: '/dashboard-pharmacie/messages' },
    { key: 'parametres', label: 'Paramètres', href: '/dashboard-pharmacie/parametres' },
  ] as const

  return (
    <div className="sticky top-0 z-20 mb-6 bg-[var(--color-bg)] pt-1 pb-3">
      <div className="flex items-center justify-between gap-8 mb-6">
        <Logo className="h-9 w-auto" href="/dashboard-pharmacie" />
        <BoutonDeconnexion />
      </div>
      <div className="flex gap-4 border-b border-[var(--color-line)] pb-2 text-sm">
        {onglets.map((o) => (
          <Link
            key={o.key}
            href={o.href}
            className={`inline-flex items-center ${
              actif === o.key
                ? 'text-[var(--color-primary)] font-medium'
                : 'text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'
            }`}
          >
            {o.label}
            {o.key === 'messages' && <BadgeNonLus n={nbNonLus} />}
          </Link>
        ))}
      </div>
    </div>
  )
}
