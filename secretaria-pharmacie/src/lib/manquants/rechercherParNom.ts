/**
 * Recherche d'un patient par nom approchant (prononciation, fautes d'orthographe,
 * ordre prénom/nom, accents, tirets). Pas de dépendance, tout se fait en TypeScript
 * sur les fiches manquants d'une seule pharmacie (quelques dizaines à quelques centaines).
 */

const MOTS_IGNORES = new Set([
  'madame', 'monsieur', 'mme', 'mr', 'm', 'mlle', 'mademoiselle', 'de', 'du', 'des', 'la', 'le', 'les', 'dit', 'epouse', 'ne', 'nee',
])

/** minuscules, sans accents, lettres uniquement, tirets et apostrophes = séparateurs */
export function nettoyerNom(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z]+/g, ' ')
    .trim()
}

export function motsDuNom(input: string): string[] {
  return nettoyerNom(input)
    .split(' ')
    .filter((m) => m.length >= 2 && !MOTS_IGNORES.has(m))
}

/** Clé phonétique française simplifiée : deux noms qui se prononcent pareil ont la même clé. */
export function phonetique(mot: string): string {
  let s = nettoyerNom(mot).replace(/ /g, '')
  if (!s) return ''
  s = s
    .replace(/ph/g, 'f')
    .replace(/th/g, 't')
    .replace(/gn/g, 'n')
    .replace(/ch|sh/g, 'S')
    .replace(/qu|ck|cq/g, 'k')
    .replace(/eau|au/g, 'o')
    .replace(/ou/g, 'u')
    .replace(/oi|oy/g, 'wa')
    .replace(/ain|ein|aim|eim|in|im|yn|ym/g, 'I')
    .replace(/an|am|en|em/g, 'A')
    .replace(/on|om/g, 'O')
    .replace(/ai|ei|ay|ey|er$|ez$|et$/g, 'e')
    .replace(/c(?=[eiy])/g, 's')
    .replace(/g(?=[eiy])/g, 'j')
    .replace(/c/g, 'k')
    .replace(/q/g, 'k')
    .replace(/y/g, 'i')
    .replace(/w/g, 'v')
    .replace(/x/g, 'ks')
    .replace(/z/g, 's')
    .replace(/h/g, '')
    .replace(/(.)\1+/g, '$1')
  // lettres finales muettes (Dupont / Dupond / Duponts)
  if (s.length > 3) s = s.replace(/[stdpx]+$/g, '')
  return s
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    prev = cur
  }
  return prev[b.length]
}

function similarite(a: string, b: string): number {
  if (!a || !b) return 0
  return 1 - levenshtein(a, b) / Math.max(a.length, b.length)
}

/** Ressemblance entre deux mots : 1 = identiques, ~0.95 = même prononciation, sinon distance d'édition. */
export function ressemblanceMot(demande: string, fiche: string): number {
  if (demande === fiche) return 1
  const pd = phonetique(demande)
  const pf = phonetique(fiche)
  if (pd && pd === pf) return 0.95
  return Math.max(similarite(demande, fiche), similarite(pd, pf) * 0.95)
}

/**
 * Score d'une fiche pour un nom demandé : moyenne, sur les mots dits par l'appelant,
 * de la meilleure ressemblance avec un mot de la fiche. Chaque mot dit doit ressembler
 * à un mot de la fiche (sinon score 0).
 */
export function scoreNom(nomDemande: string, nomFiche: string, seuilMot = 0.7): number {
  const demande = motsDuNom(nomDemande)
  const fiche = motsDuNom(nomFiche)
  if (demande.length === 0 || fiche.length === 0) return 0
  let total = 0
  for (const d of demande) {
    const meilleur = Math.max(...fiche.map((f) => ressemblanceMot(d, f)))
    if (meilleur < seuilMot) return 0
    total += meilleur
  }
  return total / demande.length
}

export type Candidat<T> = { fiche: T; score: number }

/** Fiches classées par ressemblance (meilleures d'abord), score >= seuil. */
export function chercherParNom<T extends { patient_nom: string }>(
  nomDemande: string,
  fiches: T[],
  seuil = 0.7
): Candidat<T>[] {
  return fiches
    .map((fiche) => ({ fiche, score: scoreNom(nomDemande, fiche.patient_nom) }))
    .filter((c) => c.score >= seuil)
    .sort((a, b) => b.score - a.score)
}
