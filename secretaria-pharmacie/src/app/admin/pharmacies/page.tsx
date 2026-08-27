import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/auth/getRole'
import { redirect } from 'next/navigation'
import AdminNav from '../AdminNav'
import CreerPharmacieForm from '../CreerPharmacieForm'
import GestionPharmacies from '../GestionPharmacies'

export const dynamic = 'force-dynamic'

export default async function AdminPharmaciesPage() {
  const role = await getUserRole()
  if (!role || role.role !== 'admin') redirect('/connexion')

  const supabase = await createClient()

  const [{ data: groupements }, { data: pharmacies }, { count: nbDemandesNouvelles }] =
    await Promise.all([
      supabase.from('groupements').select('id, nom').order('nom'),
      supabase
        .from('pharmacies')
        .select('id, nom, adresse, telephone, groupement_id, created_at')
        .order('created_at', { ascending: false }),
      supabase
        .from('demandes_contact')
        .select('*', { count: 'exact', head: true })
        .eq('statut', 'nouveau'),
    ])

  return (
    <AdminNav actif="pharmacies" nbDemandesNouvelles={nbDemandesNouvelles ?? 0}>
      <h1 className="font-[family-name:var(--font-display)] text-2xl text-[var(--color-ink)] mb-6">
        Pharmacies
      </h1>
      <CreerPharmacieForm groupements={groupements ?? []} />
      <GestionPharmacies pharmacies={pharmacies ?? []} groupements={groupements ?? []} />
    </AdminNav>
  )
}
