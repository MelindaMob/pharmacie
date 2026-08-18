'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AnnulerCreneauButton({
  creneauId,
  onAnnule,
}: {
  creneauId: string
  onAnnule: () => void
}) {
  const [loading, setLoading] = useState(false)

  const annuler = async () => {
    if (!confirm('Annuler ce rendez-vous ? Le client sera notifié.')) return

    setLoading(true)
    const supabase = createClient()

    const { data: reservation } = await supabase
      .from('reservations')
      .select('id')
      .eq('creneau_id', creneauId)
      .eq('statut', 'confirme')
      .single()

    if (reservation) {
      await supabase.from('reservations').update({ statut: 'annule' }).eq('id', reservation.id)
    }

    await supabase.from('creneaux').update({ statut: 'disponible' }).eq('id', creneauId)

    setLoading(false)
    onAnnule()
  }

  return (
    <button onClick={annuler} disabled={loading} className="text-red-600 text-sm underline">
      {loading ? 'Annulation...' : 'Annuler'}
    </button>
  )
}
