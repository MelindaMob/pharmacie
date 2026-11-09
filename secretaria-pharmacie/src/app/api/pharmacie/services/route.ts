import { createClient } from '@supabase/supabase-js'
import { getUserRole } from '@/lib/auth/getRole'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// PUT : remplace la liste des services proposés (sans rendez-vous)
export async function PUT(request: NextRequest) {
  const role = await getUserRole()
  if (!role || (role.role !== 'pharmacie' && role.role !== 'admin')) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const body = await request.json()
  const pharmacieId = typeof body.pharmacieId === 'string' ? body.pharmacieId : ''
  if (!pharmacieId) {
    return NextResponse.json({ error: 'Pharmacie requise' }, { status: 400 })
  }
  if (role.role === 'pharmacie' && role.id !== pharmacieId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const brut: unknown[] = Array.isArray(body.services) ? body.services : []
  const vus = new Set<string>()
  const services: string[] = []
  for (const s of brut) {
    if (typeof s !== 'string') continue
    const nom = s.trim().slice(0, 60)
    const cle = nom.toLowerCase()
    if (!nom || vus.has(cle)) continue
    vus.add(cle)
    services.push(nom)
    if (services.length >= 30) break
  }

  const { error } = await supabaseAdmin
    .from('pharmacies')
    .update({ services_proposes: services })
    .eq('id', pharmacieId)

  if (error) {
    return NextResponse.json({ error: error.message || "Erreur lors de l'enregistrement" }, { status: 400 })
  }
  return NextResponse.json({ success: true, services })
}
