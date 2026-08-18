import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import GestionRdvClient from './GestionRdvClient'

export default async function GestionRdvPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase = await createClient()

  const { data: reservation } = await supabase
    .from('reservations')
    .select('id, statut, client_nom, creneaux(debut, pharmacies(nom, adresse, telephone))')
    .eq('token_gestion', token)
    .single()

  if (!reservation) notFound()

  return <GestionRdvClient reservation={reservation} token={token} />
}
