import { createClient } from '@supabase/supabase-js'
import { getUserRole } from '@/lib/auth/getRole'
import { generateCreneauxPourPharmacie } from '@/lib/creneaux/generateCreneaux'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const JOURS_VALIDES = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']

// PUT : remplace en bloc les horaires de présence d'un professionnel.
// Liste vide = il suit les horaires de la pharmacie.
export async function PUT(request: NextRequest) {
  const role = await getUserRole()
  if (!role || (role.role !== 'pharmacie' && role.role !== 'admin')) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const body = await request.json()
  const professionnelId = typeof body.professionnelId === 'string' ? body.professionnelId : ''
  const brutes = Array.isArray(body.fenetres) ? body.fenetres : null
  if (!professionnelId || !brutes) {
    return NextResponse.json({ error: 'Champs manquants ou invalides' }, { status: 400 })
  }

  const fenetres: { jour: string; debut: string; fin: string }[] = []
  for (const f of brutes) {
    const jour = typeof f?.jour === 'string' ? f.jour : ''
    const debut = typeof f?.debut === 'string' ? f.debut : ''
    const fin = typeof f?.fin === 'string' ? f.fin : ''
    if (!JOURS_VALIDES.includes(jour) || !debut || !fin) {
      return NextResponse.json({ error: 'Plage invalide (jour/heures manquants)' }, { status: 400 })
    }
    if (debut >= fin) {
      return NextResponse.json(
        { error: "L'heure de fin doit être après l'heure de début" },
        { status: 400 }
      )
    }
    fenetres.push({ jour, debut, fin })
  }

  const { data: pro } = await supabaseAdmin
    .from('professionnels')
    .select('id, pharmacie_id')
    .eq('id', professionnelId)
    .maybeSingle()
  if (!pro) return NextResponse.json({ error: 'Professionnel introuvable' }, { status: 404 })
  if (role.role === 'pharmacie' && role.id !== pro.pharmacie_id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const { error: errDel } = await supabaseAdmin
    .from('professionnels_horaires')
    .delete()
    .eq('professionnel_id', professionnelId)
  if (errDel) return NextResponse.json({ error: errDel.message }, { status: 400 })

  let enregistrees: { id: string; jour: string; debut: string; fin: string }[] = []
  if (fenetres.length > 0) {
    const { data, error } = await supabaseAdmin
      .from('professionnels_horaires')
      .insert(fenetres.map((f) => ({ professionnel_id: professionnelId, ...f })))
      .select('id, jour, debut, fin')
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    enregistrees = data ?? []
  }

  await supabaseAdmin.rpc('attribuer_reservations_orphelines', { p_pharmacie_id: pro.pharmacie_id })
  await supabaseAdmin.rpc('recalculer_statuts_pharmacie', { p_pharmacie_id: pro.pharmacie_id })
  const gen = await generateCreneauxPourPharmacie(pro.pharmacie_id)

  return NextResponse.json({
    success: true,
    fenetres: enregistrees,
    creneauxCount: gen.success ? gen.count : 0,
    warning: gen.success ? null : (gen.error ?? 'Créneaux non régénérés'),
  })
}
