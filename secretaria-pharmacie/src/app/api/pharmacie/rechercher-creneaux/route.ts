import { rechercherCreneauxPublics } from '@/lib/creneaux/rechercherCreneauxPublic'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const pharmacieId = searchParams.get('pharmacieId') ?? ''
  const typeRdvId = searchParams.get('typeRdvId') ?? ''
  const date = searchParams.get('date') ?? ''
  const heure = searchParams.get('heure') ?? ''

  const result = await rechercherCreneauxPublics(pharmacieId, typeRdvId, date, heure)

  if ('error' in result) {
    const status = result.error === 'Pharmacie introuvable' ? 404 : 400
    return NextResponse.json({ error: result.error }, { status })
  }

  return NextResponse.json({ resultat: result })
}
