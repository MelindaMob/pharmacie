import { createClient } from '@supabase/supabase-js'
import { compterSegments } from './compterSegments'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Best-effort : ne bloque jamais l'envoi du SMS.
export async function loggerSms(params: {
  message: string
  source: string
  pharmacieId?: string | null
  reussi: boolean
}) {
  try {
    const { segments, encodage, caracteres } = compterSegments(params.message)
    await supabaseAdmin.from('sms_log').insert({
      pharmacie_id: params.pharmacieId ?? null,
      source: params.source,
      caracteres,
      encodage,
      segments,
      reussi: params.reussi,
    })
  } catch {
    /* on ignore : le journal ne doit jamais casser l'envoi */
  }
}
