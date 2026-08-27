import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { getUserRole } from '@/lib/auth/getRole'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function messageDepuisErreur(err: unknown, fallback: string): string {
  if (!err) return fallback
  if (typeof err === 'string') {
    const t = err.trim()
    return t && t !== '{}' ? t : fallback
  }
  if (typeof err === 'object') {
    const e = err as Record<string, unknown>
    for (const key of ['message', 'msg', 'error_description', 'error']) {
      const v = e[key]
      if (typeof v === 'string' && v.trim() && v !== '{}') return v.trim()
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

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
    emailNorm,
    {
      redirectTo: `${siteUrl}/auth/definir-mot-de-passe`,
    }
  )

  if (authError || !authData.user) {
    const raw = messageDepuisErreur(authError, 'Erreur envoi invitation')
    const dejaUtilise = /already|registered|exists|duplicate|unique/i.test(raw)
    return NextResponse.json(
      {
        error: dejaUtilise
          ? `Cet email (${emailNorm}) est déjà utilisé. Choisissez une autre adresse.`
          : raw,
      },
      { status: 400 }
    )
  }

  const payload: Record<string, unknown> = {
    auth_user_id: authData.user.id,
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

  let { data: pharmacie, error: pharmacieError } = await supabaseAdmin
    .from('pharmacies')
    .insert(payload)
    .select('id')
    .single()

  // Colonne absente (migration non jouée) → réessayer sans le champ Retell
  if (
    pharmacieError &&
    retell &&
    /retell_phone_number/i.test(pharmacieError.message ?? '')
  ) {
    delete payload.retell_phone_number
    const retry = await supabaseAdmin.from('pharmacies').insert(payload).select('id').single()
    pharmacie = retry.data
    pharmacieError = retry.error
  }

  // Si Retell vide et la colonne n'existe pas, le insert sans la clé devrait marcher.
  // Si on a quand même une erreur liée à la colonne alors que retell est null, c'est autre chose.

  if (pharmacieError || !pharmacie) {
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json(
      {
        error: messageDepuisErreur(
          pharmacieError,
          'Erreur création fiche pharmacie'
        ),
      },
      { status: 500 }
    )
  }

  // Retell renseigné mais non stocké au 1er essai (colonne manquante) → tenter un update
  if (retell) {
    await supabaseAdmin
      .from('pharmacies')
      .update({ retell_phone_number: retell })
      .eq('id', pharmacie.id)
  }

  return NextResponse.json({ success: true, pharmacieId: pharmacie.id })
}
