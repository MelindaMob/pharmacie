import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getUserRole } from '@/lib/auth/getRole'
import { redirect } from 'next/navigation'
import DashboardNav from '../DashboardNav'
import InformationsForm from './InformationsForm'
import { compterNonLusPharmacie } from '@/lib/messages/nonLus'
import { horairesSontConfigures } from '@/lib/pharmacie/onboarding'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function InformationsPage() {
  const role = await getUserRole()
  if (!role || role.role !== 'pharmacie') redirect('/connexion')

  if (!(await horairesSontConfigures(role.id))) {
    redirect('/dashboard-pharmacie/parametres')
  }

  const nbNonLus = await compterNonLusPharmacie(role.id)

  const { data } = await supabaseAdmin
    .from('infos_pharmacie')
    .select('id, contenu, date_debut, date_fin, active, created_at')
    .eq('pharmacie_id', role.id)
    .order('created_at', { ascending: false })

  return (
    <DashboardNav actif="informations" nbNonLus={nbNonLus}>
      <div className="max-w-2xl">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-lg font-semibold text-[var(--color-ink)]">
            Infos supplémentaires
          </h1>
          <a
            href="/dashboard-pharmacie/aide#infos-supplementaires"
            className="text-xs underline text-[var(--color-ink-soft)]"
          >
            Aide
          </a>
        </div>

        <InformationsForm pharmacieId={role.id} infos={data ?? []} />
      </div>
    </DashboardNav>
  )
}
