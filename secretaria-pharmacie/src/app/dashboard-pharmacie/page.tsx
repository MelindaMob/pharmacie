import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getUserRole } from '@/lib/auth/getRole'
import { redirect } from 'next/navigation'
import { addDays, startOfWeek } from 'date-fns'
import { fr } from 'date-fns/locale'
import DashboardCalendar from './DashboardCalendar'
import DashboardNav from './DashboardNav'
import { compterNonLusPharmacie } from '@/lib/messages/nonLus'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function DashboardPharmaciePage() {
  const role = await getUserRole()
  if (!role || role.role !== 'pharmacie') redirect('/connexion')

  const debutPeriode = startOfWeek(new Date(), { locale: fr })
  const finPeriode = addDays(debutPeriode, 28)

  const selectCreneaux =
    '*, types_rdv(nom), reservations(id, client_nom, client_telephone, client_email, statut)'

  // Service role : la RLS sur reservations peut vider l'embed et cacher tous les RDV confirmés.
  const [{ data: creneauxPeriode }, { data: creneauxReserves }] = await Promise.all([
    supabaseAdmin
      .from('creneaux')
      .select(selectCreneaux)
      .eq('pharmacie_id', role.id)
      .gte('debut', debutPeriode.toISOString())
      .lte('debut', finPeriode.toISOString())
      .order('debut', { ascending: true })
      .limit(5000),
    supabaseAdmin
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

  const nbNonLus = await compterNonLusPharmacie(role.id)

  return (
    <div className="min-h-screen bg-[var(--color-bg)] p-6">
      <div className="max-w-5xl mx-auto">
        <DashboardNav actif="calendrier" nbNonLus={nbNonLus} />

        <DashboardCalendar creneaux={creneaux} pharmacieId={role.id} />
      </div>
    </div>
  )
}
