import { createClient } from '@supabase/supabase-js'
import { addDays, addMinutes, format, startOfDay } from 'date-fns'
import { fromZonedTime, toZonedTime } from 'date-fns-tz'

const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
const TZ = 'Europe/Paris'

function messageErreur(error: unknown): string {
  if (!error) return 'Erreur inconnue'
  if (typeof error === 'string') return error
  if (typeof error === 'object' && error !== null) {
    const e = error as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown }
    if (typeof e.message === 'string' && e.message.trim()) return e.message
    try {
      return JSON.stringify(error)
    } catch {
      return 'Erreur inconnue'
    }
  }
  return 'Erreur inconnue'
}

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function generateCreneauxPourPharmacie(
  pharmacieId: string,
  nbJours: number = 28 // 4 semaines
) {
  const supabase = adminClient()

  // 1. Récupérer la pharmacie (horaires + types de RDV)
  const { data: pharmacie } = await supabase
    .from('pharmacies')
    .select('id, horaires_ouverture')
    .eq('id', pharmacieId)
    .single()

  if (!pharmacie?.horaires_ouverture) {
    return { success: false, count: 0, error: 'Horaires non configurés' }
  }

  const { data: typesRdv } = await supabase
    .from('types_rdv')
    .select('id, duree_minutes')
    .eq('pharmacie_id', pharmacieId)

  if (!typesRdv || typesRdv.length === 0) {
    return { success: false, count: 0, error: 'Aucun type de RDV configuré' }
  }

  // Référence « aujourd’hui » en heure de Paris (évite le décalage UTC de Vercel)
  const maintenantParis = toZonedTime(new Date(), TZ)
  const debutPeriodeParis = startOfDay(maintenantParis)
  const finPeriodeParis = addDays(debutPeriodeParis, nbJours)

  // 2. Récupérer les horaires exceptionnels sur la période
  const { data: exceptions } = await supabase
    .from('horaires_exceptionnels')
    .select('date, ferme, horaires_speciaux')
    .eq('pharmacie_id', pharmacieId)
    .gte('date', format(debutPeriodeParis, 'yyyy-MM-dd'))
    .lte('date', format(finPeriodeParis, 'yyyy-MM-dd'))

  const exceptionsParDate = new Map((exceptions ?? []).map((e) => [e.date, e]))

  const nouveauxCreneaux: {
    pharmacie_id: string
    type_rdv_id: string
    debut: string
    fin: string
    statut: string
  }[] = []

  // 3. Boucler sur chaque jour de la période (calendrier Paris)
  for (let i = 0; i < nbJours; i++) {
    const jourParis = addDays(debutPeriodeParis, i)
    const dateStr = format(jourParis, 'yyyy-MM-dd')
    const nomJour = JOURS[jourParis.getDay()]

    const exception = exceptionsParDate.get(dateStr)

    if (exception?.ferme) continue

    const horairesJour =
      exception?.horaires_speciaux ?? pharmacie.horaires_ouverture[nomJour]

    if (!horairesJour) continue

    const { debut, fin } = horairesJour as { debut: string; fin: string }
    const debutNorm = debut.length === 5 ? `${debut}:00` : debut
    const finNorm = fin.length === 5 ? `${fin}:00` : fin

    for (const type of typesRdv) {
      const dureeMin = type.duree_minutes

      let curseur = fromZonedTime(`${dateStr} ${debutNorm}`, TZ)
      const finJournee = fromZonedTime(`${dateStr} ${finNorm}`, TZ)

      while (addMinutes(curseur, dureeMin) <= finJournee) {
        nouveauxCreneaux.push({
          pharmacie_id: pharmacieId,
          type_rdv_id: type.id,
          debut: curseur.toISOString(),
          fin: addMinutes(curseur, dureeMin).toISOString(),
          statut: 'disponible',
        })
        curseur = addMinutes(curseur, dureeMin)
      }
    }
  }

  // 4. Effacer les anciens créneaux libres sur la période (on garde ceux avec un RDV)
  const debutPeriodeUtc = fromZonedTime(
    `${format(debutPeriodeParis, 'yyyy-MM-dd')} 00:00:00`,
    TZ
  )
  const finPeriodeUtc = fromZonedTime(
    `${format(finPeriodeParis, 'yyyy-MM-dd')} 00:00:00`,
    TZ
  )

  const { data: creneauxProteges, error: protegesError } = await supabase
    .from('reservations')
    .select('creneau_id, creneaux!inner(pharmacie_id, debut)')
    .eq('creneaux.pharmacie_id', pharmacieId)
    .gte('creneaux.debut', debutPeriodeUtc.toISOString())
    .lt('creneaux.debut', finPeriodeUtc.toISOString())
    .neq('statut', 'annule')

  if (protegesError) {
    return { success: false, count: 0, error: messageErreur(protegesError) }
  }

  const idsProteges = new Set(
    (creneauxProteges ?? [])
      .map((r) => r.creneau_id)
      .filter((id): id is string => typeof id === 'string')
  )

  const { data: anciensLibres, error: selectError } = await supabase
    .from('creneaux')
    .select('id')
    .eq('pharmacie_id', pharmacieId)
    .gte('debut', debutPeriodeUtc.toISOString())
    .lt('debut', finPeriodeUtc.toISOString())
    .eq('statut', 'disponible')

  if (selectError) {
    return { success: false, count: 0, error: messageErreur(selectError) }
  }

  const idsASupprimer = (anciensLibres ?? [])
    .map((c) => c.id)
    .filter((id) => !idsProteges.has(id))

  if (idsASupprimer.length > 0) {
    // Supabase limite parfois les .in() très longs → paquets
    const tailleLot = 200
    for (let i = 0; i < idsASupprimer.length; i += tailleLot) {
      const lot = idsASupprimer.slice(i, i + tailleLot)
      const { error: deleteError } = await supabase.from('creneaux').delete().in('id', lot)
      if (deleteError) {
        return { success: false, count: 0, error: messageErreur(deleteError) }
      }
    }
  }

  // 5. Insérer les nouveaux créneaux
  if (nouveauxCreneaux.length > 0) {
    const { error } = await supabase.from('creneaux').upsert(nouveauxCreneaux, {
      onConflict: 'pharmacie_id,type_rdv_id,debut',
      ignoreDuplicates: true,
    })
    if (error) {
      return { success: false, count: 0, error: messageErreur(error) }
    }
  }

  return { success: true, count: nouveauxCreneaux.length }
}
