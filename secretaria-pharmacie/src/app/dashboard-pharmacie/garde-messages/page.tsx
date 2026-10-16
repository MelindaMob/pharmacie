import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getUserRole } from '@/lib/auth/getRole'
import { redirect } from 'next/navigation'
import DashboardNav from '../DashboardNav'
import MessagesGardeList, { type MessageGarde } from './MessagesGardeList'
import { compterNonLusPharmacie } from '@/lib/messages/nonLus'

export const dynamic = 'force-dynamic'

// Table à RLS sans policy : lecture côté serveur avec la clé service role, filtrée par pharmacie.
const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function MessagesGardePage() {
  const role = await getUserRole()
  if (!role || role.role !== 'pharmacie') redirect('/connexion')

  const [nbNonLus, { data }] = await Promise.all([
    compterNonLusPharmacie(role.id),
    supabaseAdmin
      .from('messages_garde')
      .select(
        'id, created_at, priorite, appelant_type, demandeur_nom, patient_nom, telephone, age_patient, ordonnance, medicament, categorie, type_delivrance, traitement_restant, motif, patient_a_risque, delai_souhaite, resume, traite'
      )
      .eq('pharmacie_id', role.id)
      .order('created_at', { ascending: false })
      .limit(200),
  ])

  return (
    <DashboardNav actif="garde" nbNonLus={nbNonLus}>
      <div className="max-w-3xl">
        <h1 className="text-lg font-semibold text-[var(--color-ink)] mb-1">Appels de garde</h1>
        <p className="text-sm text-[var(--color-ink-soft)] mb-6">
          Résumé écrit de chaque appel reçu pendant la garde, à rappeler si vous le jugez nécessaire.
        </p>
        <MessagesGardeList messages={(data ?? []) as MessageGarde[]} />
      </div>
    </DashboardNav>
  )
}
