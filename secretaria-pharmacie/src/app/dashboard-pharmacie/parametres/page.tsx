import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/auth/getRole'
import { redirect } from 'next/navigation'
import DashboardNav from '../DashboardNav'
import HorairesEtGeneration from '../HorairesEtGeneration'
import HorairesExceptionnelsForm from './HorairesExceptionnelsForm'
import TypesRdvForm from '../TypesRdvForm'
import DelaiAnnulationForm from '../DelaiAnnulationForm'
import { compterNonLusPharmacie } from '@/lib/messages/nonLus'

export const dynamic = 'force-dynamic'

export default async function ParametresPharmaciePage() {
  const role = await getUserRole()
  if (!role || role.role !== 'pharmacie') redirect('/connexion')

  const supabase = await createClient()

  const { data: pharmacie } = await supabase
    .from('pharmacies')
    .select('horaires_ouverture, adresse, delai_annulation_heures')
    .eq('id', role.id)
    .single()

  const { data: catalogue } = await supabase
    .from('catalogue_types_rdv')
    .select('id, nom, categorie, duree_minutes_defaut')
    .order('categorie', { ascending: true })

  const { data: typesActifsData } = await supabase
    .from('types_rdv')
    .select('id, catalogue_id, duree_minutes')
    .eq('pharmacie_id', role.id)
    .not('catalogue_id', 'is', null)

  const { data: exceptions } = await supabase
    .from('horaires_exceptionnels')
    .select('id, date, ferme, horaires_speciaux')
    .eq('pharmacie_id', role.id)

  const nbNonLus = await compterNonLusPharmacie(role.id)

  return (
    <DashboardNav actif="parametres" nbNonLus={nbNonLus}>
      <div className="max-w-3xl">
        <p className="text-sm text-[var(--color-ink-soft)] mb-4 break-words">
          Adresse : {pharmacie?.adresse || 'Non renseignée par Secretar.IA pour le moment'}
        </p>

        <HorairesEtGeneration
          pharmacieId={role.id}
          horairesInitiaux={pharmacie?.horaires_ouverture ?? {}}
        />
        <HorairesExceptionnelsForm pharmacieId={role.id} exceptions={exceptions ?? []} />
        <TypesRdvForm
          pharmacieId={role.id}
          catalogue={catalogue ?? []}
          typesActifs={(typesActifsData ?? []).filter((t) => t.catalogue_id != null) as {
            id: string
            catalogue_id: string
            duree_minutes: number
          }[]}
        />
        <DelaiAnnulationForm
          pharmacieId={role.id}
          delaiInitial={pharmacie?.delai_annulation_heures ?? 2}
        />
      </div>
    </DashboardNav>
  )
}
