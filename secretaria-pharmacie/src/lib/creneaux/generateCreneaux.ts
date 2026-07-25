import { createClient } from '@/lib/supabase/server'
import { addDays, addMinutes, format, parse, startOfDay } from 'date-fns'

const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']

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

  // 2. Récupérer les horaires exceptionnels sur la période
  const { data: exceptions } = await supabase
    .from('horaires_exceptionnels')
    .select('date, ferme, horaires_speciaux')
    .eq('pharmacie_id', pharmacieId)
    .gte('date', format(new Date(), 'yyyy-MM-dd'))
    .lte('date', format(addDays(new Date(), nbJours), 'yyyy-MM-dd'))

  const exceptionsParDate = new Map(
    (exceptions ?? []).map((e) => [e.date, e])
  )

  const nouveauxCreneaux: {
    pharmacie_id: string
    type_rdv_id: string
    debut: string
    fin: string
    statut: string
  }[] = []

  // 3. Boucler sur chaque jour de la période
  for (let i = 0; i < nbJours; i++) {
    const jourDate = addDays(startOfDay(new Date()), i)
    const dateStr = format(jourDate, 'yyyy-MM-dd')
    const nomJour = JOURS[jourDate.getDay()]

    const exception = exceptionsParDate.get(dateStr)

    // Jour fermé exceptionnellement → on saute
    if (exception?.ferme) continue

    // Horaires du jour : exception si présente, sinon horaires habituels
    const horairesJour =
      exception?.horaires_speciaux ?? pharmacie.horaires_ouverture[nomJour]

    if (!horairesJour) continue // pharmacie fermée ce jour-là (ex: dimanche)

    const { debut, fin } = horairesJour

    // 4. Pour chaque type de RDV, créer les créneaux de la durée correspondante
    for (const type of typesRdv) {
      const dureeMin = type.duree_minutes

      let curseur = parse(`${dateStr} ${debut}`, 'yyyy-MM-dd HH:mm', new Date())
      const finJournee = parse(`${dateStr} ${fin}`, 'yyyy-MM-dd HH:mm', new Date())

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
