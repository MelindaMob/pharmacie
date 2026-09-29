import { createClient } from '@supabase/supabase-js'
import { generateCreneauxPourPharmacie } from '@/lib/creneaux/generateCreneaux'
import { getUserRole } from '@/lib/auth/getRole'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const JOURS_VALIDES = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']

function messageErreur(message: string | undefined): string {
  if (message?.trim()) return message
  return "Erreur lors de l'enregistrement"
}

async function regenererCreneaux(pharmacieId: string) {
  const result = await generateCreneauxPourPharmacie(pharmacieId)
  if (!result.success) {
    return { count: 0, warning: result.error ?? 'Créneaux non régénérés' }
  }
  return { count: result.count, warning: null as string | null }
}

/** Vérifie que ce type de RDV appartient bien à la pharmacie appelante. */
async function verifierProprietaire(typeRdvId: string, pharmacieId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('types_rdv')
    .select('id')
    .eq('id', typeRdvId)
    .eq('pharmacie_id', pharmacieId)
    .maybeSingle()
  return !!data
}

// POST : ajoute une fenêtre hebdomadaire récurrente pour un type de RDV
// (ex : "Vaccination, mardi, 10:00–12:00"). Pas de limite de nombre de
// fenêtres par type ni par jour.
export async function POST(request: NextRequest) {
  const role = await getUserRole()
  if (!role || (role.role !== 'pharmacie' && role.role !== 'admin')) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const body = await request.json()
  const pharmacieId = typeof body.pharmacieId === 'string' ? body.pharmacieId : ''
  const typeRdvId = typeof body.typeRdvId === 'string' ? body.typeRdvId : ''
  const jour = typeof body.jour === 'string' ? body.jour : ''
  const debut = typeof body.debut === 'string' ? body.debut : ''
  const fin = typeof body.fin === 'string' ? body.fin : ''

  if (!pharmacieId || !typeRdvId || !JOURS_VALIDES.includes(jour) || !debut || !fin) {
    return NextResponse.json({ error: 'Champs manquants ou invalides' }, { status: 400 })
  }
  if (debut >= fin) {
    return NextResponse.json({ error: "L'heure de fin doit être après l'heure de début" }, { status: 400 })
  }

  if (role.role === 'pharmacie' && role.id !== pharmacieId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }
  if (!(await verifierProprietaire(typeRdvId, pharmacieId))) {
    return NextResponse.json({ error: 'Type de rendez-vous introuvable' }, { status: 404 })
  }

  const { data, error } = await supabaseAdmin
    .from('types_rdv_horaires')
    .insert({ type_rdv_id: typeRdvId, jour, debut, fin })
    .select('id, type_rdv_id, jour, debut, fin')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: messageErreur(error?.message) }, { status: 400 })
  }

  const { count, warning } = await regenererCreneaux(pharmacieId)

  return NextResponse.json({ success: true, fenetre: data, creneauxCount: count, warning })
}

// DELETE : retire une fenêtre hebdomadaire.
export async function DELETE(request: NextRequest) {
  const role = await getUserRole()
  if (!role || (role.role !== 'pharmacie' && role.role !== 'admin')) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const { id, pharmacieId } = await request.json()
  if (!id || typeof id !== 'string' || !pharmacieId) {
    return NextResponse.json({ error: 'Identifiant manquant' }, { status: 400 })
  }

  const { data: fenetre } = await supabaseAdmin
    .from('types_rdv_horaires')
    .select('id, type_rdv_id, types_rdv!inner(pharmacie_id)')
    .eq('id', id)
    .single()

  const proprietairePharmacieId = (
    Array.isArray(fenetre?.types_rdv) ? fenetre?.types_rdv[0] : fenetre?.types_rdv
  )?.pharmacie_id

  if (!fenetre || proprietairePharmacieId !== pharmacieId) {
    return NextResponse.json({ error: 'Fenêtre introuvable' }, { status: 404 })
  }
  if (role.role === 'pharmacie' && role.id !== pharmacieId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const { error } = await supabaseAdmin.from('types_rdv_horaires').delete().eq('id', id)
  if (error) {
    return NextResponse.json({ error: messageErreur(error.message) }, { status: 400 })
  }

  const { count, warning } = await regenererCreneaux(pharmacieId)

  return NextResponse.json({ success: true, creneauxCount: count, warning })
}
