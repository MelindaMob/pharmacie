import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import CreneauxDisponibles from './CreneauxDisponibles'
import PharmacyTicketCard from './PharmacyTicketCard'

export default async function FichePharmaciePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: pharmacie } = await supabase
    .from('pharmacies')
    .select('id, nom, adresse, telephone, horaires_ouverture')
    .eq('id', id)
    .single()

  if (!pharmacie) notFound()

  const { data: typesRdv } = await supabase
    .from('types_rdv')
    .select('id, nom, duree_minutes')
    .eq('pharmacie_id', id)

  const { data: creneaux } = await supabase
    .from('creneaux')
    .select('id, debut, fin, type_rdv_id, statut')
    .eq('pharmacie_id', id)
    .eq('statut', 'disponible')
    .gt('debut', new Date().toISOString())
    .order('debut', { ascending: true })
    .limit(500)

  return (
    <div className="min-h-screen py-8 sm:py-10 px-4">
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-[300px_1fr] gap-5 sm:gap-6 items-start">
        <div className="md:sticky md:top-20">
          <PharmacyTicketCard
            nom={pharmacie.nom}
            adresse={pharmacie.adresse}
            telephone={pharmacie.telephone}
            horaires={pharmacie.horaires_ouverture}
          />
        </div>

        <div className="ui-panel p-4 sm:p-6">
          <CreneauxDisponibles
            pharmacieId={pharmacie.id}
            typesRdv={typesRdv ?? []}
            creneaux={creneaux ?? []}
          />
        </div>
      </div>
    </div>
  )
}
