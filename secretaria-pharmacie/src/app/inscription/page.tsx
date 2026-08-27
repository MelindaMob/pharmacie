'use client'

import Link from 'next/link'
import Logo from '@/components/Logo'
import PharmacyCross from '@/components/PharmacyCross'

export default function InscriptionChoixPage() {
  return (
    <div className="flex-1 flex items-center justify-center px-4 py-10 sm:py-16">
      <div className="ticket-perforation ui-panel w-full max-w-md p-6 sm:p-8 pb-10 rounded-t-2xl animate-fade-up">
        <div className="flex justify-center mb-6">
          <Logo className="h-9 sm:h-10 w-auto" href="/" />
        </div>

        <h1 className="font-[family-name:var(--font-display)] text-2xl text-center text-[var(--color-ink)] mb-2">
          S&apos;inscrire
        </h1>
        <p className="text-sm text-center text-[var(--color-ink-soft)] mb-6">
          Vous êtes une pharmacie ou un client ?
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href="/inscription/pharmacie"
            className="ui-panel p-5 text-left hover:border-[var(--color-primary)]/40 transition-colors group"
          >
            <PharmacyCross className="w-6 h-6 text-[var(--color-accent)] mb-3" />
            <p className="font-medium text-[var(--color-ink)] group-hover:text-[var(--color-primary)]">
              Pharmacie
            </p>
            <p className="text-xs text-[var(--color-ink-soft)] mt-1 leading-relaxed">
              Demander une démo et rejoindre Secretar.IA
            </p>
          </Link>

          <Link
            href="/inscription/client"
            className="ui-panel p-5 text-left hover:border-[var(--color-primary)]/40 transition-colors group"
          >
            <span className="inline-flex w-6 h-6 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-sm font-semibold mb-3">
              C
            </span>
            <p className="font-medium text-[var(--color-ink)] group-hover:text-[var(--color-primary)]">
              Client
            </p>
            <p className="text-xs text-[var(--color-ink-soft)] mt-1 leading-relaxed">
              Créer un compte pour gérer vos rendez-vous
            </p>
          </Link>
        </div>

        <p className="text-sm text-center mt-6 text-[var(--color-ink-soft)]">
          Déjà un compte ?{' '}
          <Link href="/connexion" className="text-[var(--color-primary)] font-medium hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  )
}
