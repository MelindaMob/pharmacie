import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/auth/getRole'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import BoutonDeconnexion from '@/components/BoutonDeconnexion'
import Logo from '@/components/Logo'
import ListeDemandesContact from './ListeDemandesContact'

export const dynamic = 'force-dynamic'

export default async function DemandesContactPage() {
  const role = await getUserRole()
  if (!role || role.role !== 'admin') redirect('/connexion')

  const supabase = await createClient()

  const { data: demandes } = await supabase
    .from('demandes_contact')
    .select(
      'id, nom_pharmacie, email, telephone, message, est_independante, nom_groupement, statut, created_at'
    )
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-4 sm:p-6 lg:p-8">
        <div className="sticky top-0 z-20 -mx-4 px-4 sm:mx-0 sm:px-0 py-3 mb-6 flex items-center justify-between gap-4 sm:gap-8 bg-[color-mix(in_srgb,var(--color-bg)_92%,transparent)] backdrop-blur-md">
          <Logo className="h-8 sm:h-9 w-auto" href="/admin" />
          <BoutonDeconnexion />
        </div>

        <Link
          href="/admin"
          className="text-sm text-[var(--color-primary)] hover:underline mb-4 inline-block"
        >
          ← Retour au back-office
        </Link>

        <h1 className="font-[family-name:var(--font-display)] text-2xl text-[var(--color-ink)] mb-6">
          Demandes de contact
        </h1>

        <ListeDemandesContact demandes={demandes ?? []} />
      </div>
    </div>
  )
}
