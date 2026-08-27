import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/auth/getRole'
import { redirect } from 'next/navigation'
import AdminNav from '../AdminNav'
import GestionGroupements from '../GestionGroupements'

export const dynamic = 'force-dynamic'

export default async function AdminGroupementsPage() {
  const role = await getUserRole()
  if (!role || role.role !== 'admin') redirect('/connexion')

  const supabase = await createClient()

  const [{ data: groupements }, { count: nbDemandesNouvelles }] = await Promise.all([
    supabase.from('groupements').select('id, nom').order('nom'),
    supabase
      .from('demandes_contact')
      .select('*', { count: 'exact', head: true })
      .eq('statut', 'nouveau'),
  ])

  return (
    <AdminNav actif="groupements" nbDemandesNouvelles={nbDemandesNouvelles ?? 0}>
      <h1 className="font-[family-name:var(--font-display)] text-2xl text-[var(--color-ink)] mb-6">
        Groupements
      </h1>
      <GestionGroupements groupements={groupements ?? []} />
    </AdminNav>
  )
}
