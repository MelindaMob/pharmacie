import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { getUserRole } from '@/lib/auth/getRole'
import { normaliserTexte } from '@/lib/medicaments/normaliser'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const role = await getUserRole()
  if (!role) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const q = request.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (q.length < 2) {
    return NextResponse.json({ resultats: [] })
  }

  const { data, error } = await supabaseAdmin
    .from('medicaments')
    .select('id, denomination, forme_pharmaceutique')
    .ilike('denomination_normalisee', `%${normaliserTexte(q)}%`)
    .order('denomination', { ascending: true })
    .limit(15)

  if (error) {
    return NextResponse.json({ error: 'Recherche impossible' }, { status: 500 })
  }

  return NextResponse.json({ resultats: data })
}
