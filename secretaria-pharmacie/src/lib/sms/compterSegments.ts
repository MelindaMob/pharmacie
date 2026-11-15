// Compte les segments facturés (1 segment = 1 crédit Brevo).
// GSM-7 : 160 caractères (153 par segment si plusieurs). UCS-2 (accents comme ê, ç, î, ô, émojis) : 70 (67 si plusieurs).
const GSM7 =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà"
const GSM7_EXT = '^{}\\[~]|€'

export function compterSegments(message: string): {
  segments: number
  encodage: 'gsm7' | 'ucs2'
  caracteres: number
} {
  const chars = Array.from(message)
  const estGsm = chars.every((c) => GSM7.includes(c) || GSM7_EXT.includes(c))
  if (estGsm) {
    const unites = chars.reduce((n, c) => n + (GSM7_EXT.includes(c) ? 2 : 1), 0)
    return {
      segments: unites <= 160 ? 1 : Math.ceil(unites / 153),
      encodage: 'gsm7',
      caracteres: chars.length,
    }
  }
  return {
    segments: chars.length <= 70 ? 1 : Math.ceil(chars.length / 67),
    encodage: 'ucs2',
    caracteres: chars.length,
  }
}
