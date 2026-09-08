'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import MedicamentAutocomplete, { type Medicament } from './MedicamentAutocomplete'

type Manquant = {
  id: string
  quantite_manquante: number
  patient_nom: string
  patient_telephone: string
  patient_email: string | null
  medicament: Medicament | null
}

export default function ManquantsForm({
  pharmacieId,
  manquants,
}: {
  pharmacieId: string
  manquants: Manquant[]
}) {
  const [medicament, setMedicament] = useState<Medicament | null>(null)
  const [autocompleteKey, setAutocompleteKey] = useState(0)
  const [quantite, setQuantite] = useState(1)
  const [patientNom, setPatientNom] = useState('')
  const [patientTelephone, setPatientTelephone] = useState('')
  const [patientEmail, setPatientEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState('')
  const [message, setMessage] = useState('')
  const [enCours, setEnCours] = useState<string | null>(null)
  const router = useRouter()

  const ajouter = async () => {
    if (!medicament || !patientNom.trim() || !patientTelephone.trim()) {
      setErreur('Renseignez le médicament, le nom et le téléphone du patient')
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
        medicamentId: medicament.id,
        quantiteManquante: quantite,
        patientNom: patientNom.trim(),
        patientTelephone: patientTelephone.trim(),
        patientEmail: patientEmail.trim() || null,
      }),
    })
    const data = await res.json()

    setLoading(false)
    if (!res.ok) {
      setErreur(typeof data.error === 'string' ? data.error : "Erreur lors de l'ajout")
      return
    }

    setMessage('Fiche créée ✓')
    setMedicament(null)
    setAutocompleteKey((k) => k + 1)
    setQuantite(1)
    setPatientNom('')
    setPatientTelephone('')
    setPatientEmail('')
    router.refresh()
  }

  const marquerDisponible = async (id: string) => {
    setErreur('')
    setMessage('')
    setEnCours(id)

    const res = await fetch('/api/pharmacie/manquants', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, pharmacieId }),
    })
    const data = await res.json()

    setEnCours(null)
    if (!res.ok) {
      setErreur(typeof data.error === 'string' ? data.error : 'Erreur lors de la mise à jour')
      return
    }

    setMessage('Marqué disponible — SMS envoyé au patient ✓')
    router.refresh()
  }

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl p-4 mb-6">
      <h2 className="font-medium text-[var(--color-ink)] mb-1">Nouvelle fiche</h2>
      <p className="text-sm text-[var(--color-ink-soft)] mb-4">
        Un patient précis, un produit précis. Si un autre patient attend le même produit,
        créez une deuxième fiche : chacune a son propre statut.
      </p>

      <div className="flex flex-col sm:flex-wrap sm:flex-row sm:items-end gap-3 mb-4">
        <div className="w-full sm:w-64">
          <label className="ui-label">Médicament</label>
          <MedicamentAutocomplete key={autocompleteKey} onSelect={setMedicament} />
        </div>

        <div className="w-full sm:w-32">
          <label className="ui-label">Boîtes manquantes</label>
          <input
            type="number"
            min={1}
            value={quantite}
            onChange={(e) => setQuantite(parseInt(e.target.value) || 1)}
            className="ui-input"
          />
        </div>

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

        <div className="w-full sm:w-auto">
          <label className="ui-label">Email (optionnel)</label>
          <input
            type="email"
            value={patientEmail}
            onChange={(e) => setPatientEmail(e.target.value)}
            className="ui-input"
          />
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
          <p className="text-sm text-[var(--color-ink-soft)]">Aucune fiche en cours.</p>
        )}
        {manquants.map((m) => (
          <div
            key={m.id}
            className="flex items-center justify-between gap-3 py-2 border-b border-[var(--color-line)] last:border-0"
          >
            <div>
              <p className="text-sm font-medium text-[var(--color-ink)]">
                {m.patient_nom} — {m.medicament?.denomination ?? 'Médicament supprimé du catalogue'}
              </p>
              <p className="text-xs text-[var(--color-ink-soft)]">
                {m.patient_telephone}
                {m.patient_email ? ` · ${m.patient_email}` : ''} · {m.quantite_manquante} boîte
                {m.quantite_manquante > 1 ? 's' : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={() => marquerDisponible(m.id)}
              disabled={enCours === m.id}
              className="ui-btn-primary shrink-0"
            >
              {enCours === m.id ? '…' : 'Marquer disponible'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
