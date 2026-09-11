import { createClient } from '@supabase/supabase-js'
import { getUserRole } from '@/lib/auth/getRole'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function messageErreur(code: string | undefined, message: string | undefined): string {
  if (message?.trim()) return message
  return "Erreur lors de l'enregistrement"
}

// POST : ajoute une information libre, avec dates de début/fin optionnelles
export async function POST(request: NextRequest) {
  const role = await getUserRole()
  if (!role || (role.role !== 'pharmacie' && role.role !== 'admin')) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const body = await request.json()
  const pharmacieId = typeof body.pharmacieId === 'string' ? body.pharmacieId : ''
  const contenu = typeof body.contenu === 'string' ? body.contenu.trim() : ''
  const dateDebut = typeof body.dateDebut === 'string' && body.dateDebut ? body.dateDebut : null
  const dateFin = typeof body.dateFin === 'string' && body.dateFin ? body.dateFin : null

  if (!pharmacieId || !contenu) {
    return NextResponse.json({ error: 'Contenu requis' }, { status: 400 })
  }

  if (dateDebut && dateFin && dateDebut > dateFin) {
    return NextResponse.json(
      { error: 'La date de début doit être avant la date de fin' },
      { status: 400 }
    )
  }

  if (role.role === 'pharmacie' && role.id !== pharmacieId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const { data, error } = await supabaseAdmin
    .from('infos_pharmacie')
    .insert({ pharmacie_id: pharmacieId, contenu, date_debut: dateDebut, date_fin: dateFin })
    .select('id')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: messageErreur(error?.code, error?.message) }, { status: 400 })
  }

  return NextResponse.json({ success: true, infoId: data.id })
}

// PATCH : bascule active/inactive
export async function PATCH(request: NextRequest) {
  const role = await getUserRole()
  if (!role || (role.role !== 'pharmacie' && role.role !== 'admin')) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const { id, pharmacieId, active } = await request.json()
  if (!id || typeof id !== 'string' || typeof active !== 'boolean') {
    return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })
  }

  if (role.role === 'pharmacie' && role.id !== pharmacieId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const { data, error } = await supabaseAdmin
    .from('infos_pharmacie')
    .update({ active })
    .eq('id', id)
    .eq('pharmacie_id', pharmacieId)
    .select('id')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: messageErreur(error?.code, error?.message) }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}

// DELETE : supprime une information
export async function DELETE(request: NextRequest) {
  const role = await getUserRole()
  if (!role || (role.role !== 'pharmacie' && role.role !== 'admin')) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const { id, pharmacieId } = await request.json()
  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'Identifiant manquant' }, { status: 400 })
  }

  if (role.role === 'pharmacie' && role.id !== pharmacieId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const { error } = await supabaseAdmin
    .from('infos_pharmacie')
    .delete()
    .eq('id', id)
    .eq('pharmacie_id', pharmacieId)

  if (error) {
    return NextResponse.json({ error: messageErreur(error.code, error.message) }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
