'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import BoutonDeconnexion from '@/components/BoutonDeconnexion'
import Logo from '@/components/Logo'

export type DashboardTab = {
  key: string
  label: string
  href: string
  badge?: number
  disabled?: boolean
  /** Libellé court affiché dans le header mobile. */
  labelCourt?: string
}

function Badge({ n }: { n: number }) {
  if (n <= 0) return null
  return (
    <span className="inline-flex items-center justify-center min-w-[1.15rem] h-[1.15rem] px-1 rounded-full bg-[var(--color-accent)] text-white text-[0.65rem] font-semibold leading-none">
      {n > 99 ? '99+' : n}
    </span>
  )
}

function IconeMenu({ ouvert }: { ouvert: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {ouvert ? (
        <path
          d="M6 6l12 12M18 6L6 18"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      ) : (
        <path
          d="M4 7h16M4 12h16M4 17h16"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      )}
    </svg>
  )
}

function TabItem({
  tab,
  isActif,
  onNavigate,
  variant,
}: {
  tab: DashboardTab
  isActif: boolean
  onNavigate?: () => void
  variant: 'bar' | 'drawer'
}) {
  const contenu = (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      {tab.label}
      {tab.badge != null ? <Badge n={tab.badge} /> : null}
    </span>
  )

  if (variant === 'bar') {
    if (tab.disabled) {
      return (
        <span
          title="Configurez d'abord vos horaires dans Paramètres"
          aria-disabled="true"
          className="dash-tab opacity-40 cursor-not-allowed select-none"
        >
          {contenu}
        </span>
      )
    }
    return (
      <Link
        href={tab.href}
        aria-current={isActif ? 'page' : undefined}
        className={`dash-tab ${isActif ? 'dash-tab--actif' : ''}`}
      >
        {contenu}
      </Link>
    )
  }

  const classeDrawer = `flex items-center justify-between gap-3 min-h-12 px-4 py-3 rounded-xl text-sm ${
    tab.disabled
      ? 'opacity-40 cursor-not-allowed'
      : isActif
        ? 'bg-[var(--color-accent-soft)] text-[var(--color-primary)] font-medium'
        : 'text-[var(--color-ink)] hover:bg-[var(--color-bg)]'
  }`

  if (tab.disabled) {
    return (
      <span title="Configurez d'abord vos horaires dans Paramètres" className={classeDrawer}>
        {contenu}
      </span>
    )
  }

  return (
    <Link
      href={tab.href}
      aria-current={isActif ? 'page' : undefined}
      onClick={onNavigate}
      className={classeDrawer}
    >
      {contenu}
    </Link>
  )
}

/**
 * Coquille commune des dashboards : header sticky,
 * onglets en barre sur desktop, menu burger sur mobile.
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
  const [menuOuvert, setMenuOuvert] = useState(false)
  const ongletActif = tabs.find((t) => t.key === actif)
  const badgeMenu = tabs.reduce((acc, t) => acc + (t.badge && !t.disabled ? t.badge : 0), 0)

  useEffect(() => {
    if (!menuOuvert) return
    const precedent = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOuvert(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = precedent
      window.removeEventListener('keydown', onKey)
    }
  }, [menuOuvert])

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const onChange = () => {
      if (mq.matches) setMenuOuvert(false)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const fermerMenu = () => setMenuOuvert(false)

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 border-b border-[var(--color-line)]/80 bg-[color-mix(in_srgb,var(--color-surface)_90%,transparent)] backdrop-blur-md">
        <div className={`mx-auto w-full ${maxWidthClass} px-4 sm:px-6`}>
          <div className="flex h-14 items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Logo className="h-8 w-auto shrink-0" href={homeHref} />
              {ongletActif && (
                <span className="md:hidden truncate text-sm font-medium text-[var(--color-ink)]">
                  {ongletActif.labelCourt ?? ongletActif.label}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {showLogout ? (
                <span className="hidden md:inline-flex">
                  <BoutonDeconnexion />
                </span>
              ) : null}
              {tabs.length > 0 && (
                <button
                  type="button"
                  className="relative md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg border border-[var(--color-line)] text-[var(--color-ink)] hover:bg-[var(--color-accent-soft)]"
                  aria-label={menuOuvert ? 'Fermer le menu' : 'Ouvrir le menu'}
                  aria-expanded={menuOuvert}
                  aria-controls="dash-menu-mobile"
                  onClick={() => setMenuOuvert((v) => !v)}
                >
                  <IconeMenu ouvert={menuOuvert} />
                  {!menuOuvert && badgeMenu > 0 && (
                    <span className="absolute -top-1 -right-1">
                      <Badge n={badgeMenu} />
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>

          {tabs.length > 0 && (
            <nav
              className="hidden md:flex items-stretch gap-0.5 overflow-x-auto overscroll-x-contain scrollbar-none pb-px"
              aria-label="Sections"
            >
              {tabs.map((tab) => (
                <TabItem key={tab.key} tab={tab} isActif={actif === tab.key} variant="bar" />
              ))}
            </nav>
          )}
        </div>
      </header>

      {menuOuvert && tabs.length > 0 && (
        <div className="md:hidden fixed inset-x-0 bottom-0 top-14 z-40">
          <button
            type="button"
            className="absolute inset-0 bg-[var(--color-ink)]/40"
            aria-label="Fermer le menu"
            onClick={fermerMenu}
          />
          <nav
            id="dash-menu-mobile"
            aria-label="Sections"
            className="absolute top-0 right-0 h-full w-[min(20rem,88vw)] bg-[var(--color-surface)] border-l border-[var(--color-line)] shadow-[var(--shadow-soft)] flex flex-col pb-[max(1rem,env(safe-area-inset-bottom))]"
          >
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
              {tabs.map((tab) => (
                <TabItem
                  key={tab.key}
                  tab={tab}
                  isActif={actif === tab.key}
                  variant="drawer"
                  onNavigate={fermerMenu}
                />
              ))}
            </div>
            {showLogout ? (
              <div className="px-3 pt-2 border-t border-[var(--color-line)]">
                <BoutonDeconnexion className="w-full justify-center" />
              </div>
            ) : null}
          </nav>
        </div>
      )}

      <main className={`mx-auto w-full ${maxWidthClass} flex-1 px-4 sm:px-6 py-5 sm:py-8`}>
        {children}
      </main>
    </div>
  )
}
