import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/auth/getRole'
import { redirect } from 'next/navigation'
import DashboardNav from '../DashboardNav'
import HorairesForm from '../HorairesForm'
import HorairesExceptionnelsForm from './HorairesExceptionnelsForm'
import GardeForm from './GardeForm'
import EquipeForm from '../EquipeForm'
import TypesRdvForm from '../TypesRdvForm'
import DelaiAnnulationForm from '../DelaiAnnulationForm'
import { compterNonLusPharmacie } from '@/lib/messages/nonLus'
import { auMoinsUnJourOuvert } from '@/lib/pharmacie/onboarding'

export const dynamic = 'force-dynamic'

// Tables à RLS sans policy (types_rdv_horaires, types_rdv_exceptions, gardes_periodes) :
// lues ici côté serveur avec la clé service role, toujours filtrées par la pharmacie connectée.
const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function ParametresPharmaciePage() {
  const role = await getUserRole()
  if (!role || role.role !== 'pharmacie') redirect('/connexion')

  const supabase = await createClient()

  const { data: pharmacie } = await supabase
    .from('pharmacies')
    .select('horaires_ouverture, adresse, delai_annulation_heures, numero_garde, garde_seule')
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

  const [
    { data: fenetresData },
    { data: exceptionsData },
    { data: exceptions },
    { data: gardesData },
    { data: professionnelsData },
    { data: liensEquipeData },
    { data: horairesProsData },
  ] = await Promise.all([
      typeIds.length > 0
        ? supabaseAdmin
            .from('types_rdv_horaires')
            .select('id, type_rdv_id, jour, debut, fin')
            .in('type_rdv_id', typeIds)
        : Promise.resolve({ data: [] as { id: string; type_rdv_id: string; jour: string; debut: string; fin: string }[] }),
      typeIds.length > 0
        ? supabaseAdmin
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
      supabaseAdmin
        .from('gardes_periodes')
        .select('id, debut, fin')
        .eq('pharmacie_id', role.id)
        .gt('fin', new Date().toISOString()),
      supabaseAdmin
        .from('professionnels')
        .select('id, nom, actif')
        .eq('pharmacie_id', role.id)
        .order('created_at', { ascending: true }),
      typeIds.length > 0
        ? supabaseAdmin
            .from('types_rdv_professionnels')
            .select('type_rdv_id, professionnel_id')
            .in('type_rdv_id', typeIds)
        : Promise.resolve({ data: [] as { type_rdv_id: string; professionnel_id: string }[] }),
      supabaseAdmin
        .from('professionnels_horaires')
        .select('id, professionnel_id, jour, debut, fin, professionnels!inner(pharmacie_id)')
        .eq('professionnels.pharmacie_id', role.id),
    ])

  const horairesParPro: Record<string, { id: string; jour: string; debut: string; fin: string }[]> = {}
  for (const h of horairesProsData ?? []) {
    if (!horairesParPro[h.professionnel_id]) horairesParPro[h.professionnel_id] = []
    horairesParPro[h.professionnel_id].push({ id: h.id, jour: h.jour, debut: h.debut, fin: h.fin })
  }

  const equipeParTypeId: Record<string, string[]> = {}
  for (const l of liensEquipeData ?? []) {
    if (!equipeParTypeId[l.type_rdv_id]) equipeParTypeId[l.type_rdv_id] = []
    equipeParTypeId[l.type_rdv_id].push(l.professionnel_id)
  }

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

  const gardeSeule = !!pharmacie?.garde_seule
  const bloque = !gardeSeule && !auMoinsUnJourOuvert(pharmacie?.horaires_ouverture)

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

        {!gardeSeule && (
          <>
            <HorairesForm
              pharmacieId={role.id}
              horairesInitiaux={pharmacie?.horaires_ouverture ?? {}}
            />
            <HorairesExceptionnelsForm pharmacieId={role.id} exceptions={exceptions ?? []} />
          </>
        )}
        <GardeForm
          pharmacieId={role.id}
          numeroGarde={pharmacie?.numero_garde ?? null}
          periodes={gardesData ?? []}
        />
        {!gardeSeule && (
          <>
        <EquipeForm
          pharmacieId={role.id}
          professionnels={professionnelsData ?? []}
          horairesParPro={horairesParPro}
        />
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
          equipe={professionnelsData ?? []}
          equipeParTypeId={equipeParTypeId}
        />
        <DelaiAnnulationForm
          pharmacieId={role.id}
          delaiInitial={pharmacie?.delai_annulation_heures ?? 2}
        />
          </>
        )}
      </div>
    </DashboardNav>
  )
}
