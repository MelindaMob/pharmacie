import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getUserRole } from '@/lib/auth/getRole'
import { redirect } from 'next/navigation'
import DashboardNav from '../DashboardNav'
import AppelsList, { type MessageAppel } from './AppelsList'
import { compterNonLusPharmacie } from '@/lib/messages/nonLus'

export const dynamic = 'force-dynamic'

// Table à RLS sans policy : lecture côté serveur avec la clé service role, filtrée par pharmacie.
const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function AppelsPage() {
  const role = await getUserRole()
  if (!role || role.role !== 'pharmacie') redirect('/connexion')

  await supabaseAdmin.rpc('purger_messages_appels')

  const [nbNonLus, { data }] = await Promise.all([
    compterNonLusPharmacie(role.id),
    supabaseAdmin
      .from('messages_appels')
      .select('id, created_at, categorie, demandeur_nom, organisme, telephone, resume, traite')
      .eq('pharmacie_id', role.id)
      .order('created_at', { ascending: false })
      .limit(300),
  ])

  return (
    <DashboardNav actif="appels" nbNonLus={nbNonLus}>
      <div className="max-w-3xl">
        <h1 className="text-lg font-semibold text-[var(--color-ink)] mb-1">Messages reçus</h1>
        <p className="text-sm text-[var(--color-ink-soft)] mb-4">
          Messages laissés à l&apos;assistant vocal (démarchage, professionnels de santé, autres demandes).
          Vous décidez de rappeler ou non. Effacés automatiquement après 30 jours.
        </p>
        <AppelsList messages={(data ?? []) as MessageAppel[]} />
      </div>
    </DashboardNav>
  )
}
