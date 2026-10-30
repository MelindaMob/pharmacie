import DashboardShell from '@/components/DashboardShell'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardNav({
  actif,
  nbNonLus = 0,
  bloque = false,
  children,
}: {
  actif: 'calendrier' | 'parametres' | 'messages' | 'manquants' | 'informations' | 'garde' | 'appels' | 'aide'
  nbNonLus?: number
  /** true tant que les horaires ne sont pas configurés : grise tous les onglets sauf Paramètres et Aide. */
  bloque?: boolean
  children: React.ReactNode
}) {
  // Pharmacie « garde seule » : seuls Appels de garde, Paramètres et Aide sont proposés.
  let gardeSeule = false
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase
        .from('pharmacies')
        .select('garde_seule')
        .eq('auth_user_id', user.id)
        .maybeSingle()
      gardeSeule = !!data?.garde_seule
    }
  } catch {
    gardeSeule = false
  }

  const tousLesOnglets = [
    { key: 'calendrier', label: 'Calendrier', href: '/dashboard-pharmacie' },
    {
      key: 'messages',
      label: 'Messages',
      href: '/dashboard-pharmacie/messages',
      badge: nbNonLus,
    },
    { key: 'manquants', label: 'Manquants', href: '/dashboard-pharmacie/manquants' },
    {
      key: 'appels',
      label: 'Messages reçus',
      labelCourt: 'Reçus',
      href: '/dashboard-pharmacie/appels',
    },
    {
      key: 'informations',
      label: 'Infos supplémentaires',
      labelCourt: 'Infos',
      href: '/dashboard-pharmacie/informations',
    },
    {
      key: 'garde',
      label: 'Appels de garde',
      labelCourt: 'Garde',
      href: '/dashboard-pharmacie/garde-messages',
    },
    { key: 'parametres', label: 'Paramètres', href: '/dashboard-pharmacie/parametres' },
    { key: 'aide', label: 'Aide', href: '/dashboard-pharmacie/aide' },
  ]

  const tabs = tousLesOnglets
    .filter((tab) => !gardeSeule || ['garde', 'parametres', 'aide'].includes(tab.key))
    .map((tab) => ({
      ...tab,
      disabled: bloque && tab.key !== 'parametres' && tab.key !== 'aide',
    }))

  return (
    <DashboardShell homeHref="/dashboard-pharmacie" maxWidthClass="max-w-5xl" actif={actif} tabs={tabs}>
      {children}
    </DashboardShell>
  )
}
