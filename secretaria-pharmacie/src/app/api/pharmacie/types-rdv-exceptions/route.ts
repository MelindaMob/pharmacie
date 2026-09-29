import { createClient } from '@supabase/supabase-js'
import { generateCreneauxPourPharmacie } from '@/lib/creneaux/generateCreneaux'
import { getUserRole } from '@/lib/auth/getRole'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const MAX_JOURS_PLAGE = 180

function messageErreur(message: string | undefined): string {
  if (message?.trim()) return message
  return 'Erreur lors de la sauvegarde'
}

async function regenererCreneaux(pharmacieId: string) {
  const result = await generateCreneauxPourPharmacie(pharmacieId)
  if (!result.success) {
    return { count: 0, warning: result.error ?? 'Créneaux non régénérés' }
  }
  return { count: result.count, warning: null as string | null }
}

async function verifierProprietaire(typeRdvId: string, pharmacieId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('types_rdv')
    .select('id')
    .eq('id', typeRdvId)
    .eq('pharmacie_id', pharmacieId)
    .maybeSingle()
  return !!data
}

// POST : ajoute une dérogation exceptionnelle pour un type de RDV sur une
// période définie — soit "fermé" (ce type n'est pas proposé sur la période),
// soit un horaire de remplacement (remplace ses fenêtres habituelles sur la
// période, tous les jours où la pharmacie est ouverte).
export async function POST(request: NextRequest) {
  const role = await getUserRole()
  if (!role || (role.role !== 'pharmacie' && role.role !== 'admin')) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const body = await request.json()
  const pharmacieId = typeof body.pharmacieId === 'string' ? body.pharmacieId : ''
  const typeRdvId = typeof body.typeRdvId === 'string' ? body.typeRdvId : ''
  const dateDebut = typeof body.dateDebut === 'string' ? body.dateDebut : ''
  const dateFin =
    typeof body.dateFin === 'string' && body.dateFin.trim() ? body.dateFin : dateDebut
  const ferme = Boolean(body.ferme)
  const debut = !ferme && typeof body.debut === 'string' ? body.debut : null
  const fin = !ferme && typeof body.fin === 'string' ? body.fin : null

  if (!pharmacieId || !typeRdvId || !dateDebut) {
    return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })
  }
  if (dateFin < dateDebut) {
    return NextResponse.json({ error: 'La date de fin doit être après la date de début' }, { status: 400 })
  }
  const nbJours =
    (new Date(dateFin).getTime() - new Date(dateDebut).getTime()) / (1000 * 60 * 60 * 24) + 1
  if (nbJours > MAX_JOURS_PLAGE) {
    return NextResponse.json(
      { error: `Plage trop longue (max. ${MAX_JOURS_PLAGE} jours)` },
      { status: 400 }
    )
  }
  if (!ferme && (!debut || !fin)) {
    return NextResponse.json({ error: 'Horaire de remplacement manquant' }, { status: 400 })
  }
  if (!ferme && debut && fin && debut >= fin) {
    return NextResponse.json({ error: "L'heure de fin doit être après l'heure de début" }, { status: 400 })
  }

  if (role.role === 'pharmacie' && role.id !== pharmacieId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }
  if (!(await verifierProprietaire(typeRdvId, pharmacieId))) {
    return NextResponse.json({ error: 'Type de rendez-vous introuvable' }, { status: 404 })
  }

  const { data, error } = await supabaseAdmin
    .from('types_rdv_exceptions')
    .insert({
      type_rdv_id: typeRdvId,
      date_debut: dateDebut,
      date_fin: dateFin,
      ferme,
      debut,
      fin,
    })
    .select('id, type_rdv_id, date_debut, date_fin, ferme, debut, fin')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: messageErreur(error?.message) }, { status: 400 })
  }

  const { count, warning } = await regenererCreneaux(pharmacieId)

  return NextResponse.json({ success: true, exception: data, creneauxCount: count, warning })
}

// DELETE : retire une dérogation.
export async function DELETE(request: NextRequest) {
  const role = await getUserRole()
  if (!role || (role.role !== 'pharmacie' && role.role !== 'admin')) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const { id, pharmacieId } = await request.json()
  if (!id || typeof id !== 'string' || !pharmacieId) {
    return NextResponse.json({ error: 'Identifiant manquant' }, { status: 400 })
  }

  const { data: exception } = await supabaseAdmin
    .from('types_rdv_exceptions')
    .select('id, type_rdv_id, types_rdv!inner(pharmacie_id)')
    .eq('id', id)
    .single()

  const proprietairePharmacieId = (
    Array.isArray(exception?.types_rdv) ? exception?.types_rdv[0] : exception?.types_rdv
  )?.pharmacie_id

  if (!exception || proprietairePharmacieId !== pharmacieId) {
    return NextResponse.json({ error: 'Dérogation introuvable' }, { status: 404 })
  }
  if (role.role === 'pharmacie' && role.id !== pharmacieId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const { error } = await supabaseAdmin.from('types_rdv_exceptions').delete().eq('id', id)
  if (error) {
    return NextResponse.json({ error: messageErreur(error.message) }, { status: 400 })
  }

  const { count, warning } = await regenererCreneaux(pharmacieId)

  return NextResponse.json({ success: true, creneauxCount: count, warning })
}
