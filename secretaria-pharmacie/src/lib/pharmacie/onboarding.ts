import { createClient as createAdminClient } from '@supabase/supabase-js'

type Plage = { debut: string; fin: string }
type Horaires = Record<string, Plage[] | null>

function jourADesPlages(jour: unknown): boolean {
  if (!jour) return false
  if (Array.isArray(jour)) return jour.length > 0
  if (typeof jour === 'object' && jour !== null && 'debut' in jour && 'fin' in jour) return true
  return false
}

/** Vrai dès qu'au moins un jour a une plage horaire renseignée. */
export function auMoinsUnJourOuvert(horaires: Horaires | Record<string, unknown> | null | undefined): boolean {
  if (!horaires) return false
  return Object.values(horaires).some(jourADesPlages)
}

/**
 * Étape d'onboarding : tant que les horaires ne sont pas configurés, le reste
 * du dashboard (calendrier, messages, manquants, infos) reste bloqué et
 * redirige vers Paramètres. Seul "Horaires" est requis (pas les types de RDV).
 */
export async function horairesSontConfigures(pharmacieId: string): Promise<boolean> {
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data } = await supabaseAdmin
    .from('pharmacies')
    .select('horaires_ouverture')
    .eq('id', pharmacieId)
    .single()

  return auMoinsUnJourOuvert(data?.horaires_ouverture as Horaires | null | undefined)
}
