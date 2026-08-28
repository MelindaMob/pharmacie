import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/auth/getRole'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AdminNav from './AdminNav'

export const dynamic = 'force-dynamic'

const LABELS_CANAL: Record<string, string> = {
  web: '💻 En ligne',
  vocal: '📞 Vocal (Paul)',
  manuel: '✍️ Manuel',
}

export default async function AdminPage() {
  const role = await getUserRole()
  if (!role || role.role !== 'admin') redirect('/connexion')

  const supabase = await createClient()

  const [
    { count: nbPharmacies },
    { count: nbGroupements },
    { count: nbReservations },
    { count: nbDemandesNouvelles },
    { count: nbDemandes },
    { data: statsCanal },
  ] = await Promise.all([
    supabase.from('pharmacies').select('*', { count: 'exact', head: true }),
    supabase.from('groupements').select('*', { count: 'exact', head: true }),
    supabase.from('reservations').select('*', { count: 'exact', head: true }).eq('statut', 'confirme'),
    supabase
      .from('demandes_contact')
      .select('*', { count: 'exact', head: true })
      .eq('statut', 'nouveau'),
    supabase.from('demandes_contact').select('*', { count: 'exact', head: true }),
    supabase.from('reservations').select('canal').eq('statut', 'confirme'),
  ])

  const compteursCanal = (statsCanal ?? []).reduce(
    (acc: Record<string, number>, r) => {
      const key = r.canal ?? 'web'
      acc[key] = (acc[key] ?? 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

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

  const cartesCanal = (['web', 'vocal', 'manuel'] as const).map((canal) => ({
    label: LABELS_CANAL[canal],
    value: compteursCanal[canal] ?? 0,
  }))

  return (
    <AdminNav actif="accueil" nbDemandesNouvelles={nbDemandesNouvelles ?? 0}>
      <h1 className="font-[family-name:var(--font-display)] text-2xl text-[var(--color-ink)] mb-6">
        Back-office
      </h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
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

      <h2 className="text-sm font-medium text-[var(--color-ink-soft)] mb-3">
        RDV confirmés par canal
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {cartesCanal.map((c) => (
          <div key={c.label} className="ui-panel p-4">
            <p className="text-sm text-[var(--color-ink-soft)]">{c.label}</p>
            <p className="text-2xl font-semibold text-[var(--color-ink)] mt-1">{c.value}</p>
          </div>
        ))}
      </div>
    </AdminNav>
  )
}
