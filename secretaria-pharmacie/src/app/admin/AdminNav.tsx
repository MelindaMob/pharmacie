import DashboardShell from '@/components/DashboardShell'

export type AdminOnglet = 'accueil' | 'pharmacies' | 'groupements' | 'demandes'

export default function AdminNav({
  actif,
  nbDemandesNouvelles = 0,
  children,
}: {
  actif: AdminOnglet
  nbDemandesNouvelles?: number
  children: React.ReactNode
}) {
  return (
    <DashboardShell
      homeHref="/admin"
      maxWidthClass="max-w-5xl"
      actif={actif}
      tabs={[
        { key: 'accueil', label: 'Accueil', href: '/admin' },
        { key: 'pharmacies', label: 'Pharmacies', href: '/admin/pharmacies' },
        { key: 'groupements', label: 'Groupements', href: '/admin/groupements' },
        {
          key: 'demandes',
          label: 'Demandes',
          href: '/admin/demandes',
          badge: nbDemandesNouvelles,
        },
      ]}
    >
      {children}
    </DashboardShell>
  )
}
