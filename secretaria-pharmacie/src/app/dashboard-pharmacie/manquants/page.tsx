import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getUserRole } from '@/lib/auth/getRole'
import { redirect } from 'next/navigation'
import DashboardNav from '../DashboardNav'
import ManquantsForm from './ManquantsForm'
import { compterNonLusPharmacie } from '@/lib/messages/nonLus'
import { unwrapEmbed } from '@/lib/supabase/unwrap'
import { horairesSontConfigures } from '@/lib/pharmacie/onboarding'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type MedicamentEmbed = { id: string; denomination: string; forme_pharmaceutique: string | null }

const SEPT_JOURS_MS = 7 * 24 * 60 * 60 * 1000

export default async function ManquantsPage() {
  const role = await getUserRole()
  if (!role || role.role !== 'pharmacie') redirect('/connexion')

  if (!(await horairesSontConfigures(role.id))) {
    redirect('/dashboard-pharmacie/parametres')
  }

  const nbNonLus = await compterNonLusPharmacie(role.id)

  // Purge best-effort des fiches délivrées depuis plus de 7 jours (en plus du
  // job planifié pg_cron côté SQL : ceinture et bretelles, indépendant du
  // plan Supabase). Server Component : horodatage de purge, pas du rendu client.
  // eslint-disable-next-line react-hooks/purity
  const seuil = new Date(Date.now() - SEPT_JOURS_MS).toISOString()
  await supabaseAdmin
    .from('manquants')
    .delete()
    .eq('pharmacie_id', role.id)
    .eq('delivre', true)
    .lt('delivre_le', seuil)

  const { data } = await supabaseAdmin
    .from('manquants')
    .select(
      `
      id, patient_nom, patient_telephone, disponible, delivre, delivre_le, created_at,
      medicaments (id, denomination, forme_pharmaceutique)
    `
    )
    .eq('pharmacie_id', role.id)
    .order('created_at', { ascending: false })

  const manquants = (data ?? []).map((m) => ({
    id: m.id as string,
    patient_nom: m.patient_nom as string,
    patient_telephone: m.patient_telephone as string,
    disponible: m.disponible as boolean,
    delivre: m.delivre as boolean,
    medicament: unwrapEmbed<MedicamentEmbed>(m.medicaments),
  }))

  return (
    <DashboardNav actif="manquants" nbNonLus={nbNonLus}>
      <div className="max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-lg font-semibold text-[var(--color-ink)]">Produits manquants</h1>
          <a
            href="/dashboard-pharmacie/aide#manquants"
            className="text-xs underline text-[var(--color-ink-soft)]"
          >
            Aide
          </a>
        </div>

        <ManquantsForm pharmacieId={role.id} manquants={manquants} />
      </div>
    </DashboardNav>
  )
}
