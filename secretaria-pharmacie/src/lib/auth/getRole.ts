import { createClient } from '@/lib/supabase/server'

export async function getUserRole() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const [{ data: pharmacie }, { data: admin }, { data: client }] = await Promise.all([
    supabase.from('pharmacies').select('id').eq('auth_user_id', user.id).maybeSingle(),
    supabase.from('admins').select('id').eq('auth_user_id', user.id).maybeSingle(),
    supabase.from('clients').select('id').eq('auth_user_id', user.id).limit(1).maybeSingle(),
  ])

  if (pharmacie) return { role: 'pharmacie' as const, id: pharmacie.id }
  if (admin) return { role: 'admin' as const, id: admin.id }
  if (client) return { role: 'client' as const, id: client.id }

  return null
}
