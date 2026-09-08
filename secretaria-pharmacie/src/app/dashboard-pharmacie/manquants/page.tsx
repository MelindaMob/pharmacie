import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getUserRole } from '@/lib/auth/getRole'
import { redirect } from 'next/navigation'
import DashboardNav from '../DashboardNav'
import ManquantsForm from './ManquantsForm'
import { compterNonLusPharmacie } from '@/lib/messages/nonLus'
import { unwrapEmbed } from '@/lib/supabase/unwrap'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type MedicamentEmbed = { id: string; denomination: string; forme_pharmaceutique: string | null }

export default async function ManquantsPage() {
  const role = await getUserRole()
  if (!role || role.role !== 'pharmacie') redirect('/connexion')

  const nbNonLus = await compterNonLusPharmacie(role.id)

  const { data } = await supabaseAdmin
    .from('manquants')
    .select(
      `
      id, quantite_manquante, patient_nom, patient_telephone, patient_email, created_at,
      medicaments (id, denomination, forme_pharmaceutique)
    `
    )
    .eq('pharmacie_id', role.id)
    .eq('disponible', false)
    .order('created_at', { ascending: false })

  const manquants = (data ?? []).map((m) => ({
    id: m.id as string,
    quantite_manquante: m.quantite_manquante as number,
    patient_nom: m.patient_nom as string,
    patient_telephone: m.patient_telephone as string,
    patient_email: m.patient_email as string | null,
    medicament: unwrapEmbed<MedicamentEmbed>(m.medicaments),
  }))

  return (
    <DashboardNav actif="manquants" nbNonLus={nbNonLus}>
      <div className="max-w-3xl">
        <h1 className="text-lg font-semibold text-[var(--color-ink)] mb-1">Produits manquants</h1>
        <p className="text-sm text-[var(--color-ink-soft)] mb-6">
          Une fiche par patient qui attend un produit précis. Pour une information générale
          (rupture ou réassort valable pour tout le monde), utilisez plutôt la page Informations.
        </p>

        <ManquantsForm pharmacieId={role.id} manquants={manquants} />
      </div>
    </DashboardNav>
  )
}
