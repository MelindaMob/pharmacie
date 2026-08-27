import DashboardShell from '@/components/DashboardShell'

export function NavDashboardClient({
  actif,
  nbNonLus = 0,
  children,
}: {
  actif: 'rdv' | 'messages'
  nbNonLus?: number
  children: React.ReactNode
}) {
  return (
    <DashboardShell
      homeHref="/dashboard-client"
      maxWidthClass="max-w-3xl"
      actif={actif}
      tabs={[
        { key: 'rdv', label: 'Rendez-vous', href: '/dashboard-client' },
        {
          key: 'messages',
          label: 'Messages',
          href: '/dashboard-client/messages',
          badge: nbNonLus,
        },
      ]}
    >
      {children}
    </DashboardShell>
  )
}
