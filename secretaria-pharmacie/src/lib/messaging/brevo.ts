import { avertirSiTropLong, versGsm7 } from './gsm7'

export async function envoyerSmsBrevo(params: {
  telephone: string
  contenu: string
  tag?: string
}): Promise<{ ok: true; messageId: string } | { ok: false; erreur: string }> {
  const apiKey = process.env.BREVO_API_KEY
  const sender = process.env.BREVO_SMS_SENDER
  if (!apiKey || !sender) {
    return { ok: false, erreur: 'BREVO_API_KEY ou BREVO_SMS_SENDER manquant' }
  }

  const content = versGsm7(params.contenu)
  avertirSiTropLong(content, params.tag ?? 'sms')

  try {
    const res = await fetch('https://api.brevo.com/v3/transactionalSMS/sms', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender,
        recipient: params.telephone,
        content,
        type: 'transactional',
        ...(params.tag ? { tag: params.tag } : {}),
      }),
    })
    const data = (await res.json().catch(() => ({}))) as {
      messageId?: string
      message?: string
    }
    if (!res.ok || !data.messageId) {
      return {
        ok: false,
        erreur: typeof data.message === 'string' ? data.message : `Brevo HTTP ${res.status}`,
      }
    }
    return { ok: true, messageId: data.messageId }
  } catch (e) {
    return { ok: false, erreur: e instanceof Error ? e.message : 'Erreur réseau Brevo' }
  }
}
