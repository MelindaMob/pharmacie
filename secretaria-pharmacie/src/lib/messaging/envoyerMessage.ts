import { createClient } from '@supabase/supabase-js'
import { envoyerSmsBrevo } from './brevo'
import { envoyerTemplateWhatsApp } from './whatsapp'
import { normaliserTelephone } from './telephone'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type TypeMessage = 'confirmation' | 'rappel' | 'manquant' | 'autre'

async function journaliser(row: {
  reservation_id?: string | null
  type: TypeMessage
  canal: 'whatsapp' | 'sms'
  telephone: string
  provider_message_id?: string | null
  statut: string
  erreur?: string | null
}): Promise<void> {
  const { error } = await supabaseAdmin.from('message_envois').insert({
    reservation_id: row.reservation_id ?? null,
    type: row.type,
    canal: row.canal,
    telephone: row.telephone,
    provider_message_id: row.provider_message_id ?? null,
    statut: row.statut,
    erreur: row.erreur ?? null,
  })
  if (error) {
    console.error('message_envois insert:', error.message)
  }
}

export async function envoyerMessage(params: {
  type: TypeMessage
  telephone: string
  reservationId?: string
  contenuSms: string
  whatsapp?: { template: string; variables: string[] }
}): Promise<{ ok: boolean; canal: 'whatsapp' | 'sms' | null; erreur?: string }> {
  try {
    const tel = normaliserTelephone(params.telephone)
    if (!tel) {
      await journaliser({
        reservation_id: params.reservationId,
        type: params.type,
        canal: 'sms',
        telephone: params.telephone.slice(0, 30),
        statut: 'numero_invalide',
        erreur: 'numero_invalide',
      })
      return { ok: false, canal: null, erreur: 'numero_invalide' }
    }

    const { data: contact } = await supabaseAdmin
      .from('contacts_canal')
      .select('canal_prefere')
      .eq('telephone', tel)
      .maybeSingle()

    const whatsappActif = process.env.WHATSAPP_ENABLED === 'true'
    const tenterWhatsapp =
      whatsappActif && !!params.whatsapp && contact?.canal_prefere !== 'sms'

    if (tenterWhatsapp && params.whatsapp) {
      const wa = await envoyerTemplateWhatsApp({
        telephone: tel,
        template: params.whatsapp.template,
        variables: params.whatsapp.variables,
      })
      if (wa.ok) {
        await journaliser({
          reservation_id: params.reservationId,
          type: params.type,
          canal: 'whatsapp',
          telephone: tel,
          provider_message_id: wa.messageId,
          statut: 'envoye',
        })
        return { ok: true, canal: 'whatsapp' }
      }
    }

    const sms = await envoyerSmsBrevo({
      telephone: tel,
      contenu: params.contenuSms,
      tag: params.type,
    })
    await journaliser({
      reservation_id: params.reservationId,
      type: params.type,
      canal: 'sms',
      telephone: tel,
      provider_message_id: sms.ok ? sms.messageId : null,
      statut: sms.ok ? 'envoye' : 'echec',
      erreur: sms.ok ? null : sms.erreur,
    })
    if (!sms.ok) return { ok: false, canal: 'sms', erreur: sms.erreur }
    return { ok: true, canal: 'sms' }
  } catch (e) {
    const erreur = e instanceof Error ? e.message : 'erreur_envoi'
    console.error('envoyerMessage:', erreur)
    return { ok: false, canal: null, erreur }
  }
}
