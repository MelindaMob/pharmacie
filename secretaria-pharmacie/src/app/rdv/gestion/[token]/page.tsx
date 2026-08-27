import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import GestionRdvClient from './GestionRdvClient'
import { unwrapEmbed } from '@/lib/supabase/unwrap'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function GestionRdvPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  const { data: reservation } = await supabaseAdmin
    .from('reservations')
    .select(
      'id, statut, client_nom, token_gestion, creneaux(debut, pharmacie_id, pharmacies(nom, adresse, telephone, delai_annulation_heures))'
    )
    .eq('token_gestion', token)
    .single()

  if (!reservation) notFound()

  const creneau = unwrapEmbed<{
    debut: string
    pharmacie_id: string
    pharmacies: unknown
  }>(reservation.creneaux)

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
                delai_annulation_heures?: number
              }>(creneau.pharmacies),
            }
          : null,
      }}
      token={token}
    />
  )
}
