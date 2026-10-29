import { format } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import { versGsm7 } from './gsm7'

const TZ = 'Europe/Paris'

function nomPharmacieSms(nom: string): string {
  return nom.trim().slice(0, 30)
}

/** Date 12/11 et heure 14h00, fuseau Europe/Paris. */
export function formaterDateHeureParis(iso: string): { date: string; heure: string } {
  const zoned = toZonedTime(new Date(iso), TZ)
  return {
    date: format(zoned, 'dd/MM'),
    heure: format(zoned, "HH'h'mm"),
  }
}

export function smsConfirmation(params: {
  pharmacie: string
  date: string
  heure: string
  telephonePharmacie: string
}): string {
  return (
    `${nomPharmacieSms(params.pharmacie)} : votre RDV est confirmé le ${params.date} à ${params.heure}. ` +
    `Pour annuler ou modifier, appelez le ${params.telephonePharmacie}.`
  )
}

export function smsRappel(params: {
  pharmacie: string
  heure: string
  telephonePharmacie: string
}): string {
  return (
    `Rappel ${nomPharmacieSms(params.pharmacie)} : votre RDV est aujourd'hui à ${params.heure}. ` +
    `Pour annuler, appelez le ${params.telephonePharmacie}.`
  )
}

/** Texte actuel des manquants, passé en GSM-7. Pas de motif médical au-delà du nom de produit. */
export function smsManquant(params: { produit: string; pharmacie: string }): string {
  return versGsm7(
    `Bonjour, votre produit ${params.produit} est disponible à la pharmacie ${nomPharmacieSms(params.pharmacie)}.`
  )
}
