import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/auth/getRole'
import { redirect } from 'next/navigation'
import DashboardCalendar from './DashboardCalendar'
import HorairesForm from './HorairesForm'
import GenererCreneauxButton from './GenererCreneauxButton'
import AdresseForm from './AdresseForm'

export default async function DashboardPharmaciePage() {
  const role = await getUserRole()
  if (!role || role.role !== 'pharmacie') redirect('/connexion')

  const supabase = await createClient()

  const { data: pharmacie } = await supabase
    .from('pharmacies')
    .select('adresse, horaires_ouverture')
    .eq('id', role.id)
    .single()

  const { data: creneaux } = await supabase
    .from('creneaux')
    .select('*, types_rdv(nom), reservations(client_nom, client_telephone, statut)')
    .eq('pharmacie_id', role.id)
    .order('debut', { ascending: true })

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Votre dashboard</h1>
      <AdresseForm pharmacieId={role.id} adresseInitiale={pharmacie?.adresse} />
      <HorairesForm
        pharmacieId={role.id}
        horairesInitiaux={pharmacie?.horaires_ouverture ?? {}}
      />
      <GenererCreneauxButton pharmacieId={role.id} />
      <DashboardCalendar creneaux={creneaux ?? []} />
    </div>
  )
}
