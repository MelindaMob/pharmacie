export async function envoyerTemplateWhatsApp(params: {
  telephone: string
  template: string
  variables: string[]
  payloadBoutons?: string[]
}): Promise<{ ok: true; messageId: string } | { ok: false; erreur: string; code?: number }> {
  if (process.env.WHATSAPP_ENABLED !== 'true') {
    return { ok: false, erreur: 'whatsapp_desactive' }
  }

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const token = process.env.WHATSAPP_TOKEN
  if (!phoneNumberId || !token) {
    return { ok: false, erreur: 'WHATSAPP_PHONE_NUMBER_ID ou WHATSAPP_TOKEN manquant' }
  }

  const to = params.telephone.replace(/^\+/, '')
  const bodyVariables = params.variables.map((text) => ({ type: 'text' as const, text }))

  // TODO WhatsApp : composants boutons (payloadBoutons) — quick_reply / url
  // une fois les templates Meta validés. payloadBoutons est ignoré pour l'instant.
  void params.payloadBoutons

  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'template',
          template: {
            name: params.template,
            language: { code: 'fr' },
            components:
              bodyVariables.length > 0
                ? [{ type: 'body', parameters: bodyVariables }]
                : [],
          },
        }),
      }
    )
    const data = (await res.json().catch(() => ({}))) as {
      messages?: { id?: string }[]
      error?: { message?: string; code?: number }
    }
    const messageId = data.messages?.[0]?.id
    if (!res.ok || !messageId) {
      return {
        ok: false,
        erreur: data.error?.message ?? `WhatsApp HTTP ${res.status}`,
        code: data.error?.code ?? res.status,
      }
    }
    return { ok: true, messageId }
  } catch (e) {
    return { ok: false, erreur: e instanceof Error ? e.message : 'Erreur réseau WhatsApp' }
  }
}
