export function lienGestionRdv(token: string): string {
  return `${process.env.NEXT_PUBLIC_SITE_URL}/rdv/gestion/${token}`
}

/** Textes d’origine Twilio : date longue + lien de gestion. */
export function smsConfirmation(params: {
  pharmacie: string
  dateFormatee: string
  lienGestion: string
}): string {
  return `RDV confirmé chez ${params.pharmacie} le ${params.dateFormatee}. Gérer/annuler : ${params.lienGestion}`
}

export function smsDeplace(params: {
  pharmacie: string
  dateFormatee: string
  lienGestion: string
}): string {
  return `RDV déplacé chez ${params.pharmacie} : ${params.dateFormatee}. Gérer/annuler : ${params.lienGestion}`
}

export function smsModifie(params: {
  pharmacie: string
  dateFormatee: string
  lienGestion: string
}): string {
  return `RDV modifié chez ${params.pharmacie} : ${params.dateFormatee}. Gérer/annuler : ${params.lienGestion}`
}

export function smsRappel(params: {
  pharmacie: string
  dateFormatee: string
  lienGestion: string
}): string {
  return `Rappel : RDV chez ${params.pharmacie} le ${params.dateFormatee}. Gérer/annuler : ${params.lienGestion}`
}

/** Texte d’origine Twilio, nom de pharmacie complet. */
export function smsManquant(params: { produit: string; pharmacie: string }): string {
  return `Bonjour, votre produit ${params.produit} est disponible à la pharmacie ${params.pharmacie}.`
}
