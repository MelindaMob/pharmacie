import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { getUserRole } from '@/lib/auth/getRole'
import { randomBytes } from 'crypto'

function adminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Variables Supabase manquantes (URL ou SERVICE_ROLE_KEY)')
  }
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

function messageDepuisErreur(err: unknown, fallback: string): string {
  if (!err) return fallback
  if (typeof err === 'string') {
    const t = err.trim()
    return t && t !== '{}' ? t : fallback
  }
  if (typeof err === 'object') {
    const e = err as Record<string, unknown>
    const name = typeof e.name === 'string' ? e.name : ''
    const status = e.status != null ? String(e.status) : ''
    for (const key of ['message', 'msg', 'error_description', 'error']) {
      const v = e[key]
      if (typeof v === 'string' && v.trim() && v !== '{}') {
        const parts = [name, v, status && `status ${status}`].filter(Boolean)
        return parts.join(' — ')
      }
    }
    if (name === 'AuthRetryableFetchError') {
      return (
        'Impossible de joindre Supabase Auth (réseau ou envoi d’email). ' +
        'Vérifiez SMTP dans Supabase → Authentication → Emails, et votre connexion.'
      )
    }
    try {
      const s = JSON.stringify(err)
      if (s && s !== '{}') return s
    } catch {
      /* ignore */
    }
  }
  return fallback
}

async function creerComptePharmacie(
  supabase: SupabaseClient,
  email: string,
  redirectTo: string
): Promise<{ userId: string; lienInvitation: string | null; mode: 'invite' | 'create' }> {
  // 1) Tentative d’invitation classique (envoie l’email si SMTP OK)
  const invite = await supabase.auth.admin.inviteUserByEmail(email, { redirectTo })
  if (!invite.error && invite.data.user) {
    return { userId: invite.data.user.id, lienInvitation: null, mode: 'invite' }
  }

  const inviteMsg = messageDepuisErreur(invite.error, '')
  const dejaUtilise = /already|registered|exists|duplicate|unique/i.test(inviteMsg)
  if (dejaUtilise) {
    throw new Error(`Cet email (${email}) est déjà utilisé. Choisissez une autre adresse.`)
  }

  // 2) Fallback : créer le compte sans email, puis générer le lien d’invitation
  const passwordTemp = randomBytes(24).toString('base64url')
  const created = await supabase.auth.admin.createUser({
    email,
    password: passwordTemp,
    email_confirm: true,
  })

  if (created.error || !created.data.user) {
    const createMsg = messageDepuisErreur(created.error, inviteMsg || 'Erreur création compte')
    const emailDejaPris = /already|registered|exists|duplicate|unique/i.test(createMsg)

    // Invitation a peut-être créé l’user avant d’échouer sur l’envoi d’email
    if (emailDejaPris) {
      const linkExist = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: { redirectTo },
      })
      const userId = linkExist.data?.user?.id
      const actionLink =
        linkExist.data?.properties?.action_link ??
        (linkExist.data as { action_link?: string } | undefined)?.action_link ??
        null
      if (userId) {
        return { userId, lienInvitation: actionLink, mode: 'create' }
      }
      throw new Error(`Cet email (${email}) est déjà utilisé. Choisissez une autre adresse.`)
    }

    throw new Error(
      invite.error
        ? `Invitation email échouée (${inviteMsg}). Création directe : ${createMsg}`
        : createMsg
    )
  }

  const link = await supabase.auth.admin.generateLink({
    type: 'invite',
    email,
    options: { redirectTo },
  })

  const actionLink =
    link.data?.properties?.action_link ??
    (link.data as { action_link?: string } | undefined)?.action_link ??
    null

  return {
    userId: created.data.user.id,
    lienInvitation: actionLink,
    mode: 'create',
  }
}

export async function POST(request: NextRequest) {
  const role = await getUserRole()
  if (!role || role.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const { nom, email, telephone, groupementId, retellPhoneNumber } = await request.json()

  if (!nom || !email || !telephone) {
    return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })
  }

  const emailNorm = String(email).trim().toLowerCase()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (!siteUrl) {
    return NextResponse.json(
      { error: 'NEXT_PUBLIC_SITE_URL manquant dans les variables d’environnement' },
      { status: 500 }
    )
  }

  let supabase: SupabaseClient
  try {
    supabase = adminClient()
  } catch (e) {
    return NextResponse.json(
      { error: messageDepuisErreur(e, 'Config Supabase invalide') },
      { status: 500 }
    )
  }

  let userId: string
  let lienInvitation: string | null = null
  let mode: 'invite' | 'create' = 'invite'

  try {
    const compte = await creerComptePharmacie(
      supabase,
      emailNorm,
      `${siteUrl}/auth/definir-mot-de-passe`
    )
    userId = compte.userId
    lienInvitation = compte.lienInvitation
    mode = compte.mode
  } catch (e) {
    return NextResponse.json(
      { error: messageDepuisErreur(e, 'Erreur création compte auth') },
      { status: 400 }
    )
  }

  const payload: Record<string, unknown> = {
    auth_user_id: userId,
    nom: String(nom).trim(),
    adresse: '',
    telephone: String(telephone).trim(),
    groupement_id: groupementId || null,
    horaires_ouverture: {},
    delai_annulation_heures: 2,
  }

  const retell =
    typeof retellPhoneNumber === 'string' && retellPhoneNumber.trim()
      ? retellPhoneNumber.trim()
      : null
  if (retell) {
    payload.retell_phone_number = retell
  }

  let { data: pharmacie, error: pharmacieError } = await supabase
    .from('pharmacies')
    .insert(payload)
    .select('id')
    .single()

  if (
    pharmacieError &&
    retell &&
    /retell_phone_number/i.test(pharmacieError.message ?? '')
  ) {
    delete payload.retell_phone_number
    const retry = await supabase.from('pharmacies').insert(payload).select('id').single()
    pharmacie = retry.data
    pharmacieError = retry.error
  }

  if (pharmacieError || !pharmacie) {
    await supabase.auth.admin.deleteUser(userId)
    return NextResponse.json(
      {
        error: messageDepuisErreur(pharmacieError, 'Erreur création fiche pharmacie'),
      },
      { status: 500 }
    )
  }

  if (retell) {
    await supabase
      .from('pharmacies')
      .update({ retell_phone_number: retell })
      .eq('id', pharmacie.id)
  }

  return NextResponse.json({
    success: true,
    pharmacieId: pharmacie.id,
    mode,
    lienInvitation,
  })
}
