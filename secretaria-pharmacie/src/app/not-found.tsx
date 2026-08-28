import type { Metadata } from 'next'
import Link from 'next/link'
import Logo from '@/components/Logo'

export const metadata: Metadata = {
  title: 'Page introuvable',
}

export default function NotFound() {
  return (
    <div className="relative flex-1 flex flex-col">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-[var(--color-accent)]/10 blur-3xl" />
        <div className="absolute top-40 -right-20 h-64 w-64 rounded-full bg-[var(--color-primary)]/10 blur-3xl" />
      </div>

      <div className="relative z-[1] flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-16 sm:py-24">
        <div className="max-w-md w-full text-center animate-fade-up">
          <div className="flex justify-center mb-6">
            <Logo className="h-10 sm:h-11 w-auto" />
          </div>

          <p className="font-[family-name:var(--font-mono)] text-6xl sm:text-7xl font-medium text-[var(--color-primary)]/20 mb-2">
            404
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-xl sm:text-2xl font-medium text-[var(--color-ink)] mb-2">
            Page introuvable
          </h1>
          <p className="text-sm sm:text-base text-[var(--color-ink-soft)] leading-relaxed mb-8">
            Cette adresse n&apos;existe pas ou a été déplacée. Vérifiez l&apos;URL ou
            revenez à l&apos;accueil.
          </p>

          <div className="ui-panel p-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/" className="ui-btn-primary w-full sm:w-auto">
              Retour à l&apos;accueil
            </Link>
            <Link href="/connexion" className="ui-btn-ghost w-full sm:w-auto">
              Se connecter
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
