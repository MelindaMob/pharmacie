import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/auth/getRole'
import { redirect } from 'next/navigation'
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

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <Logo className="h-9 w-auto" href="/admin" />
          <BoutonDeconnexion />
        </div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl text-[var(--color-ink)] mb-6">
          Back-office
        </h1>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="border border-[var(--color-line)] rounded-lg p-4 bg-[var(--color-surface)]">
            <p className="text-sm text-[var(--color-ink-soft)]">Pharmacies</p>
            <p className="text-2xl font-semibold text-[var(--color-ink)]">
              {pharmacies?.length ?? 0}
            </p>
          </div>
          <div className="border border-[var(--color-line)] rounded-lg p-4 bg-[var(--color-surface)]">
            <p className="text-sm text-[var(--color-ink-soft)]">Groupements</p>
            <p className="text-2xl font-semibold text-[var(--color-ink)]">
              {groupements?.length ?? 0}
            </p>
          </div>
          <div className="border border-[var(--color-line)] rounded-lg p-4 bg-[var(--color-surface)]">
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
