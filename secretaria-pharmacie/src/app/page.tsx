'use client'

import Logo from '@/components/Logo'
import DemandePharmacieForm from '@/components/DemandePharmacieForm'

export default function LandingPage() {
  return (
    <div className="relative flex-1 flex flex-col">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-[var(--color-accent)]/10 blur-3xl" />
        <div className="absolute top-40 -right-20 h-64 w-64 rounded-full bg-[var(--color-primary)]/10 blur-3xl" />
      </div>

      <div className="relative z-[1] flex-1 flex flex-col items-center px-4 sm:px-6 pt-10 sm:pt-14 pb-16">
        <div className="max-w-xl w-full text-center">
          <div className="flex justify-center mb-5 animate-fade-up">
            <Logo className="h-12 sm:h-14 w-auto" href={null} priority />
          </div>
          <p className="text-[var(--color-ink-soft)] text-sm sm:text-base leading-relaxed mb-8 sm:mb-10 animate-fade-up-delay">
            La solution de prise de rendez-vous pensée pour les pharmacies : agenda en ligne,
            gestion des créneaux, et mise en relation avec votre groupement en cas
            d&apos;indisponibilité.
          </p>

          <DemandePharmacieForm className="animate-fade-up-delay text-left" />
        </div>
      </div>
    </div>
  )
}
