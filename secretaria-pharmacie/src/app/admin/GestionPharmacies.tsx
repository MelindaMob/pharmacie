'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AdresseAutocomplete from '@/components/AdresseAutocomplete'

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
  const [editionAdresseId, setEditionAdresseId] = useState<string | null>(null)
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

  const changerAdresse = async (
    pharmacieId: string,
    suggestion: { label: string; lat: number; lng: number }
  ) => {
    const supabase = createClient()
    await supabase.from('pharmacies').update({ adresse: suggestion.label }).eq('id', pharmacieId)
    await supabase.rpc('update_pharmacie_location', {
      p_pharmacie_id: pharmacieId,
      p_lat: suggestion.lat,
      p_lng: suggestion.lng,
    })
    setEditionAdresseId(null)
    router.refresh()
  }

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-lg p-4">
      <h2 className="font-semibold text-[var(--color-ink)] mb-3">Pharmacies clientes</h2>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[var(--color-ink-soft)] border-b border-[var(--color-line)]">
              <th className="pb-2">Nom</th>
              <th className="pb-2">Adresse</th>
              <th className="pb-2">Téléphone</th>
              <th className="pb-2">Groupement</th>
              <th className="pb-2">Lien</th>
            </tr>
          </thead>
          <tbody>
            {pharmacies.map((p) => (
              <tr key={p.id} className="border-b border-[var(--color-line)] last:border-0">
                <td className="py-2 font-medium text-[var(--color-ink)]">{p.nom}</td>
                <td className="py-2 text-[var(--color-ink-soft)] min-w-[220px]">
                  {editionAdresseId === p.id ? (
                    <AdresseAutocomplete
                      valeurInitiale={p.adresse}
                      onSelect={(s) => changerAdresse(p.id, s)}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditionAdresseId(p.id)}
                      className="text-left hover:underline"
                    >
                      {p.adresse || (
                        <span className="text-[var(--color-ink-soft)] italic">Non renseignée</span>
                      )}
                    </button>
                  )}
                </td>
                <td className="py-2 text-[var(--color-ink-soft)] font-[family-name:var(--font-mono)]">
                  {p.telephone}
                </td>
                <td className="py-2">
                  <select
                    value={p.groupement_id ?? ''}
                    onChange={(e) => changerGroupement(p.id, e.target.value)}
                    disabled={loadingId === p.id}
                    className="border border-[var(--color-line)] rounded-lg px-2 py-1 text-sm"
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
                    href={`/admin/pharmacie/${p.id}`}
                    className="text-[var(--color-primary)] underline text-xs"
                  >
                    Voir la fiche
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {pharmacies.length === 0 && (
          <p className="text-sm text-[var(--color-ink-soft)] mt-3">Aucune pharmacie enregistrée.</p>
        )}
      </div>
    </div>
  )
}
