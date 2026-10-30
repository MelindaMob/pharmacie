import { createClient } from '@supabase/supabase-js'
import { getUserRole } from '@/lib/auth/getRole'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// PATCH : marque un message comme traité / non traité.
export async function PATCH(request: NextRequest) {
  const role = await getUserRole()
  if (!role || role.role !== 'pharmacie') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const { id, traite } = await request.json()
  if (!id || typeof id !== 'string' || typeof traite !== 'boolean') {
    return NextResponse.json({ error: 'Champs invalides' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('messages_appels')
    .update({ traite })
    .eq('id', id)
    .eq('pharmacie_id', role.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
