import { createClient } from '@supabase/supabase-js'
import { eachDayOfInterval, format, parseISO } from 'date-fns'
import { generateCreneauxPourPharmacie } from '@/lib/creneaux/generateCreneaux'
import { getUserRole } from '@/lib/auth/getRole'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const MAX_JOURS_PLAGE = 90

function messageErreur(code: string | undefined, message: string | undefined): string {
  if (code === '23505') {
    return 'Une exception existe déjà pour une des dates sélectionnées.'
  }
  if (message?.trim()) return message
  return 'Erreur lors de la sauvegarde'
}

function datesDansPlage(dateDebut: string, dateFin: string): string[] {
  const debut = parseISO(dateDebut)
  const fin = parseISO(dateFin)
  if (fin < debut) return []
  return eachDayOfInterval({ start: debut, end: fin }).map((d) => format(d, 'yyyy-MM-dd'))
}

async function regenererCreneaux(pharmacieId: string) {
  const result = await generateCreneauxPourPharmacie(pharmacieId)
  if (!result.success) {
    return { count: 0, warning: result.error ?? 'Créneaux non régénérés' }
  }
  return { count: result.count, warning: null as string | null }
}

export async function POST(request: NextRequest) {
  const role = await getUserRole()
  if (!role || (role.role !== 'pharmacie' && role.role !== 'admin')) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const body = await request.json()
  const pharmacieId = typeof body.pharmacieId === 'string' ? body.pharmacieId : ''
  const dateDebut =
    typeof body.dateDebut === 'string'
      ? body.dateDebut
      : typeof body.date === 'string'
        ? body.date
        : ''
  const dateFin =
    typeof body.dateFin === 'string' && body.dateFin.trim() ? body.dateFin : dateDebut
  const ferme = Boolean(body.ferme)
  const horairesSpeciaux =
    !ferme && body.horaires_speciaux?.debut && body.horaires_speciaux?.fin
      ? { debut: body.horaires_speciaux.debut, fin: body.horaires_speciaux.fin }
      : null

  if (!pharmacieId || !dateDebut) {
    return NextResponse.json({ error: 'Date ou pharmacie manquante' }, { status: 400 })
  }

  if (role.role === 'pharmacie' && role.id !== pharmacieId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const dates = datesDansPlage(dateDebut, dateFin)
  if (dates.length === 0) {
    return NextResponse.json({ error: 'Plage de dates invalide' }, { status: 400 })
  }
  if (dates.length > MAX_JOURS_PLAGE) {
    return NextResponse.json(
      { error: `Plage trop longue (max. ${MAX_JOURS_PLAGE} jours)` },
      { status: 400 }
    )
  }

  const lignes = dates.map((date) => ({
    pharmacie_id: pharmacieId,
    date,
    ferme,
    horaires_speciaux: horairesSpeciaux,
  }))

  const enregistrees: {
    id: string
    date: string
    ferme: boolean
    horaires_speciaux: { debut: string; fin: string } | null
  }[] = []

  for (const ligne of lignes) {
    const { data: existante } = await supabaseAdmin
      .from('horaires_exceptionnels')
      .select('id')
      .eq('pharmacie_id', pharmacieId)
      .eq('date', ligne.date)
      .maybeSingle()

    if (existante) {
      const { data, error } = await supabaseAdmin
        .from('horaires_exceptionnels')
        .update({
          ferme: ligne.ferme,
          horaires_speciaux: ligne.horaires_speciaux,
        })
        .eq('id', existante.id)
        .select('id, date, ferme, horaires_speciaux')
        .single()

      if (error) {
        return NextResponse.json(
          { error: messageErreur(error.code, error.message) },
          { status: 400 }
        )
      }
      if (data) enregistrees.push(data)
    } else {
      const { data, error } = await supabaseAdmin
        .from('horaires_exceptionnels')
        .insert(ligne)
        .select('id, date, ferme, horaires_speciaux')
        .single()

      if (error) {
        return NextResponse.json(
          { error: messageErreur(error.code, error.message) },
          { status: 400 }
        )
      }
      if (data) enregistrees.push(data)
    }
  }

  const { count, warning } = await regenererCreneaux(pharmacieId)

  return NextResponse.json({
    success: true,
    nbJours: enregistrees.length,
    creneauxCount: count,
    warning,
    exceptions: enregistrees,
  })
}

export async function DELETE(request: NextRequest) {
  const role = await getUserRole()
  if (!role || (role.role !== 'pharmacie' && role.role !== 'admin')) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const { id } = await request.json()
  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'Identifiant manquant' }, { status: 400 })
  }

  const { data: exception } = await supabaseAdmin
    .from('horaires_exceptionnels')
    .select('id, pharmacie_id')
    .eq('id', id)
    .single()

  if (!exception) {
    return NextResponse.json({ error: 'Exception introuvable' }, { status: 404 })
  }

  if (role.role === 'pharmacie' && role.id !== exception.pharmacie_id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const { error } = await supabaseAdmin.from('horaires_exceptionnels').delete().eq('id', id)

  if (error) {
    return NextResponse.json(
      { error: messageErreur(error.code, error.message) },
      { status: 400 }
    )
  }

  const { count, warning } = await regenererCreneaux(exception.pharmacie_id)

  return NextResponse.json({ success: true, creneauxCount: count, warning })
}
