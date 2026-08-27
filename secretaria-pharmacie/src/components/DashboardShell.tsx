import Link from 'next/link'
import BoutonDeconnexion from '@/components/BoutonDeconnexion'
import Logo from '@/components/Logo'

export type DashboardTab = {
  key: string
  label: string
  href: string
  badge?: number
}

function Badge({ n }: { n: number }) {
  if (n <= 0) return null
  return (
    <span className="inline-flex items-center justify-center min-w-[1.15rem] h-[1.15rem] px-1 rounded-full bg-[var(--color-accent)] text-white text-[0.65rem] font-semibold leading-none">
      {n > 99 ? '99+' : n}
    </span>
  )
}

/**
 * Coquille commune des dashboards : header sticky pleine largeur,
 * onglets alignés sur le contenu, sans décalage selon le breakpoint.
 */
export default function DashboardShell({
  homeHref,
  tabs,
  actif,
  maxWidthClass = 'max-w-5xl',
  showLogout = true,
  children,
}: {
  homeHref: string
  tabs: DashboardTab[]
  actif: string
  maxWidthClass?: string
  showLogout?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 border-b border-[var(--color-line)]/80 bg-[color-mix(in_srgb,var(--color-surface)_90%,transparent)] backdrop-blur-md">
        <div className={`mx-auto w-full ${maxWidthClass} px-4 sm:px-6`}>
          <div className="flex h-14 items-center justify-between gap-3">
            <Logo className="h-8 w-auto shrink-0" href={homeHref} />
            {showLogout ? <BoutonDeconnexion /> : null}
          </div>

          {tabs.length > 0 && (
            <nav
              className="flex items-stretch gap-0.5 overflow-x-auto overscroll-x-contain scrollbar-none pb-px"
              aria-label="Sections"
            >
              {tabs.map((tab) => {
                const isActif = actif === tab.key
                return (
                  <Link
                    key={tab.key}
                    href={tab.href}
                    aria-current={isActif ? 'page' : undefined}
                    className={`dash-tab ${isActif ? 'dash-tab--actif' : ''}`}
                  >
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                      {tab.label}
                      {tab.badge != null ? <Badge n={tab.badge} /> : null}
                    </span>
                  </Link>
                )
              })}
            </nav>
          )}
        </div>
      </header>

      <main className={`mx-auto w-full ${maxWidthClass} flex-1 px-4 sm:px-6 py-6 sm:py-8`}>
        {children}
      </main>
    </div>
  )
}
