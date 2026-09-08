/**
 * Import du catalogue national BDPM dans la table `medicaments`.
 * À lancer depuis votre machine (pas dans l'app Next.js) :
 *
 *   npm install @supabase/supabase-js iconv-lite
 *   node import-bdpm.mjs
 *
 * Lit `.env.local` s'il est présent (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).
 * La BDPM est mise à jour régulièrement par l'ANSM — à relancer périodiquement
 * (mensuel suffit), l'upsert se fait sur cis_code donc c'est sans risque.
 */

import { existsSync, readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import iconv from 'iconv-lite'
import { createClient } from '@supabase/supabase-js'

const root = dirname(fileURLToPath(import.meta.url))
const envPath = join(root, '.env.local')
if (existsSync(envPath)) {
  for (const ligne of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = ligne.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq < 1) continue
    const key = trimmed.slice(0, eq).trim()
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
    if (!process.env[key]) process.env[key] = value
  }
}

const BDPM_URL = 'https://base-donnees-publique.medicaments.gouv.fr/download/file/CIS_bdpm.txt'
const LOCAL_FILE = join(root, 'CIS_bdpm.txt')

function normaliserTexte(input) {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function chargerFichier() {
  if (existsSync(LOCAL_FILE)) {
    console.log('Lecture de CIS_bdpm.txt local...')
    return readFileSync(LOCAL_FILE)
  }

  console.log('Téléchargement de CIS_bdpm.txt...')
  const response = await fetch(BDPM_URL, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/plain,*/*',
    },
  })
  if (!response.ok) {
    throw new Error(
      `Échec du téléchargement : ${response.status}. Téléchargez le « Fichier des spécialités » depuis https://base-donnees-publique.medicaments.gouv.fr/telechargement et placez-le en CIS_bdpm.txt à côté de ce script.`
    )
  }
  return Buffer.from(await response.arrayBuffer())
}

async function main() {
  const buffer = await chargerFichier()
  const texte = iconv.decode(buffer, 'latin1') // fichier encodé en Latin-1

  const lignes = texte.split('\n').filter((l) => l.trim().length > 0)
  console.log(`${lignes.length} lignes trouvées.`)

  const medicaments = lignes
    .map((ligne) => {
      const colonnes = ligne.split('\t')
      return {
        cis_code: colonnes[0]?.trim(),
        denomination: colonnes[1]?.trim(),
        forme_pharmaceutique: colonnes[2]?.trim() || null,
        statut_amm: colonnes[4]?.trim() || null,
      }
    })
    .filter((m) => m.cis_code && m.denomination)

  console.log(`${medicaments.length} médicaments valides à importer.`)

  const TAILLE_LOT = 500
  for (let i = 0; i < medicaments.length; i += TAILLE_LOT) {
    const lot = medicaments.slice(i, i + TAILLE_LOT).map((m) => ({
      ...m,
      denomination_normalisee: normaliserTexte(m.denomination),
    }))

    const { error } = await supabase.from('medicaments').upsert(lot, { onConflict: 'cis_code' })
    if (error) throw error
    console.log(`Lot ${i}-${Math.min(i + TAILLE_LOT, medicaments.length)} importé.`)
  }

  console.log('Import BDPM terminé.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
