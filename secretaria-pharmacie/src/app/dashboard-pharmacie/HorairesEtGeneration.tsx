'use client'

import { useRef, useState } from 'react'
import HorairesForm from './HorairesForm'
import GenererCreneauxButton from './GenererCreneauxButton'

type Horaires = Record<string, { debut: string; fin: string } | null>

/**
 * Horaires + génération : les deux boutons restent grisés
 * tant qu’aucune modification d’horaire n’a été faite.
 * « Enregistrer » et « Générer » enregistrent puis régénèrent les créneaux.
 */
export default function HorairesEtGeneration({
  pharmacieId,
  horairesInitiaux,
}: {
  pharmacieId: string
  horairesInitiaux: Horaires
}) {
  const [horairesDirty, setHorairesDirty] = useState(false)
  const enregistrerRef = useRef<(() => Promise<void>) | null>(null)

  return (
    <>
      <HorairesForm
        pharmacieId={pharmacieId}
        horairesInitiaux={horairesInitiaux}
        onDirtyChange={setHorairesDirty}
        enregistrerRef={enregistrerRef}
      />
      <GenererCreneauxButton
        pharmacieId={pharmacieId}
        disabled={!horairesDirty}
        onAvantGenerer={async () => {
          if (!enregistrerRef.current) {
            throw new Error('Enregistrement indisponible')
          }
          await enregistrerRef.current()
        }}
      />
    </>
  )
}
