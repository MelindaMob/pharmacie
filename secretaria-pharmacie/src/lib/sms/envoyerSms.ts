import twilio from 'twilio'
import { envoyerMessage } from '@/lib/messaging/envoyerMessage'
import { loggerSms } from '@/lib/sms/loggerSms'

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)

/**
 * @deprecated Utiliser envoyerMessage() (Brevo / WhatsApp). Conservé comme
 * wrapper : Twilio n'est plus appelé.
 */
export async function envoyerSms(
  numeroDestination: string,
  message: string,
  options?: { source?: string; pharmacieId?: string | null }
) {
  const r = await envoyerMessage({
    type: 'autre',
    telephone: numeroDestination,
    contenuSms: message,
  })
  try {
    await loggerSms({
      message,
      source: options?.source ?? 'autre',
      pharmacieId: options?.pharmacieId ?? null,
      reussi: r.ok,
    })
  } catch {
    /* le journal ne doit jamais casser l'envoi */
  }
  return { success: r.ok, error: r.erreur }
}

/** Conservé pour les écrans admin / inscription (pas le canal SMS). */
export function normaliserNumeroFrancais(numero: string) {
  const nettoye = numero.replace(/[\s.-]/g, '')
  if (nettoye.startsWith('0')) return '+33' + nettoye.slice(1)
  if (nettoye.startsWith('+')) return nettoye
  return '+33' + nettoye
}

// Référence Twilio conservée pour ne pas casser l'import du paquet tant que
// la dépendance n'est pas retirée. Ne plus appeler client.messages.create.
void client
