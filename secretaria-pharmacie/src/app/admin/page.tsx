import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/auth/getRole'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AdminNav from './AdminNav'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const role = await getUserRole()
  if (!role || role.role !== 'admin') redirect('/connexion')

  const supabase = await createClient()

  const [{ count: nbPharmacies }, { count: nbGroupements }, { count: nbReservations }, { count: nbDemandesNouvelles }, { count: nbDemandes }] =
    await Promise.all([
      supabase.from('pharmacies').select('*', { count: 'exact', head: true }),
      supabase.from('groupements').select('*', { count: 'exact', head: true }),
      supabase
        .from('reservations')
        .select('*', { count: 'exact', head: true })
        .eq('statut', 'confirme'),
      supabase
        .from('demandes_contact')
        .select('*', { count: 'exact', head: true })
        .eq('statut', 'nouveau'),
      supabase.from('demandes_contact').select('*', { count: 'exact', head: true }),
    ])

  const cartes = [
    {
      label: 'Pharmacies',
      value: nbPharmacies ?? 0,
      href: '/admin/pharmacies',
    },
    {
      label: 'Groupements',
      value: nbGroupements ?? 0,
      href: '/admin/groupements',
    },
    {
      label: 'RDV confirmés',
      value: nbReservations ?? 0,
      href: '/admin/pharmacies',
    },
    {
      label: 'Demandes',
      value: nbDemandes ?? 0,
      hint:
        nbDemandesNouvelles && nbDemandesNouvelles > 0
          ? `${nbDemandesNouvelles} nouvelle${nbDemandesNouvelles > 1 ? 's' : ''}`
          : undefined,
      href: '/admin/demandes',
    },
  ]

  return (
    <AdminNav actif="accueil" nbDemandesNouvelles={nbDemandesNouvelles ?? 0}>
      <h1 className="font-[family-name:var(--font-display)] text-2xl text-[var(--color-ink)] mb-6">
        Back-office
      </h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {cartes.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="ui-panel p-4 hover:border-[var(--color-primary)]/40 transition-colors"
          >
            <p className="text-sm text-[var(--color-ink-soft)]">{c.label}</p>
            <p className="text-2xl font-semibold text-[var(--color-ink)] mt-1">{c.value}</p>
            {c.hint ? (
              <p className="text-xs text-[var(--color-accent)] mt-1 font-medium">{c.hint}</p>
            ) : null}
          </Link>
        ))}
      </div>
    </AdminNav>
  )
}
