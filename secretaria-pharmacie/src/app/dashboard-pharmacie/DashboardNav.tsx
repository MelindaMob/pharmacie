import DashboardShell from '@/components/DashboardShell'

export default function DashboardNav({
  actif,
  nbNonLus = 0,
  bloque = false,
  children,
}: {
  actif: 'calendrier' | 'parametres' | 'messages' | 'manquants' | 'informations' | 'aide'
  nbNonLus?: number
  /** true tant que les horaires ne sont pas configurés : grise tous les onglets sauf Paramètres et Aide. */
  bloque?: boolean
  children: React.ReactNode
}) {
  const tabs = [
    { key: 'calendrier', label: 'Calendrier', href: '/dashboard-pharmacie' },
    {
      key: 'messages',
      label: 'Messages',
      href: '/dashboard-pharmacie/messages',
      badge: nbNonLus,
    },
    { key: 'manquants', label: 'Manquants', href: '/dashboard-pharmacie/manquants' },
    {
      key: 'informations',
      label: 'Infos supplémentaires',
      href: '/dashboard-pharmacie/informations',
    },
    { key: 'parametres', label: 'Paramètres', href: '/dashboard-pharmacie/parametres' },
    { key: 'aide', label: 'Aide', href: '/dashboard-pharmacie/aide' },
  ].map((tab) => ({
    ...tab,
    disabled: bloque && tab.key !== 'parametres' && tab.key !== 'aide',
  }))

  return (
    <DashboardShell homeHref="/dashboard-pharmacie" maxWidthClass="max-w-5xl" actif={actif} tabs={tabs}>
      {children}
    </DashboardShell>
  )
}
