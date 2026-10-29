'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const OPTIONS = [
  { heures: 24, label: '24 heures' },
  { heures: 48, label: '48 heures' },
  { heures: 72, label: '3 jours' },
  { heures: 168, label: '7 jours' },
]

export default function RetentionGarde({ valeur }: { valeur: number }) {
  const [heures, setHeures] = useState(valeur)
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState('')
  const router = useRouter()

  const changer = async (nouvelle: number) => {
    const ancienne = heures
    setHeures(nouvelle)
    setEnCours(true)
    setErreur('')
    const res = await fetch('/api/pharmacie/garde-retention', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ heures: nouvelle }),
    })
    setEnCours(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setHeures(ancienne)
      setErreur(typeof data.error === 'string' ? data.error : 'Erreur')
      return
    }
    router.refresh()
  }

  return (
    <div className="mb-6">
      <label className="flex flex-wrap items-center gap-2 text-sm">
        Effacer automatiquement les appels après
        <select
          value={heures}
          disabled={enCours}
          onChange={(e) => void changer(Number(e.target.value))}
          className="ui-input !w-auto !py-1.5 !px-2 text-sm"
        >
          {OPTIONS.map((o) => (
            <option key={o.heures} value={o.heures}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      {erreur && <p className="text-red-600 text-sm mt-1">{erreur}</p>}
    </div>
  )
}
