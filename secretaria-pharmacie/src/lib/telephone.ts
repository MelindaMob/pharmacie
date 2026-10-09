/** France : 06 52 10 75 71 → +33652107571 (sans espaces). */
export function normaliserNumeroFrancais(numero: string) {
  const nettoye = numero.replace(/[\s.\-]/g, '')
  if (!nettoye) return ''
  if (nettoye.startsWith('0033')) return '+33' + nettoye.slice(4)
  if (nettoye.startsWith('0')) return '+33' + nettoye.slice(1)
  if (nettoye.startsWith('+')) return nettoye
  return '+33' + nettoye
}
