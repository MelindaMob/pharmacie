import { createClient } from '@supabase/supabase-js'
import { getUserRole } from '@/lib/auth/getRole'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const MAX_DUREE_JOURS = 14

// POST : programme une période de mode garde (plusieurs possibles).
export async function POST(request: NextRequest) {
  const role = await getUserRole()
  if (!role || (role.role !== 'pharmacie' && role.role !== 'admin')) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const body = await request.json()
  const pharmacieId = typeof body.pharmacieId === 'string' ? body.pharmacieId : ''
  const debut = typeof body.debut === 'string' ? new Date(body.debut) : null
  const fin = typeof body.fin === 'string' ? new Date(body.fin) : null

  if (!pharmacieId || !debut || !fin || isNaN(debut.getTime()) || isNaN(fin.getTime())) {
    return NextResponse.json({ error: 'Dates manquantes ou invalides' }, { status: 400 })
  }
  if (role.role === 'pharmacie' && role.id !== pharmacieId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }
  if (fin <= debut) {
    return NextResponse.json({ error: 'La fin doit être après le début' }, { status: 400 })
  }
  if (fin.getTime() - debut.getTime() > MAX_DUREE_JOURS * 24 * 3600 * 1000) {
    return NextResponse.json(
      { error: `Période trop longue (max. ${MAX_DUREE_JOURS} jours)` },
      { status: 400 }
    )
  }
  if (fin <= new Date()) {
    return NextResponse.json({ error: 'Cette période est déjà passée' }, { status: 400 })
  }

  const { data: pharmacie } = await supabaseAdmin
    .from('pharmacies')
    .select('numero_garde')
    .eq('id', pharmacieId)
    .single()

  if (!pharmacie?.numero_garde?.trim()) {
    return NextResponse.json(
      { error: "Numéro de la pharmacie de garde non renseigné : contactez Secretar.IA." },
      { status: 400 }
    )
  }

  // Refuse un chevauchement avec une période existante (évite les doublons).
  const { data: chevauche } = await supabaseAdmin
    .from('gardes_periodes')
    .select('id')
    .eq('pharmacie_id', pharmacieId)
    .lt('debut', fin.toISOString())
    .gt('fin', debut.toISOString())
    .limit(1)

  if (chevauche && chevauche.length > 0) {
    return NextResponse.json(
      { error: 'Cette période chevauche une période de garde déjà programmée' },
      { status: 400 }
    )
  }

  const { data, error } = await supabaseAdmin
    .from('gardes_periodes')
    .insert({
      pharmacie_id: pharmacieId,
      debut: debut.toISOString(),
      fin: fin.toISOString(),
    })
    .select('id, debut, fin')
    .single()

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || "Erreur lors de l'enregistrement" },
      { status: 400 }
    )
  }

  return NextResponse.json({ success: true, periode: data })
}

// DELETE : supprime une période (en cours ou à venir).
export async function DELETE(request: NextRequest) {
  const role = await getUserRole()
  if (!role || (role.role !== 'pharmacie' && role.role !== 'admin')) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const { id } = await request.json()
  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'Identifiant manquant' }, { status: 400 })
  }

  const { data: periode } = await supabaseAdmin
    .from('gardes_periodes')
    .select('id, pharmacie_id')
    .eq('id', id)
    .single()

  if (!periode) {
    return NextResponse.json({ error: 'Période introuvable' }, { status: 404 })
  }
  if (role.role === 'pharmacie' && role.id !== periode.pharmacie_id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const { error } = await supabaseAdmin.from('gardes_periodes').delete().eq('id', id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
