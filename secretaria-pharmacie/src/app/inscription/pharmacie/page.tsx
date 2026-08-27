'use client'

import Link from 'next/link'
import Logo from '@/components/Logo'
import DemandePharmacieForm from '@/components/DemandePharmacieForm'

export default function InscriptionPharmaciePage() {
  return (
    <div className="flex-1 flex items-center justify-center px-4 py-10 sm:py-16">
      <div className="w-full max-w-xl">
        <Link
          href="/inscription"
          className="text-sm text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] mb-4 inline-block"
        >
          ← Retour
        </Link>

        <div className="flex justify-center mb-6">
          <Logo className="h-9 sm:h-10 w-auto" href="/" />
        </div>

        <DemandePharmacieForm titre="Demander une démo" className="animate-fade-up" />

        <p className="text-sm text-center mt-5 text-[var(--color-ink-soft)]">
          Déjà un compte pharmacie ?{' '}
          <Link href="/connexion" className="text-[var(--color-primary)] font-medium hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  )
}
