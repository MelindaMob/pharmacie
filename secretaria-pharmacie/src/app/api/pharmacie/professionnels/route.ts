import { createClient } from '@supabase/supabase-js'
import { getUserRole } from '@/lib/auth/getRole'
import { generateCreneauxPourPharmacie } from '@/lib/creneaux/generateCreneaux'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function autorise(pharmacieId: string) {
  const role = await getUserRole()
  if (!role || (role.role !== 'pharmacie' && role.role !== 'admin')) return false
  if (role.role === 'pharmacie' && role.id !== pharmacieId) return false
  return true
}

/** Recalcule les statuts des créneaux de la pharmacie (équipe modifiée). */
async function resynchroniser(pharmacieId: string) {
  await supabaseAdmin.rpc('attribuer_reservations_orphelines', { p_pharmacie_id: pharmacieId })
  await supabaseAdmin.rpc('recalculer_statuts_pharmacie', { p_pharmacie_id: pharmacieId })
  await generateCreneauxPourPharmacie(pharmacieId)
}

// POST : ajoute un professionnel
export async function POST(request: NextRequest) {
  const body = await request.json()
  const pharmacieId = typeof body.pharmacieId === 'string' ? body.pharmacieId : ''
  const nom = typeof body.nom === 'string' ? body.nom.trim() : ''

  if (!pharmacieId || !nom) {
    return NextResponse.json({ error: 'Nom manquant' }, { status: 400 })
  }
  if (nom.length > 60) {
    return NextResponse.json({ error: 'Nom trop long (60 caractères max.)' }, { status: 400 })
  }
  if (!(await autorise(pharmacieId))) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const { data, error } = await supabaseAdmin
    .from('professionnels')
    .insert({ pharmacie_id: pharmacieId, nom })
    .select('id, nom, actif')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message || "Erreur lors de l'ajout" }, { status: 400 })
  }
  return NextResponse.json({ success: true, professionnel: data })
}

// PATCH : renomme / active / désactive un professionnel
export async function PATCH(request: NextRequest) {
  const body = await request.json()
  const id = typeof body.id === 'string' ? body.id : ''
  if (!id) return NextResponse.json({ error: 'Identifiant manquant' }, { status: 400 })

  const { data: pro } = await supabaseAdmin
    .from('professionnels')
    .select('id, pharmacie_id')
    .eq('id', id)
    .maybeSingle()
  if (!pro) return NextResponse.json({ error: 'Professionnel introuvable' }, { status: 404 })
  if (!(await autorise(pro.pharmacie_id))) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const maj: { nom?: string; actif?: boolean } = {}
  if (typeof body.nom === 'string') {
    const nom = body.nom.trim()
    if (!nom) return NextResponse.json({ error: 'Nom vide' }, { status: 400 })
    maj.nom = nom.slice(0, 60)
  }
  if (typeof body.actif === 'boolean') maj.actif = body.actif

  const { error } = await supabaseAdmin.from('professionnels').update(maj).eq('id', id)
  if (error) {
    return NextResponse.json({ error: error.message || 'Erreur' }, { status: 400 })
  }

  if ('actif' in maj) await resynchroniser(pro.pharmacie_id)
  return NextResponse.json({ success: true })
}

// DELETE : supprime un professionnel (ses RDV futurs sont ré-attribués si possible)
export async function DELETE(request: NextRequest) {
  const { id } = await request.json()
  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'Identifiant manquant' }, { status: 400 })
  }

  const { data: pro } = await supabaseAdmin
    .from('professionnels')
    .select('id, pharmacie_id')
    .eq('id', id)
    .maybeSingle()
  if (!pro) return NextResponse.json({ error: 'Professionnel introuvable' }, { status: 404 })
  if (!(await autorise(pro.pharmacie_id))) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const { error } = await supabaseAdmin.from('professionnels').delete().eq('id', id)
  if (error) {
    return NextResponse.json({ error: error.message || 'Erreur' }, { status: 400 })
  }

  await resynchroniser(pro.pharmacie_id)
  return NextResponse.json({ success: true })
}
