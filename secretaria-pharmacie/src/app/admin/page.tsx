import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/auth/getRole'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import CreerPharmacieForm from './CreerPharmacieForm'
import GestionGroupements from './GestionGroupements'
import GestionPharmacies from './GestionPharmacies'
import BoutonDeconnexion from '@/components/BoutonDeconnexion'
import Logo from '@/components/Logo'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const role = await getUserRole()
  if (!role || role.role !== 'admin') redirect('/connexion')

  const supabase = await createClient()

  const { data: groupements } = await supabase
    .from('groupements')
    .select('id, nom')
    .order('nom')

  const { data: pharmacies } = await supabase
    .from('pharmacies')
    .select('id, nom, adresse, telephone, groupement_id, created_at')
    .order('created_at', { ascending: false })

  const { count: nbReservations } = await supabase
    .from('reservations')
    .select('*', { count: 'exact', head: true })
    .eq('statut', 'confirme')

  const { count: nbDemandesNouvelles } = await supabase
    .from('demandes_contact')
    .select('*', { count: 'exact', head: true })
    .eq('statut', 'nouveau')

  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-4 sm:p-6 lg:p-8">
        <div className="sticky top-0 z-20 -mx-4 px-4 sm:mx-0 sm:px-0 py-3 mb-6 flex items-center justify-between gap-4 sm:gap-8 bg-[color-mix(in_srgb,var(--color-bg)_92%,transparent)] backdrop-blur-md">
          <Logo className="h-8 sm:h-9 w-auto" href="/admin" />
          <BoutonDeconnexion />
        </div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl text-[var(--color-ink)] mb-2">
          Back-office
        </h1>
        <Link
          href="/admin/demandes"
          className="text-[var(--color-primary)] underline text-sm mb-6 inline-block"
        >
          Voir les demandes de contact
          {nbDemandesNouvelles ? ` (${nbDemandesNouvelles} nouvelle${nbDemandesNouvelles > 1 ? 's' : ''})` : ''}{' '}
          →
        </Link>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-8">
          <div className="ui-panel p-4">
            <p className="text-sm text-[var(--color-ink-soft)]">Pharmacies</p>
            <p className="text-2xl font-semibold text-[var(--color-ink)]">
              {pharmacies?.length ?? 0}
            </p>
          </div>
          <div className="ui-panel p-4">
            <p className="text-sm text-[var(--color-ink-soft)]">Groupements</p>
            <p className="text-2xl font-semibold text-[var(--color-ink)]">
              {groupements?.length ?? 0}
            </p>
          </div>
          <div className="ui-panel p-4">
            <p className="text-sm text-[var(--color-ink-soft)]">RDV confirmés</p>
            <p className="text-2xl font-semibold text-[var(--color-ink)]">
              {nbReservations ?? 0}
            </p>
          </div>
        </div>

        <CreerPharmacieForm groupements={groupements ?? []} />
        <GestionGroupements groupements={groupements ?? []} />
        <GestionPharmacies pharmacies={pharmacies ?? []} groupements={groupements ?? []} />
      </div>
    </div>
  )
}
