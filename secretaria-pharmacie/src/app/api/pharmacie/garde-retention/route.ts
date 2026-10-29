import { createClient } from '@supabase/supabase-js'
import { getUserRole } from '@/lib/auth/getRole'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const DUREES = [24, 48, 72, 168]

// PATCH : change la durée avant effacement automatique des appels de garde.
export async function PATCH(request: NextRequest) {
  const role = await getUserRole()
  if (!role || role.role !== 'pharmacie') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const { heures } = await request.json()
  if (typeof heures !== 'number' || !DUREES.includes(heures)) {
    return NextResponse.json({ error: 'Durée invalide' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('pharmacies')
    .update({ garde_retention_heures: heures })
    .eq('id', role.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Applique tout de suite la nouvelle durée.
  await supabaseAdmin.rpc('purger_messages_garde', { p_pharmacie_id: role.id })

  return NextResponse.json({ success: true })
}
