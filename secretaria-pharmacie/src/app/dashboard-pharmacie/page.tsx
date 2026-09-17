import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getUserRole } from '@/lib/auth/getRole'
import { redirect } from 'next/navigation'
import { addDays, startOfWeek } from 'date-fns'
import { fr } from 'date-fns/locale'
import DashboardCalendar from './DashboardCalendar'
import DashboardNav from './DashboardNav'
import { compterNonLusPharmacie } from '@/lib/messages/nonLus'
import { unwrapEmbed } from '@/lib/supabase/unwrap'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/** Créneaux encore ouverts (capacité non atteinte) — pour le filtre Disponibles. */
const SELECT_DISPO = 'id, debut, fin, statut, type_rdv_id, types_rdv(nom)'

/** Toutes les réservations de la période, y compris sur un créneau encore disponible. */
const SELECT_RESERVATIONS = `
  id, client_nom, client_telephone, client_email, statut, canal, creneau_id,
  creneaux!inner(id, debut, fin, statut, type_rdv_id, types_rdv(nom))
`

type ReservationInfo = {
  id: string
  client_nom: string
  client_telephone: string
  client_email: string | null
  statut: string
  canal?: string
}

type CreneauRow = {
  id: string
  debut: string
  fin: string
  statut: string
  type_rdv_id: string
  types_rdv: { nom: string } | null
  reservations: ReservationInfo[]
}

export default async function DashboardPharmaciePage() {
  const role = await getUserRole()
  if (!role || role.role !== 'pharmacie') redirect('/connexion')

  const debutPeriode = startOfWeek(new Date(), { locale: fr })
  const finPeriode = addDays(debutPeriode, 28)
  const debutIso = debutPeriode.toISOString()
  const finIso = finPeriode.toISOString()

  const [{ data: creneauxDispo }, { data: reservationsPeriode }, nbNonLus] = await Promise.all([
    supabaseAdmin
      .from('creneaux')
      .select(SELECT_DISPO)
      .eq('pharmacie_id', role.id)
      .eq('statut', 'disponible')
      .gte('debut', debutIso)
      .lte('debut', finIso)
      .order('debut', { ascending: true })
      .limit(5000),
    supabaseAdmin
      .from('reservations')
      .select(SELECT_RESERVATIONS)
      .eq('creneaux.pharmacie_id', role.id)
      .gte('creneaux.debut', debutIso)
      .lte('creneaux.debut', finIso)
      .limit(2000),
    compterNonLusPharmacie(role.id),
  ])

  const creneauxParId = new Map<string, CreneauRow>()

  for (const c of creneauxDispo ?? []) {
    creneauxParId.set(c.id, {
      id: c.id,
      debut: c.debut,
      fin: c.fin,
      statut: c.statut,
      type_rdv_id: c.type_rdv_id,
      types_rdv: unwrapEmbed<{ nom: string }>(c.types_rdv),
      reservations: [],
    })
  }

  for (const r of reservationsPeriode ?? []) {
    const creneau = unwrapEmbed<{
      id: string
      debut: string
      fin: string
      statut: string
      type_rdv_id: string
      types_rdv: unknown
    }>(r.creneaux)
    if (!creneau) continue

    const resa: ReservationInfo = {
      id: r.id as string,
      client_nom: r.client_nom as string,
      client_telephone: r.client_telephone as string,
      client_email: (r.client_email as string | null) ?? null,
      statut: r.statut as string,
      canal: r.canal as string | undefined,
    }

    const existant = creneauxParId.get(creneau.id)
    if (existant) {
      existant.reservations.push(resa)
      continue
    }

    creneauxParId.set(creneau.id, {
      id: creneau.id,
      debut: creneau.debut,
      fin: creneau.fin,
      statut: creneau.statut,
      type_rdv_id: creneau.type_rdv_id,
      types_rdv: unwrapEmbed<{ nom: string }>(creneau.types_rdv),
      reservations: [resa],
    })
  }

  const creneaux = Array.from(creneauxParId.values()).sort(
    (a, b) => new Date(a.debut).getTime() - new Date(b.debut).getTime()
  )

  return (
    <DashboardNav actif="calendrier" nbNonLus={nbNonLus}>
      <DashboardCalendar creneaux={creneaux} pharmacieId={role.id} />
    </DashboardNav>
  )
}
