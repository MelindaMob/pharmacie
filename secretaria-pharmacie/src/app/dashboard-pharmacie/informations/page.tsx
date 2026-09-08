import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getUserRole } from '@/lib/auth/getRole'
import { redirect } from 'next/navigation'
import DashboardNav from '../DashboardNav'
import InformationsForm from './InformationsForm'
import { compterNonLusPharmacie } from '@/lib/messages/nonLus'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function InformationsPage() {
  const role = await getUserRole()
  if (!role || role.role !== 'pharmacie') redirect('/connexion')

  const nbNonLus = await compterNonLusPharmacie(role.id)

  const { data } = await supabaseAdmin
    .from('infos_pharmacie')
    .select('id, contenu, date_fin, active, created_at')
    .eq('pharmacie_id', role.id)
    .order('created_at', { ascending: false })

  return (
    <DashboardNav actif="informations" nbNonLus={nbNonLus}>
      <div className="max-w-2xl">
        <h1 className="text-lg font-semibold text-[var(--color-ink)] mb-1">
          Infos supplémentaires
        </h1>
        <p className="text-sm text-[var(--color-ink-soft)] mb-6">
          Tout ce que vous écrivez ici, Paul peut le dire aux patients qui appellent —
          chargé silencieusement au début de chaque appel, comme vos horaires. Mettez une
          date de fin pour une info ponctuelle (elle disparaîtra toute seule), ou laissez-la
          vide pour une info à désactiver vous-même le moment venu.
        </p>

        <InformationsForm pharmacieId={role.id} infos={data ?? []} />
      </div>
    </DashboardNav>
  )
}
