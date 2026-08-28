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

/** Créneaux libres : pas de jointure reservations (volume élevé). */
const SELECT_DISPO = 'id, debut, fin, statut, type_rdv_id, types_rdv(nom)'

/** Créneaux réservés : infos client pour le calendrier. */
const SELECT_RESERVE =
  'id, debut, fin, statut, type_rdv_id, types_rdv(nom), reservations(id, client_nom, client_telephone, client_email, statut)'

type CreneauRow = {
  id: string
  debut: string
  fin: string
  statut: string
  type_rdv_id: string
  types_rdv: { nom: string } | null
  reservations: {
    id: string
    client_nom: string
    client_telephone: string
    client_email: string | null
    statut: string
  }[]
}

export default async function DashboardPharmaciePage() {
  const role = await getUserRole()
  if (!role || role.role !== 'pharmacie') redirect('/connexion')

  const debutPeriode = startOfWeek(new Date(), { locale: fr })
  const finPeriode = addDays(debutPeriode, 28)
  const debutIso = debutPeriode.toISOString()
  const finIso = finPeriode.toISOString()

  const [{ data: creneauxDispo }, { data: creneauxReserves }, nbNonLus] = await Promise.all([
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
      .from('creneaux')
      .select(SELECT_RESERVE)
      .eq('pharmacie_id', role.id)
      .eq('statut', 'reserve')
      .gte('debut', debutIso)
      .lte('debut', finIso)
      .order('debut', { ascending: true })
      .limit(500),
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
  for (const c of creneauxReserves ?? []) {
    const resas = c.reservations
    const listeResas = Array.isArray(resas)
      ? resas
      : resas
        ? [resas]
        : []
    creneauxParId.set(c.id, {
      id: c.id,
      debut: c.debut,
      fin: c.fin,
      statut: c.statut,
      type_rdv_id: c.type_rdv_id,
      types_rdv: unwrapEmbed<{ nom: string }>(c.types_rdv),
      reservations: listeResas,
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
