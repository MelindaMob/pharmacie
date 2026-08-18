import { createClient } from '@supabase/supabase-js'
import { normaliserNumeroFrancais } from '@/lib/sms/envoyerSms'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function variantesTelephone(telephone: string): string[] {
  const normalise = normaliserNumeroFrancais(telephone)
  const national = normalise.startsWith('+33')
    ? '0' + normalise.slice(3)
    : telephone.replace(/[\s.-]/g, '')
  const brut = telephone.replace(/[\s.-]/g, '')
  return Array.from(new Set([normalise, national, brut, telephone].filter(Boolean)))
}

/**
 * Fusionne fiches invité + réservations (même téléphone) sur une seule fiche liée au compte.
 */
export async function lierReservationsAuCompte(params: {
  authUserId: string
  nom?: string
  email?: string | null
  telephone: string
}) {
  const { authUserId, nom, email, telephone } = params
  const variantes = variantesTelephone(telephone)
  const telephoneNormalise = normaliserNumeroFrancais(telephone)

  const { data: clientsLies } = await supabaseAdmin
    .from('clients')
    .select('id')
    .eq('auth_user_id', authUserId)

  const { data: clientsInvites } = await supabaseAdmin
    .from('clients')
    .select('id')
    .is('auth_user_id', null)
    .in('telephone', variantes)

  let clientPrincipalId = clientsLies?.[0]?.id as string | undefined

  if (!clientPrincipalId && clientsInvites?.[0]) {
    clientPrincipalId = clientsInvites[0].id
  }

  if (!clientPrincipalId) {
    const { data: nouveau, error } = await supabaseAdmin
      .from('clients')
      .insert({
        auth_user_id: authUserId,
        nom: nom ?? 'Client',
        telephone: telephoneNormalise,
        email: email ?? null,
      })
      .select('id')
      .single()

    if (error || !nouveau) {
      throw new Error(error?.message ?? 'Erreur création fiche client')
    }
    return nouveau.id
  }

  // Mettre à jour la fiche principale
  await supabaseAdmin
    .from('clients')
    .update({
      auth_user_id: authUserId,
      telephone: telephoneNormalise,
      ...(nom ? { nom } : {}),
      ...(email ? { email } : {}),
    })
    .eq('id', clientPrincipalId)

  const idsAFusionner = [
    ...(clientsLies ?? []).map((c) => c.id),
    ...(clientsInvites ?? []).map((c) => c.id),
  ].filter((id) => id !== clientPrincipalId)

  // Transférer toutes les résas des doublons + celles au même numéro
  if (idsAFusionner.length > 0) {
    await supabaseAdmin
      .from('reservations')
      .update({ client_id: clientPrincipalId, client_telephone: telephoneNormalise })
      .in('client_id', idsAFusionner)
  }

  const orTel = variantes.map((v) => `client_telephone.eq.${v}`).join(',')
  if (orTel) {
    await supabaseAdmin
      .from('reservations')
      .update({ client_id: clientPrincipalId, client_telephone: telephoneNormalise })
      .or(orTel)
  }

  // Détacher les doublons pour qu'il n'y ait qu'une fiche avec auth_user_id
  if (idsAFusionner.length > 0) {
    await supabaseAdmin
      .from('clients')
      .update({ auth_user_id: null })
      .in('id', idsAFusionner)
  }

  return clientPrincipalId
}
