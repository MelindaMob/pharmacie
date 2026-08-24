import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import GestionRdvClient from './GestionRdvClient'
import { unwrapEmbed } from '@/lib/supabase/unwrap'

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

  const creneau = unwrapEmbed<{ debut: string; pharmacies: unknown }>(reservation.creneaux)

  return (
    <GestionRdvClient
      reservation={{
        id: reservation.id,
        statut: reservation.statut,
        client_nom: reservation.client_nom,
        creneaux: creneau
          ? {
              debut: creneau.debut,
              pharmacies: unwrapEmbed<{
                nom: string
                adresse: string
                telephone: string
              }>(creneau.pharmacies),
            }
          : null,
      }}
      token={token}
    />
  )
}
