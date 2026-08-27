import { generateCreneauxPourPharmacie } from '@/lib/creneaux/generateCreneaux'
import { getUserRole } from '@/lib/auth/getRole'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const role = await getUserRole()
  if (!role || (role.role !== 'pharmacie' && role.role !== 'admin')) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const { pharmacieId } = await request.json()

  if (!pharmacieId) {
    return NextResponse.json({ error: 'pharmacieId manquant' }, { status: 400 })
  }

  if (role.role === 'pharmacie' && role.id !== pharmacieId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const result = await generateCreneauxPourPharmacie(pharmacieId)

  if (!result.success) {
    return NextResponse.json(
      { success: false, count: 0, error: result.error ?? 'Erreur génération' },
      { status: 400 }
    )
  }

  return NextResponse.json(result)
}
