'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Pharmacie = {
  id: string
  nom: string
  adresse: string
  telephone: string
  groupement_id: string | null
  created_at: string
}
type Groupement = { id: string; nom: string }

export default function GestionPharmacies({
  pharmacies,
  groupements,
}: {
  pharmacies: Pharmacie[]
  groupements: Groupement[]
}) {
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const router = useRouter()

  const changerGroupement = async (pharmacieId: string, groupementId: string) => {
    setLoadingId(pharmacieId)
    const supabase = createClient()
    await supabase
      .from('pharmacies')
      .update({ groupement_id: groupementId || null })
      .eq('id', pharmacieId)
    setLoadingId(null)
    router.refresh()
  }

  return (
    <div className="bg-white border rounded-lg p-4">
      <h2 className="font-semibold mb-3">Pharmacies clientes</h2>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="pb-2">Nom</th>
              <th className="pb-2">Adresse</th>
              <th className="pb-2">Téléphone</th>
              <th className="pb-2">Groupement</th>
              <th className="pb-2">Lien</th>
            </tr>
          </thead>
          <tbody>
            {pharmacies.map((p) => (
              <tr key={p.id} className="border-b last:border-0">
                <td className="py-2 font-medium">{p.nom}</td>
                <td className="py-2 text-gray-600">{p.adresse}</td>
                <td className="py-2 text-gray-600">{p.telephone}</td>
                <td className="py-2">
                  <select
                    value={p.groupement_id ?? ''}
                    onChange={(e) => changerGroupement(p.id, e.target.value)}
                    disabled={loadingId === p.id}
                    className="border rounded px-2 py-1"
                  >
                    <option value="">Aucun</option>
                    {groupements.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.nom}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-2">
                  <a
                    href={`/pharmacie/${p.id}`}
                    target="_blank"
                    className="text-blue-600 underline text-xs"
                  >
                    Voir la fiche
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {pharmacies.length === 0 && (
          <p className="text-sm text-gray-500 mt-3">Aucune pharmacie enregistrée.</p>
        )}
      </div>
    </div>
  )
}
