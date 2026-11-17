export function nomPharmacieAffiche(nom: string | null | undefined): string {
  const n = (nom ?? '').trim().replace(/\s+/g, ' ')
  if (!n) return 'Pharmacie'
  return /pharmacie/i.test(n) ? n : `Pharmacie ${n}`
}
