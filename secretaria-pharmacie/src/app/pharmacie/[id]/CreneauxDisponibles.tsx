'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

type TypeRdv = { id: string; nom: string; duree_minutes: number }
type Creneau = {
  id: string
  debut: string
  fin: string
  type_rdv_id: string
  statut: string
}

export default function CreneauxDisponibles({
  typesRdv,
  creneaux,
}: {
  pharmacieId: string
  typesRdv: TypeRdv[]
  creneaux: Creneau[]
}) {
  const [typeSelectionne, setTypeSelectionne] = useState<string>(typesRdv[0]?.id ?? '')
  const [creneauSelectionne, setCreneauSelectionne] = useState<Creneau | null>(null)
  const [nom, setNom] = useState('')
  const [telephone, setTelephone] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState('')

  const creneauxFiltres = useMemo(
    () => creneaux.filter((c) => c.type_rdv_id === typeSelectionne),
    [creneaux, typeSelectionne]
  )

  // Regrouper les créneaux par jour, pour un affichage plus lisible
  const creneauxParJour = useMemo(() => {
    const groupes: Record<string, Creneau[]> = {}
    creneauxFiltres.forEach((c) => {
      const jour = format(new Date(c.debut), 'EEEE d MMMM', { locale: fr })
      if (!groupes[jour]) groupes[jour] = []
      groupes[jour].push(c)
    })
    return groupes
  }, [creneauxFiltres])

  const reserver = async () => {
    if (!creneauSelectionne || !nom || !telephone) {
      setErreur('Merci de remplir votre nom et téléphone')
      return
    }

    setLoading(true)
    setErreur('')
    const supabase = createClient()

    // 1. Créer le client (mode invité, sans compte)
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .insert({ nom, telephone })
      .select('id')
      .single()

    if (clientError || !client) {
      setLoading(false)
      setErreur("Erreur lors de l'enregistrement")
      return
    }

    // 2. Créer la réservation
    const { error: resaError } = await supabase.from('reservations').insert({
      creneau_id: creneauSelectionne.id,
      client_id: client.id,
      client_nom: nom,
      client_telephone: telephone,
      canal: 'web',
      statut: 'confirme',
    })

    if (resaError) {
      setLoading(false)
      setErreur('Erreur lors de la réservation, ce créneau est peut-être déjà pris')
      return
    }

    // 3. Marquer le créneau comme réservé
    await supabase
      .from('creneaux')
      .update({ statut: 'reserve' })
      .eq('id', creneauSelectionne.id)

    setLoading(false)
    setConfirmation(
      `Rendez-vous confirmé le ${format(new Date(creneauSelectionne.debut), "EEEE d MMMM 'à' HH:mm", { locale: fr })}`
    )
  }

  if (confirmation) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <p className="text-green-800 font-semibold">{confirmation}</p>
        <p className="text-sm text-green-700 mt-2">
          Vous recevrez un SMS de rappel avant votre rendez-vous.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Sélection du type de RDV */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Type de rendez-vous</label>
        <select
          value={typeSelectionne}
          onChange={(e) => {
            setTypeSelectionne(e.target.value)
            setCreneauSelectionne(null)
          }}
          className="border rounded px-3 py-2 w-full"
        >
          {typesRdv.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nom} ({t.duree_minutes} min)
            </option>
          ))}
        </select>
      </div>

      {/* Liste des créneaux groupés par jour */}
      <div className="mb-6 max-h-80 overflow-y-auto space-y-4">
        {Object.entries(creneauxParJour).map(([jour, creneauxJour]) => (
          <div key={jour}>
            <h3 className="font-medium text-sm text-gray-700 capitalize mb-2">{jour}</h3>
            <div className="flex flex-wrap gap-2">
              {creneauxJour.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCreneauSelectionne(c)}
                  className={`px-3 py-1.5 rounded border text-sm ${
                    creneauSelectionne?.id === c.id
                      ? 'bg-black text-white border-black'
                      : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  {format(new Date(c.debut), 'HH:mm')}
                </button>
              ))}
            </div>
          </div>
        ))}

        {creneauxFiltres.length === 0 && (
          <p className="text-gray-500 text-sm">
            Aucun créneau disponible pour ce type de RDV.
          </p>
        )}
      </div>

      {/* Formulaire de résa, affiché seulement si un créneau est choisi */}
      {creneauSelectionne && (
        <div className="border rounded-lg p-4 bg-gray-50">
          <p className="text-sm font-medium mb-3">
            Créneau choisi :{' '}
            {format(new Date(creneauSelectionne.debut), "EEEE d MMMM 'à' HH:mm", {
              locale: fr,
            })}
          </p>

          <div className="space-y-3">
            <input
              type="text"
              placeholder="Votre nom"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
            <input
              type="tel"
              placeholder="Votre téléphone"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />

            {erreur && <p className="text-red-600 text-sm">{erreur}</p>}

            <button
              onClick={reserver}
              disabled={loading}
              className="w-full bg-black text-white py-2 rounded disabled:opacity-50"
            >
              {loading ? 'Réservation...' : 'Confirmer le rendez-vous'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
