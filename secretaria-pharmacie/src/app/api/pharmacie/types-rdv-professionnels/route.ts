import { createClient } from '@supabase/supabase-js'
import { getUserRole } from '@/lib/auth/getRole'
import { generateCreneauxPourPharmacie } from '@/lib/creneaux/generateCreneaux'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// PUT : remplace l'équipe d'un type de RDV (liste des professionnels qui le réalisent).
// Liste vide = type sans équipe → ancien comportement (« en même temps »).
export async function PUT(request: NextRequest) {
  const role = await getUserRole()
  if (!role || (role.role !== 'pharmacie' && role.role !== 'admin')) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const body = await request.json()
  const pharmacieId = typeof body.pharmacieId === 'string' ? body.pharmacieId : ''
  const typeRdvId = typeof body.typeRdvId === 'string' ? body.typeRdvId : ''
  const professionnelIds: string[] = Array.isArray(body.professionnelIds)
    ? Array.from(new Set(body.professionnelIds.filter((x: unknown) => typeof x === 'string')))
    : []

  if (!pharmacieId || !typeRdvId) {
    return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })
  }
  if (role.role === 'pharmacie' && role.id !== pharmacieId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const { data: type } = await supabaseAdmin
    .from('types_rdv')
    .select('id')
    .eq('id', typeRdvId)
    .eq('pharmacie_id', pharmacieId)
    .maybeSingle()
  if (!type) return NextResponse.json({ error: 'Type de rendez-vous introuvable' }, { status: 404 })

  if (professionnelIds.length > 0) {
    const { data: valides } = await supabaseAdmin
      .from('professionnels')
      .select('id')
      .eq('pharmacie_id', pharmacieId)
      .in('id', professionnelIds)
    if ((valides ?? []).length !== professionnelIds.length) {
      return NextResponse.json({ error: 'Professionnel invalide' }, { status: 400 })
    }
  }

  const { error: errDel } = await supabaseAdmin
    .from('types_rdv_professionnels')
    .delete()
    .eq('type_rdv_id', typeRdvId)
  if (errDel) return NextResponse.json({ error: errDel.message }, { status: 400 })

  if (professionnelIds.length > 0) {
    const { error: errIns } = await supabaseAdmin
      .from('types_rdv_professionnels')
      .insert(professionnelIds.map((pid) => ({ type_rdv_id: typeRdvId, professionnel_id: pid })))
    if (errIns) return NextResponse.json({ error: errIns.message }, { status: 400 })
  }

  // RDV futurs déjà pris sur ce type : on leur attribue un professionnel, puis on recalcule.
  await supabaseAdmin.rpc('attribuer_reservations_orphelines', { p_pharmacie_id: pharmacieId })
  await supabaseAdmin.rpc('recalculer_statuts_pharmacie', { p_pharmacie_id: pharmacieId })
  const gen = await generateCreneauxPourPharmacie(pharmacieId)

  return NextResponse.json({
    success: true,
    creneauxCount: gen.success ? gen.count : 0,
    warning: gen.success ? null : (gen.error ?? 'Créneaux non régénérés'),
  })
}
