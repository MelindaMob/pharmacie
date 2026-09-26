'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import MedicamentAutocomplete, { type Medicament } from './MedicamentAutocomplete'

type Statut = 'manquant' | 'disponible' | 'delivre'

type Manquant = {
  id: string
  patient_nom: string
  patient_telephone: string
  disponible: boolean
  delivre: boolean
  medicament: Medicament | null
}

function statutDe(m: Manquant): Statut {
  if (m.delivre) return 'delivre'
  if (m.disponible) return 'disponible'
  return 'manquant'
}

const STATUTS: { key: Statut; label: string }[] = [
  { key: 'manquant', label: 'Manquant' },
  { key: 'disponible', label: 'Disponible' },
  { key: 'delivre', label: 'Délivré' },
]

export default function ManquantsForm({
  pharmacieId,
  manquants,
}: {
  pharmacieId: string
  manquants: Manquant[]
}) {
  const [patientNom, setPatientNom] = useState('')
  const [patientTelephone, setPatientTelephone] = useState('')
  const [medicament, setMedicament] = useState<Medicament | null>(null)
  const [autocompleteKey, setAutocompleteKey] = useState(0)
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState('')
  const [message, setMessage] = useState('')
  const [enCours, setEnCours] = useState<string | null>(null)
  const router = useRouter()

  const ajouter = async () => {
    if (!patientNom.trim() || !patientTelephone.trim() || !medicament) {
      setErreur('Renseignez le nom, le téléphone du patient et le produit')
      return
    }

    setLoading(true)
    setErreur('')
    setMessage('')

    const res = await fetch('/api/pharmacie/manquants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pharmacieId,
        patientNom: patientNom.trim(),
        patientTelephone: patientTelephone.trim(),
        medicamentId: medicament.id,
      }),
    })
    const data = await res.json()

    setLoading(false)
    if (!res.ok) {
      setErreur(typeof data.error === 'string' ? data.error : "Erreur lors de l'ajout")
      return
    }

    setMessage('Fiche créée ✓')
    setPatientNom('')
    setPatientTelephone('')
    setMedicament(null)
    setAutocompleteKey((k) => k + 1)
    router.refresh()
  }

  const changerStatut = async (id: string, statut: Statut) => {
    setErreur('')
    setMessage('')
    setEnCours(id)

    const res = await fetch('/api/pharmacie/manquants', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, pharmacieId, statut }),
    })
    const data = await res.json()

    setEnCours(null)
    if (!res.ok) {
      setErreur(typeof data.error === 'string' ? data.error : 'Erreur lors de la mise à jour')
      return
    }

    setMessage(
      statut === 'delivre'
        ? 'Marqué délivré — la fiche sera retirée automatiquement au bout de 7 jours ✓'
        : statut === 'disponible'
          ? data.smsEnvoye
            ? 'Marqué disponible — SMS envoyé au patient ✓'
            : "Marqué disponible — mais le SMS n'a pas pu être envoyé (vérifiez le téléphone du patient)"
          : 'Remis en attente ✓'
    )
    router.refresh()
  }

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl p-4 mb-6">
      <h2 className="font-medium text-[var(--color-ink)] mb-4">Nouvelle fiche</h2>

      <div className="flex flex-col sm:flex-wrap sm:flex-row sm:items-end gap-3 mb-4">
        <div className="w-full sm:w-auto">
          <label className="ui-label">Nom du patient</label>
          <input
            type="text"
            value={patientNom}
            onChange={(e) => setPatientNom(e.target.value)}
            className="ui-input"
          />
        </div>

        <div className="w-full sm:w-auto">
          <label className="ui-label">Téléphone</label>
          <input
            type="tel"
            value={patientTelephone}
            onChange={(e) => setPatientTelephone(e.target.value)}
            className="ui-input"
          />
        </div>

        <div className="w-full sm:w-64">
          <label className="ui-label">Produit concerné</label>
          <MedicamentAutocomplete key={autocompleteKey} onSelect={setMedicament} />
        </div>

        <button
          type="button"
          onClick={ajouter}
          disabled={loading || !medicament}
          className="ui-btn-primary w-full sm:w-auto"
        >
          {loading ? 'Ajout…' : 'Ajouter'}
        </button>
      </div>

      {erreur && <p className="text-red-600 text-sm mb-3">{erreur}</p>}
      {message && <p className="text-sm text-[var(--color-accent)] mb-3">{message}</p>}

      <div className="space-y-1">
        {manquants.length === 0 && (
          <p className="text-sm text-[var(--color-ink-soft)]">Aucune fiche pour le moment.</p>
        )}
        {manquants.map((m) => {
          const statutActuel = statutDe(m)
          return (
            <div
              key={m.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--color-line)] last:border-0"
            >
              <div className="text-sm text-[var(--color-ink)] min-w-0">
                <span className="font-medium">{m.patient_nom}</span>
                <span className="text-[var(--color-ink-soft)]"> · {m.patient_telephone} · </span>
                <span>{m.medicament?.denomination ?? 'Médicament supprimé du catalogue'}</span>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {STATUTS.map(({ key, label }) => {
                  const actif = statutActuel === key
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => changerStatut(m.id, key)}
                      disabled={enCours === m.id || actif}
                      className="px-2.5 py-1 rounded text-xs font-medium border transition-colors disabled:cursor-default"
                      style={
                        actif
                          ? {
                              backgroundColor: 'var(--color-accent)',
                              borderColor: 'var(--color-accent)',
                              color: 'white',
                            }
                          : {
                              backgroundColor: 'transparent',
                              borderColor: 'var(--color-line)',
                              color: 'var(--color-ink-soft)',
                            }
                      }
                    >
                      {enCours === m.id ? '…' : label}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
