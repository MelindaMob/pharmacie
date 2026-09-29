import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/auth/getRole'
import { redirect } from 'next/navigation'
import DashboardNav from '../DashboardNav'
import HorairesForm from '../HorairesForm'
import HorairesExceptionnelsForm from './HorairesExceptionnelsForm'
import TypesRdvForm from '../TypesRdvForm'
import DelaiAnnulationForm from '../DelaiAnnulationForm'
import { compterNonLusPharmacie } from '@/lib/messages/nonLus'
import { auMoinsUnJourOuvert } from '@/lib/pharmacie/onboarding'

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

  const { data: typesRdvData } = await supabase
    .from('types_rdv')
    .select('id, catalogue_id, duree_minutes, capacite, actif')
    .eq('pharmacie_id', role.id)
    .not('catalogue_id', 'is', null)

  const typeIds = (typesRdvData ?? []).map((t) => t.id)

  const [{ data: fenetresData }, { data: exceptionsData }, { data: exceptions }] =
    await Promise.all([
      typeIds.length > 0
        ? supabase
            .from('types_rdv_horaires')
            .select('id, type_rdv_id, jour, debut, fin')
            .in('type_rdv_id', typeIds)
        : Promise.resolve({ data: [] as { id: string; type_rdv_id: string; jour: string; debut: string; fin: string }[] }),
      typeIds.length > 0
        ? supabase
            .from('types_rdv_exceptions')
            .select('id, type_rdv_id, date_debut, date_fin, ferme, debut, fin')
            .in('type_rdv_id', typeIds)
        : Promise.resolve({
            data: [] as {
              id: string
              type_rdv_id: string
              date_debut: string
              date_fin: string
              ferme: boolean
              debut: string | null
              fin: string | null
            }[],
          }),
      supabase
        .from('horaires_exceptionnels')
        .select('id, date, ferme, horaires_speciaux')
        .eq('pharmacie_id', role.id),
    ])

  const fenetresParTypeId: Record<string, { id: string; jour: string; debut: string; fin: string }[]> = {}
  for (const f of fenetresData ?? []) {
    if (!fenetresParTypeId[f.type_rdv_id]) fenetresParTypeId[f.type_rdv_id] = []
    fenetresParTypeId[f.type_rdv_id].push(f)
  }

  const exceptionsParTypeId: Record<
    string,
    { id: string; date_debut: string; date_fin: string; ferme: boolean; debut: string | null; fin: string | null }[]
  > = {}
  for (const e of exceptionsData ?? []) {
    if (!exceptionsParTypeId[e.type_rdv_id]) exceptionsParTypeId[e.type_rdv_id] = []
    exceptionsParTypeId[e.type_rdv_id].push(e)
  }

  const nbNonLus = await compterNonLusPharmacie(role.id)

  const bloque = !auMoinsUnJourOuvert(pharmacie?.horaires_ouverture)

  return (
    <DashboardNav actif="parametres" nbNonLus={nbNonLus} bloque={bloque}>
      <div className="max-w-3xl">
        {bloque && (
          <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Configurez et enregistrez vos horaires d&apos;ouverture ci-dessous pour débloquer le
            reste du tableau de bord (calendrier, messages, manquants, infos supplémentaires).
          </div>
        )}

        <p className="text-sm text-[var(--color-ink-soft)] mb-4 break-words">
          Adresse : {pharmacie?.adresse || 'Non renseignée par Secretar.IA pour le moment'}
        </p>

        <HorairesForm
          pharmacieId={role.id}
          horairesInitiaux={pharmacie?.horaires_ouverture ?? {}}
        />
        <HorairesExceptionnelsForm pharmacieId={role.id} exceptions={exceptions ?? []} />
        <TypesRdvForm
          pharmacieId={role.id}
          catalogue={catalogue ?? []}
          typesRdv={(typesRdvData ?? []).filter((t) => t.catalogue_id != null) as {
            id: string
            catalogue_id: string
            duree_minutes: number
            capacite: number
            actif: boolean
          }[]}
          fenetresParTypeId={fenetresParTypeId}
          exceptionsParTypeId={exceptionsParTypeId}
        />
        <DelaiAnnulationForm
          pharmacieId={role.id}
          delaiInitial={pharmacie?.delai_annulation_heures ?? 2}
        />
      </div>
    </DashboardNav>
  )
}
