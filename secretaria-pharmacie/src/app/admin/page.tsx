import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/auth/getRole'
import { redirect } from 'next/navigation'
import CreerPharmacieForm from './CreerPharmacieForm'
import GestionGroupements from './GestionGroupements'
import GestionPharmacies from './GestionPharmacies'
import BoutonDeconnexion from '@/components/BoutonDeconnexion'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const role = await getUserRole()
  if (!role || role.role !== 'admin') redirect('/connexion')

  const supabase = await createClient()

  const { data: groupements } = await supabase
    .from('groupements')
    .select('id, nom')
    .order('nom')

  const { data: pharmacies } = await supabase
    .from('pharmacies')
    .select('id, nom, adresse, telephone, groupement_id, created_at')
    .order('created_at', { ascending: false })

  const { count: nbReservations } = await supabase
    .from('reservations')
    .select('*', { count: 'exact', head: true })
    .eq('statut', 'confirme')

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Back-office</h1>
        <BoutonDeconnexion />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="border rounded-lg p-4">
          <p className="text-sm text-gray-500">Pharmacies</p>
          <p className="text-2xl font-bold">{pharmacies?.length ?? 0}</p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-sm text-gray-500">Groupements</p>
          <p className="text-2xl font-bold">{groupements?.length ?? 0}</p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-sm text-gray-500">RDV confirmés</p>
          <p className="text-2xl font-bold">{nbReservations ?? 0}</p>
        </div>
      </div>

      <CreerPharmacieForm groupements={groupements ?? []} />
      <GestionGroupements groupements={groupements ?? []} />
      <GestionPharmacies pharmacies={pharmacies ?? []} groupements={groupements ?? []} />
    </div>
  )
}
