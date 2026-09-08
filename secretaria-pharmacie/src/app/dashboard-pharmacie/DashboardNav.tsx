import DashboardShell from '@/components/DashboardShell'

export default function DashboardNav({
  actif,
  nbNonLus = 0,
  children,
}: {
  actif: 'calendrier' | 'parametres' | 'messages' | 'manquants'
  nbNonLus?: number
  children: React.ReactNode
}) {
  return (
    <DashboardShell
      homeHref="/dashboard-pharmacie"
      maxWidthClass="max-w-5xl"
      actif={actif}
      tabs={[
        { key: 'calendrier', label: 'Calendrier', href: '/dashboard-pharmacie' },
        {
          key: 'messages',
          label: 'Messages',
          href: '/dashboard-pharmacie/messages',
          badge: nbNonLus,
        },
        { key: 'manquants', label: 'Manquants', href: '/dashboard-pharmacie/manquants' },
        { key: 'parametres', label: 'Paramètres', href: '/dashboard-pharmacie/parametres' },
      ]}
    >
      {children}
    </DashboardShell>
  )
}
