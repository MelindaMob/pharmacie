import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/auth/getRole'
import { redirect, notFound } from 'next/navigation'
import AdminNav from '../../AdminNav'
import FichePharmacieAdmin from './FichePharmacieAdmin'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function AdminPharmaciePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const role = await getUserRole()
  if (!role || role.role !== 'admin') redirect('/connexion')

  const { id } = await params
  const supabase = await createClient()

  const [{ data: pharmacie }, { count: nbDemandesNouvelles }] = await Promise.all([
    supabaseAdmin
      .from('pharmacies')
      .select(
        'id, nom, adresse, telephone, retell_phone_number, auth_user_id, horaires_ouverture, groupement_id, groupements(nom)'
      )
      .eq('id', id)
      .single(),
    supabase
      .from('demandes_contact')
      .select('*', { count: 'exact', head: true })
      .eq('statut', 'nouveau'),
  ])

  if (!pharmacie) notFound()

  let email = ''
  if (pharmacie.auth_user_id) {
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(pharmacie.auth_user_id)
    email = authUser.user?.email ?? ''
  }

  const { data: typesRdv } = await supabaseAdmin
    .from('types_rdv')
    .select('id, nom, duree_minutes')
    .eq('pharmacie_id', id)
    .order('nom')

  const groupementRaw = pharmacie.groupements as { nom: string } | { nom: string }[] | null
  const groupementNom = Array.isArray(groupementRaw)
    ? groupementRaw[0]?.nom ?? null
    : groupementRaw?.nom ?? null

  return (
    <AdminNav actif="pharmacies" nbDemandesNouvelles={nbDemandesNouvelles ?? 0}>
      <FichePharmacieAdmin
        pharmacie={{
          id: pharmacie.id,
          nom: pharmacie.nom,
          adresse: pharmacie.adresse ?? '',
          telephone: pharmacie.telephone ?? '',
          retell_phone_number: pharmacie.retell_phone_number ?? null,
          email,
          groupement_nom: groupementNom,
          horaires_ouverture: pharmacie.horaires_ouverture ?? null,
          types_rdv: typesRdv ?? [],
        }}
      />
    </AdminNav>
  )
}
