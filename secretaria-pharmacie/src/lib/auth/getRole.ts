import { createClient } from '@/lib/supabase/server'

export async function getUserRole() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: pharmacie } = await supabase
    .from('pharmacies')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()
  if (pharmacie) return { role: 'pharmacie' as const, id: pharmacie.id }

  const { data: admin } = await supabase
    .from('admins')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()
  if (admin) return { role: 'admin' as const, id: admin.id }

  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()
  if (client) return { role: 'client' as const, id: client.id }

  return null
}
