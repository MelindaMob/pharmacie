import { createClient } from '@supabase/supabase-js'
import { addDays, addMinutes, format, startOfDay } from 'date-fns'
import { fromZonedTime, toZonedTime } from 'date-fns-tz'

const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
const TZ = 'Europe/Paris'

type Plage = { debut: string; fin: string }

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

/**
 * Normalise une entrée d'horaires (nouveau format : tableau de plages par
 * jour, jusqu'à 2 ; ancien format encore présent dans horaires_speciaux des
 * exceptions : un seul objet {debut, fin}) en tableau de plages.
 */
function versPlages(valeur: unknown): Plage[] {
  if (!valeur) return []
  if (Array.isArray(valeur)) return valeur as Plage[]
  if (typeof valeur === 'object' && 'debut' in (valeur as object)) return [valeur as Plage]
  return []
}

function versMinutes(heure: string): number {
  // Tolère "HH:MM" et "HH:MM:SS" (les colonnes `time` de Postgres renvoient
  // souvent le format avec les secondes).
  const [h, m] = heure.slice(0, 5).split(':').map(Number)
  return h * 60 + m
}

function versHeure(minutes: number): string {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, '0')
  const m = (minutes % 60).toString().padStart(2, '0')
  return `${h}:${m}`
}

/** Intersection de deux plages horaires (en minutes), ou null si disjointes. */
function intersectionPlage(a: Plage, b: Plage): Plage | null {
  const debut = Math.max(versMinutes(a.debut), versMinutes(b.debut))
  const fin = Math.min(versMinutes(a.fin), versMinutes(b.fin))
  if (fin <= debut) return null
  return { debut: versHeure(debut), fin: versHeure(fin) }
}

/** Intersecte une liste de plages "type" avec une liste de plages "pharmacie" (ouverture générale). */
function intersectionPlages(plagesType: Plage[], plagesPharmacie: Plage[]): Plage[] {
  const resultat: Plage[] = []
  for (const pt of plagesType) {
    for (const pp of plagesPharmacie) {
      const inter = intersectionPlage(pt, pp)
      if (inter) resultat.push(inter)
    }
  }
  return resultat
}

type FenetreHebdo = { type_rdv_id: string; jour: string; debut: string; fin: string }
type ExceptionType = {
  type_rdv_id: string
  date_debut: string
  date_fin: string
  ferme: boolean
  debut: string | null
  fin: string | null
}

/**
 * Détermine les plages horaires effectives d'un type de RDV pour un jour
 * donné, en tenant compte (dans l'ordre de priorité) :
 * 1. d'une dérogation exceptionnelle (types_rdv_exceptions) couvrant la date,
 * 2. sinon de ses fenêtres hebdomadaires propres (types_rdv_horaires) si au
 *    moins une a été définie pour ce type (auquel cas il n'est ouvert QUE sur
 *    les jours/heures définis),
 * 3. sinon (aucune fenêtre définie du tout pour ce type) : repli sur
 *    l'amplitude d'ouverture générale de la pharmacie ce jour-là — comportement
 *    identique à avant l'introduction de cette fonctionnalité.
 * Le résultat est toujours intersecté avec les plages d'ouverture générale de
 * la pharmacie (un type ne peut jamais être proposé pharmacie fermée).
 */
