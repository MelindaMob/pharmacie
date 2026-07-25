import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import CreneauxDisponibles from './CreneauxDisponibles'

export default async function FichePharmaciePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: pharmacie } = await supabase
    .from('pharmacies')
    .select('id, nom, adresse, telephone')
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
    .limit(200)

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold">{pharmacie.nom}</h1>
      <p className="text-gray-600 mb-1">{pharmacie.adresse}</p>
      <p className="text-gray-600 mb-6">{pharmacie.telephone}</p>

      <CreneauxDisponibles
        pharmacieId={pharmacie.id}
        typesRdv={typesRdv ?? []}
        creneaux={creneaux ?? []}
      />
    </div>
  )
}
