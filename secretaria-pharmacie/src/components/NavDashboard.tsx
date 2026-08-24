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
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <Logo className="h-9 w-auto" href="/dashboard-client" />
        <BoutonDeconnexion />
      </div>
      <div className="flex gap-4 border-b border-[var(--color-line)] pb-2 text-sm">
        <Link
          href="/dashboard-client"
          className={
            actif === 'rdv'
              ? 'text-[var(--color-primary)] font-medium'
              : 'text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'
          }
        >
          Rendez-vous
        </Link>
        <Link
          href="/dashboard-client/messages"
          className={`inline-flex items-center ${
            actif === 'messages'
              ? 'text-[var(--color-primary)] font-medium'
              : 'text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'
          }`}
        >
          Messages
          <BadgeNonLus n={nbNonLus} />
        </Link>
      </div>
    </div>
  )
}
