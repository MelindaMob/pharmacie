import { createClient } from '@supabase/supabase-js'
import { addDays, format, parseISO } from 'date-fns'
import { fromZonedTime, toZonedTime } from 'date-fns-tz'

const TZ = 'Europe/Paris'
export const NB_JOURS_RECHERCHE_ETENDUE = 3

export type CreneauPublic = {
  id: string
  debut: string
  fin: string
  type_rdv_id: string
  statut: string
}

export type ResultatRechercheCreneaux =
  | { type: 'meme_jour'; creneaux: CreneauPublic[] }
  | { type: 'jour_proche'; creneaux: CreneauPublic[]; jourDemandeFerme: boolean }
  | { type: 'ferme'; creneaux: [] }
  | { type: 'rien'; creneaux: [] }

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

function dateKeyParis(iso: string): string {
  return format(toZonedTime(new Date(iso), TZ), 'yyyy-MM-dd')
}

function debutJourParis(dateStr: string): Date {
  return fromZonedTime(`${dateStr} 00:00:00`, TZ)
}

function calculerResultatRecherche(
  creneaux: CreneauPublic[],
  dateSouhaitee: string,
  heureSouhaitee: string,
  joursFermes: Set<string>
): ResultatRechercheCreneaux {
  const jourDemandeFerme = joursFermes.has(dateSouhaitee)
  const minutesVoulues = heureSouhaitee
    ? parseInt(heureSouhaitee.split(':')[0]) * 60 + parseInt(heureSouhaitee.split(':')[1])
    : null

  if (!jourDemandeFerme) {
    const creneauxDuJour = creneaux.filter((c) => dateKeyParis(c.debut) === dateSouhaitee)

    if (creneauxDuJour.length > 0) {
      const tries = [...creneauxDuJour].sort((a, b) => {
        if (minutesVoulues === null) {
          return new Date(a.debut).getTime() - new Date(b.debut).getTime()
        }
        const parisA = toZonedTime(new Date(a.debut), TZ)
        const parisB = toZonedTime(new Date(b.debut), TZ)
        const minutesA = parisA.getHours() * 60 + parisA.getMinutes()
        const minutesB = parisB.getHours() * 60 + parisB.getMinutes()
        return Math.abs(minutesA - minutesVoulues) - Math.abs(minutesB - minutesVoulues)
      })
      return { type: 'meme_jour', creneaux: tries.slice(0, 6) }
    }
  }

  for (let i = 1; i <= NB_JOURS_RECHERCHE_ETENDUE; i++) {
    const dateKey = format(addDays(parseISO(dateSouhaitee), i), 'yyyy-MM-dd')
    if (joursFermes.has(dateKey)) continue

    const creneauxJourSuivant = creneaux
      .filter((c) => dateKeyParis(c.debut) === dateKey)
      .sort((a, b) => new Date(a.debut).getTime() - new Date(b.debut).getTime())

    if (creneauxJourSuivant.length > 0) {
      return {
        type: 'jour_proche',
        creneaux: creneauxJourSuivant.slice(0, 6),
        jourDemandeFerme,
      }
    }
  }

  if (jourDemandeFerme) {
    return { type: 'ferme', creneaux: [] }
  }

  return { type: 'rien', creneaux: [] }
}

export async function rechercherCreneauxPublics(
  pharmacieId: string,
  typeRdvId: string,
  dateSouhaitee: string,
  heureSouhaitee: string = ''
): Promise<ResultatRechercheCreneaux | { error: string }> {
  if (!pharmacieId || !typeRdvId || !dateSouhaitee) {
    return { error: 'Paramètres manquants' }
  }

  const supabase = adminClient()
  const debutJour = debutJourParis(dateSouhaitee)
  const finRecherche = addDays(debutJour, NB_JOURS_RECHERCHE_ETENDUE + 1)
  const finRechercheStr = format(addDays(parseISO(dateSouhaitee), NB_JOURS_RECHERCHE_ETENDUE), 'yyyy-MM-dd')

  const [{ data: pharmacie }, { data: typeRdv }, { data: exceptions }, { data: slots }] =
    await Promise.all([
      supabase.from('pharmacies').select('id').eq('id', pharmacieId).maybeSingle(),
      supabase
        .from('types_rdv')
        .select('id')
        .eq('id', typeRdvId)
        .eq('pharmacie_id', pharmacieId)
        .maybeSingle(),
      supabase
        .from('horaires_exceptionnels')
        .select('date, ferme')
        .eq('pharmacie_id', pharmacieId)
        .gte('date', dateSouhaitee)
        .lte('date', finRechercheStr),
      supabase
        .from('creneaux')
        .select('id, debut, fin, type_rdv_id, statut')
        .eq('pharmacie_id', pharmacieId)
        .eq('type_rdv_id', typeRdvId)
        .eq('statut', 'disponible')
        .gte('debut', debutJour.toISOString())
        .lt('debut', finRecherche.toISOString())
        .order('debut', { ascending: true })
        .limit(200),
    ])

  if (!pharmacie) return { error: 'Pharmacie introuvable' }
  if (!typeRdv) return { error: 'Type de rendez-vous invalide' }

  const joursFermes = new Set(
    (exceptions ?? [])
      .filter((e) => e.ferme)
      .map((e) => String(e.date).slice(0, 10))
  )

  const creneauxFiltres = (slots ?? []).filter((c) => !joursFermes.has(dateKeyParis(c.debut)))

  return calculerResultatRecherche(creneauxFiltres, dateSouhaitee, heureSouhaitee, joursFermes)
}
