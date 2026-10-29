/** Normalise un numéro vers E.164. Retourne null si invalide. */
export function normaliserTelephone(input: string): string | null {
  const brut = input.replace(/[\s.\-()]/g, '')
  if (!brut) return null

  let e164: string

  if (brut.startsWith('0033')) {
    e164 = '+33' + brut.slice(4)
  } else if (/^33\d{9}$/.test(brut)) {
    e164 = '+' + brut
  } else if (brut.startsWith('+')) {
    e164 = brut
  } else if (/^0\d{9}$/.test(brut)) {
    const neuf = brut.slice(1)
    const prefixe4 = brut.slice(0, 4)
    if (prefixe4 === '0639' || prefixe4 === '0692' || prefixe4 === '0693') {
      e164 = '+262' + neuf
    } else if (prefixe4 === '0690' || prefixe4 === '0691') {
      e164 = '+590' + neuf
    } else if (prefixe4 === '0694') {
      e164 = '+594' + neuf
    } else if (prefixe4 === '0696' || prefixe4 === '0697') {
      e164 = '+596' + neuf
    } else {
      e164 = '+33' + neuf
    }
  } else {
    return null
  }

  return /^\+\d{10,15}$/.test(e164) ? e164 : null
}