function plagesEffectivesPourType(
  typeRdvId: string,
  dateStr: string,
  nomJour: string,
  plagesPharmacieJour: Plage[],
  fenetresParType: Map<string, FenetreHebdo[]>,
  exceptionsParType: Map<string, ExceptionType[]>
): Plage[] {
  const exceptions = exceptionsParType.get(typeRdvId) ?? []
  const exception = exceptions.find((e) => e.date_debut <= dateStr && dateStr <= e.date_fin)

  if (exception) {
    if (exception.ferme) return []
    if (!exception.debut || !exception.fin) return []
    return intersectionPlages([{ debut: exception.debut, fin: exception.fin }], plagesPharmacieJour)
  }

  const fenetres = fenetresParType.get(typeRdvId) ?? []
  if (fenetres.length > 0) {
    const fenetresJour = fenetres
      .filter((f) => f.jour === nomJour)
      .map((f) => ({ debut: f.debut, fin: f.fin }))
    // Des fenêtres existent pour ce type, mais pas ce jour-là : il n'est
    // simplement pas proposé ce jour, pas de repli sur l'ouverture générale.
    return intersectionPlages(fenetresJour, plagesPharmacieJour)
  }

  // Aucune fenêtre définie pour ce type : repli sur l'ouverture générale.
  return plagesPharmacieJour
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
    .eq('actif', true)

  if (!typesRdv || typesRdv.length === 0) {
    return { success: false, count: 0, error: 'Aucun type de RDV configuré' }
  }

  const typeIds = typesRdv.map((t) => t.id)

  // 1bis. Fenêtres hebdomadaires et dérogations exceptionnelles par type de RDV
  const { data: fenetresData } = await supabase
    .from('types_rdv_horaires')
    .select('type_rdv_id, jour, debut, fin')
    .in('type_rdv_id', typeIds)

  const fenetresParType = new Map<string, FenetreHebdo[]>()
  for (const f of fenetresData ?? []) {
    const liste = fenetresParType.get(f.type_rdv_id) ?? []
    liste.push(f as FenetreHebdo)
    fenetresParType.set(f.type_rdv_id, liste)
  }

  const { data: exceptionsData } = await supabase
    .from('types_rdv_exceptions')
    .select('type_rdv_id, date_debut, date_fin, ferme, debut, fin')
    .in('type_rdv_id', typeIds)

  const exceptionsParType = new Map<string, ExceptionType[]>()
  for (const e of exceptionsData ?? []) {
    const liste = exceptionsParType.get(e.type_rdv_id) ?? []
    liste.push(e as ExceptionType)
    exceptionsParType.set(e.type_rdv_id, liste)
  }

  // Référence « aujourd’hui » en heure de Paris (évite le décalage UTC de Vercel)
  const maintenantParis = toZonedTime(new Date(), TZ)
  const debutPeriodeParis = startOfDay(maintenantParis)
  const finPeriodeParis = addDays(debutPeriodeParis, nbJours)

  // 2. Récupérer les horaires exceptionnels de la pharmacie sur la période
  const { data: exceptionsPharmacie } = await supabase
    .from('horaires_exceptionnels')
    .select('date, ferme, horaires_speciaux')
    .eq('pharmacie_id', pharmacieId)
    .gte('date', format(debutPeriodeParis, 'yyyy-MM-dd'))
    .lte('date', format(finPeriodeParis, 'yyyy-MM-dd'))

  const exceptionsPharmacieParDate = new Map(
    (exceptionsPharmacie ?? []).map((e) => [String(e.date).slice(0, 10), e])
  )

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

    const exceptionPharmacie = exceptionsPharmacieParDate.get(dateStr)

    if (exceptionPharmacie?.ferme) continue

    const horairesOuverture = pharmacie.horaires_ouverture as Record<string, unknown>
    const plagesPharmacieJour = exceptionPharmacie?.horaires_speciaux
      ? versPlages(exceptionPharmacie.horaires_speciaux)
      : versPlages(horairesOuverture[nomJour])

    if (plagesPharmacieJour.length === 0) continue

    for (const type of typesRdv) {
      const plagesEffectives = plagesEffectivesPourType(
        type.id,
        dateStr,
        nomJour,
        plagesPharmacieJour,
        fenetresParType,
        exceptionsParType
      )

      for (const { debut, fin } of plagesEffectives) {
        const dureeMin = type.duree_minutes
        const debutNorm = debut.length === 5 ? `${debut}:00` : debut
        const finNorm = fin.length === 5 ? `${fin}:00` : fin

        let curseur = fromZonedTime(`${dateStr} ${debutNorm}`, TZ)
        const finPlage = fromZonedTime(`${dateStr} ${finNorm}`, TZ)

        while (addMinutes(curseur, dureeMin) <= finPlage) {
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
