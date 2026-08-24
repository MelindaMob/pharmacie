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

export function NavDashboardClient({
  actif,
  nbNonLus = 0,
}: {
  actif: 'rdv' | 'messages'
  nbNonLus?: number
}) {
  return (
    <div className="sticky top-0 z-20 -mx-4 px-4 sm:mx-0 sm:px-0 mb-6 sm:mb-8 bg-[color-mix(in_srgb,var(--color-bg)_92%,transparent)] backdrop-blur-md pt-1 pb-3 flex flex-col gap-5 sm:gap-8">
      <div className="flex items-center justify-between gap-4 sm:gap-8">
        <Logo className="h-8 sm:h-9 w-auto" href="/dashboard-client" />
        <BoutonDeconnexion />
      </div>
      <nav className="flex gap-1 sm:gap-2 overflow-x-auto border-b border-[var(--color-line)] pb-px -mx-1 px-1">
        <Link
          href="/dashboard-client"
          className={`inline-flex items-center shrink-0 px-3 py-2.5 text-sm border-b-2 -mb-px transition-colors ${
            actif === 'rdv'
              ? 'border-[var(--color-primary)] text-[var(--color-primary)] font-medium'
              : 'border-transparent text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'
          }`}
        >
          Rendez-vous
        </Link>
        <Link
          href="/dashboard-client/messages"
          className={`inline-flex items-center shrink-0 px-3 py-2.5 text-sm border-b-2 -mb-px transition-colors ${
            actif === 'messages'
              ? 'border-[var(--color-primary)] text-[var(--color-primary)] font-medium'
              : 'border-transparent text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'
          }`}
        >
          Messages
          <BadgeNonLus n={nbNonLus} />
        </Link>
      </nav>
    </div>
  )
}
