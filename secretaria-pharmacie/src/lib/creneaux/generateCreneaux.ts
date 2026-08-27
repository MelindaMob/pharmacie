import { createClient } from '@/lib/supabase/server'
import { addDays, addMinutes, format, startOfDay } from 'date-fns'
import { fromZonedTime, toZonedTime } from 'date-fns-tz'

const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
const TZ = 'Europe/Paris'

export async function generateCreneauxPourPharmacie(
  pharmacieId: string,
  nbJours: number = 28 // 4 semaines
) {
  const supabase = await createClient()

  // 1. Récupérer la pharmacie (horaires + types de RDV)
  const { data: pharmacie } = await supabase
    .from('pharmacies')
    .select('id, horaires_ouverture')
    .eq('id', pharmacieId)
    .single()

  if (!pharmacie?.horaires_ouverture) return { error: 'Horaires non configurés' }

  const { data: typesRdv } = await supabase
    .from('types_rdv')
    .select('id, duree_minutes')
    .eq('pharmacie_id', pharmacieId)

  if (!typesRdv || typesRdv.length === 0) return { error: 'Aucun type de RDV configuré' }

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

    // Jour fermé exceptionnellement → on saute
    if (exception?.ferme) continue

    // Horaires du jour : exception si présente, sinon horaires habituels
    const horairesJour =
      exception?.horaires_speciaux ?? pharmacie.horaires_ouverture[nomJour]

    if (!horairesJour) continue // pharmacie fermée ce jour-là (ex: dimanche)

    const { debut, fin } = horairesJour as { debut: string; fin: string }
    const debutNorm = debut.length === 5 ? `${debut}:00` : debut
    const finNorm = fin.length === 5 ? `${fin}:00` : fin

    // 4. Pour chaque type de RDV, créer les créneaux (09:00 = 09:00 Europe/Paris)
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

  // 5. Insérer en base, en ignorant les doublons (même pharmacie/type/debut)
  const { error } = await supabase.from('creneaux').upsert(nouveauxCreneaux, {
    onConflict: 'pharmacie_id,type_rdv_id,debut',
    ignoreDuplicates: true,
  })

  return { success: !error, count: nouveauxCreneaux.length, error }
}
