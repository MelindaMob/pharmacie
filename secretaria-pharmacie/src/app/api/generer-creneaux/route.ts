import { generateCreneauxPourPharmacie } from '@/lib/creneaux/generateCreneaux'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { pharmacieId } = await request.json()

  if (!pharmacieId) {
    return NextResponse.json({ error: 'pharmacieId manquant' }, { status: 400 })
  }

  const result = await generateCreneauxPourPharmacie(pharmacieId)
  return NextResponse.json(result)
}
