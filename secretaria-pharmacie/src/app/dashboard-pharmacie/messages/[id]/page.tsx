import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/auth/getRole'
import { redirect, notFound } from 'next/navigation'
import Messagerie from '@/components/Messagerie'
import DashboardNav from '../../DashboardNav'
import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { compterNonLusPharmacie } from '@/lib/messages/nonLus'
import { unwrapEmbed } from '@/lib/supabase/unwrap'

export const dynamic = 'force-dynamic'

export default async function ConversationPharmaciePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const role = await getUserRole()
  if (!role || role.role !== 'pharmacie') redirect('/connexion')

  const supabase = await createClient()

  const { data: reservation } = await supabase
    .from('reservations')
    .select('id, client_nom, creneaux(debut, pharmacie_id)')
    .eq('id', id)
    .single()

  if (!reservation) notFound()

  const creneau = unwrapEmbed<{ debut: string; pharmacie_id: string }>(reservation.creneaux)
  if (!creneau || creneau.pharmacie_id !== role.id) notFound()

  const nbNonLus = await compterNonLusPharmacie(role.id)

  return (
    <DashboardNav actif="messages" nbNonLus={nbNonLus}>
      <div className="max-w-3xl">
        <Link
          href="/dashboard-pharmacie/messages"
          className="text-sm text-[var(--color-ink-soft)] hover:underline"
        >
          ← Retour aux messages
        </Link>
        <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--color-ink)] mt-2 mb-1">
          RDV — {reservation.client_nom}
        </h2>
        <p className="text-sm text-[var(--color-ink-soft)] mb-6">
          {format(new Date(creneau.debut), "EEEE d MMMM 'à' HH:mm", { locale: fr })}
        </p>
        <Messagerie reservationId={reservation.id} role="pharmacie" />
      </div>
    </DashboardNav>
  )
}
