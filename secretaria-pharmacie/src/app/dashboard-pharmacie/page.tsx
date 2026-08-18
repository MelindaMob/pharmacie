import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/auth/getRole'
import { redirect } from 'next/navigation'
import { addDays, startOfWeek } from 'date-fns'
import { fr } from 'date-fns/locale'
import DashboardCalendar from './DashboardCalendar'
import HorairesForm from './HorairesForm'
import GenererCreneauxButton from './GenererCreneauxButton'
import AdresseForm from './AdresseForm'
import TypesRdvForm from './TypesRdvForm'
import DelaiAnnulationForm from './DelaiAnnulationForm'

export const dynamic = 'force-dynamic'

export default async function DashboardPharmaciePage() {
  const role = await getUserRole()
  if (!role || role.role !== 'pharmacie') redirect('/connexion')

  const supabase = await createClient()

  const { data: pharmacie } = await supabase
    .from('pharmacies')
    .select('adresse, horaires_ouverture, delai_annulation_heures')
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

  const debutPeriode = startOfWeek(new Date(), { locale: fr })
  const finPeriode = addDays(debutPeriode, 28) // 4 semaines glissantes

  const selectCreneaux =
    '*, types_rdv(nom), reservations(client_nom, client_telephone, statut)'

  // Même sur 4 semaines, les doublons (1 créneau × N types) dépassent souvent 1000 lignes.
  // On charge la période + on force l'inclusion des réservés.
  const [{ data: creneauxPeriode }, { data: creneauxReserves }] = await Promise.all([
    supabase
      .from('creneaux')
      .select(selectCreneaux)
      .eq('pharmacie_id', role.id)
      .gte('debut', debutPeriode.toISOString())
      .lte('debut', finPeriode.toISOString())
      .order('debut', { ascending: true })
      .limit(5000),
    supabase
      .from('creneaux')
      .select(selectCreneaux)
      .eq('pharmacie_id', role.id)
      .eq('statut', 'reserve')
      .gte('debut', debutPeriode.toISOString())
      .lte('debut', finPeriode.toISOString())
      .order('debut', { ascending: true })
      .limit(500),
  ])

  const creneauxParId = new Map<string, NonNullable<typeof creneauxPeriode>[number]>()
  for (const c of creneauxPeriode ?? []) creneauxParId.set(c.id, c)
  for (const c of creneauxReserves ?? []) creneauxParId.set(c.id, c)

  const creneaux = Array.from(creneauxParId.values()).sort(
    (a, b) => new Date(a.debut).getTime() - new Date(b.debut).getTime()
  )

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Votre dashboard</h1>
      <AdresseForm pharmacieId={role.id} adresseInitiale={pharmacie?.adresse} />
      <TypesRdvForm
        pharmacieId={role.id}
        catalogue={catalogue ?? []}
        typesActifs={(typesActifsData ?? []).filter((t) => t.catalogue_id != null) as {
          id: string
          catalogue_id: string
          duree_minutes: number
        }[]}
      />
      <HorairesForm
        pharmacieId={role.id}
        horairesInitiaux={pharmacie?.horaires_ouverture ?? {}}
      />
      <DelaiAnnulationForm
        pharmacieId={role.id}
        delaiInitial={pharmacie?.delai_annulation_heures ?? 2}
      />
      <GenererCreneauxButton pharmacieId={role.id} />
      <DashboardCalendar creneaux={creneaux} />
    </div>
  )
}

