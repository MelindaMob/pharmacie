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

type FenetreEntree = { jour: string; debut: string; fin: string }

// PUT : remplace en bloc toutes les fenêtres hebdomadaires d'un type de RDV
// (même logique que « Enregistrer les horaires » pour les horaires généraux :
// on envoie tout l'état du jour-par-jour d'un coup, plutôt qu'une ligne à la
// fois). Permet plusieurs fenêtres par jour (ex : 10h-12h ET 15h-17h le lundi),
// sans plafond.
export async function PUT(request: NextRequest) {
  const role = await getUserRole()
  if (!role || (role.role !== 'pharmacie' && role.role !== 'admin')) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const body = await request.json()
  const pharmacieId = typeof body.pharmacieId === 'string' ? body.pharmacieId : ''
  const typeRdvId = typeof body.typeRdvId === 'string' ? body.typeRdvId : ''
  const fenetresBrutes = Array.isArray(body.fenetres) ? body.fenetres : null

  if (!pharmacieId || !typeRdvId || !fenetresBrutes) {
    return NextResponse.json({ error: 'Champs manquants ou invalides' }, { status: 400 })
  }

  const fenetres: FenetreEntree[] = []
  for (const f of fenetresBrutes) {
    const jour = typeof f?.jour === 'string' ? f.jour : ''
    const debut = typeof f?.debut === 'string' ? f.debut : ''
    const fin = typeof f?.fin === 'string' ? f.fin : ''
    if (!JOURS_VALIDES.includes(jour) || !debut || !fin) {
      return NextResponse.json({ error: 'Fenêtre invalide (jour/heures manquants)' }, { status: 400 })
    }
    if (debut >= fin) {
      return NextResponse.json(
        { error: "L'heure de fin doit être après l'heure de début" },
        { status: 400 }
      )
    }
    fenetres.push({ jour, debut, fin })
  }

  if (role.role === 'pharmacie' && role.id !== pharmacieId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }
  if (!(await verifierProprietaire(typeRdvId, pharmacieId))) {
    return NextResponse.json({ error: 'Type de rendez-vous introuvable' }, { status: 404 })
  }

  const { error: erreurSuppression } = await supabaseAdmin
    .from('types_rdv_horaires')
    .delete()
    .eq('type_rdv_id', typeRdvId)

  if (erreurSuppression) {
    return NextResponse.json({ error: messageErreur(erreurSuppression.message) }, { status: 400 })
  }

  let fenetresEnregistrees: { id: string; jour: string; debut: string; fin: string }[] = []

  if (fenetres.length > 0) {
    const { data, error } = await supabaseAdmin
      .from('types_rdv_horaires')
      .insert(fenetres.map((f) => ({ type_rdv_id: typeRdvId, ...f })))
      .select('id, jour, debut, fin')

    if (error) {
      return NextResponse.json({ error: messageErreur(error.message) }, { status: 400 })
    }
    fenetresEnregistrees = data ?? []
  }

  const { count, warning } = await regenererCreneaux(pharmacieId)

  return NextResponse.json({
    success: true,
    fenetres: fenetresEnregistrees,
    creneauxCount: count,
    warning,
  })
}
