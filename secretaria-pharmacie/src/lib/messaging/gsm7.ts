// Alphabet GSM-7 de base (1 septet) et extension (2 septets : | ^ € { } [ ] ~ \).
const GSM7_BASE =
  '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ' +
  ' !"#¤%&\'()*+,-./0123456789:;<=>?' +
  '¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§' +
  '¿abcdefghijklmnopqrstuvwxyzäöñüà'

const GSM7_EXT = '|€{}[]~\\^'

const BASE = new Set(GSM7_BASE.split(''))
const EXT = new Set(GSM7_EXT.split(''))

const REMPLACEMENTS: Record<string, string> = {
  ê: 'e',
  Ê: 'E',
  â: 'a',
  Â: 'A',
  î: 'i',
  Î: 'I',
  ô: 'o',
  Ô: 'O',
  û: 'u',
  Û: 'U',
  ç: 'c',
  ë: 'e',
  Ë: 'E',
  ï: 'i',
  Ï: 'I',
  œ: 'oe',
  Œ: 'OE',
  '’': "'",
  '‘': "'",
  '´': "'",
  '“': '"',
  '”': '"',
  '«': '"',
  '»': '"',
  '–': '-',
  '—': '-',
  '−': '-',
}

function estGsm7(c: string): boolean {
  return BASE.has(c) || EXT.has(c)
}

/** Remplace les caractères hors GSM-7. Garde é è à ù ì ò É. */
export function versGsm7(texte: string): string {
  let out = ''
  for (const c of texte) {
    if (estGsm7(c)) {
      out += c
      continue
    }
    if (REMPLACEMENTS[c] !== undefined) {
      out += REMPLACEMENTS[c]
      continue
    }
    // Emojis et le reste : ignorés
  }
  return out
}

function nbSeptets(texte: string): number {
  let n = 0
  for (const c of texte) {
    n += EXT.has(c) ? 2 : 1
  }
  return n
}

/** 1 segment si ≤ 160 septets GSM-7. */
export function compterSegments(texte: string): number {
  const septets = nbSeptets(texte)
  if (septets <= 160) return 1
  // Concaténé : 153 septets utiles par segment
  return Math.ceil(septets / 153)
}

export function avertirSiTropLong(texteGsm7: string, type: string): void {
  if (compterSegments(texteGsm7) > 1) {
    console.warn(`[sms] ${type} dépasse 1 segment (${texteGsm7.length} car. / ${nbSeptets(texteGsm7)} septets)`)
  }
}
