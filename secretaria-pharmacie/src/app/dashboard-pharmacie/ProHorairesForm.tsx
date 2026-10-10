'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

export type PlageHebdo = { id: string; jour: string; debut: string; fin: string }
type Plage = { debut: string; fin: string }
type Grille = Record<string, Plage[]>

const JOURS = [
  { key: 'lundi', label: 'Lundi' },
  { key: 'mardi', label: 'Mardi' },
  { key: 'mercredi', label: 'Mercredi' },
  { key: 'jeudi', label: 'Jeudi' },
  { key: 'vendredi', label: 'Vendredi' },
  { key: 'samedi', label: 'Samedi' },
  { key: 'dimanche', label: 'Dimanche' },
]

const PLAGE_DEFAUT: Plage = { debut: '09:00', fin: '12:30' }

function versGrille(plages: PlageHebdo[]): Grille {
  const g: Grille = {}
  for (const { key } of JOURS) g[key] = []
  for (const p of plages) {
    if (!g[p.jour]) g[p.jour] = []
    g[p.jour].push({ debut: p.debut.slice(0, 5), fin: p.fin.slice(0, 5) })
  }
  return g
}

export default function ProHorairesForm({
  professionnelId,
  initiales,
}: {
  professionnelId: string
  initiales: PlageHebdo[]
}) {
  const [grille, setGrille] = useState<Grille>(() => versGrille(initiales))
  const [sauvegardee, setSauvegardee] = useState<Grille>(() => versGrille(initiales))
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [erreur, setErreur] = useState('')
  const router = useRouter()

  const dirty = useMemo(() => JSON.stringify(grille) !== JSON.stringify(sauvegardee), [grille, sauvegardee])
  const aucuneRestriction = JOURS.every(({ key }) => (grille[key] ?? []).length === 0)

  const toggleJour = (jour: string) =>
    setGrille((prev) => ({ ...prev, [jour]: prev[jour].length > 0 ? [] : [{ ...PLAGE_DEFAUT }] }))

  const ajouterPlage = (jour: string) =>
    setGrille((prev) => {
      const plages = prev[jour] ?? []
      const derniere = plages[plages.length - 1]
      const suggestion =
        derniere && derniere.fin <= '17:00' ? { debut: '14:00', fin: '19:00' } : { ...PLAGE_DEFAUT }
      return { ...prev, [jour]: [...plages, suggestion] }
    })

  const retirerPlage = (jour: string, index: number) =>
    setGrille((prev) => ({ ...prev, [jour]: prev[jour].filter((_, i) => i !== index) }))

  const majPlage = (jour: string, index: number, champ: 'debut' | 'fin', valeur: string) =>
    setGrille((prev) => {
      const plages = [...prev[jour]]
      plages[index] = { ...plages[index], [champ]: valeur }
      return { ...prev, [jour]: plages }
    })

  const copierSurTousLesJours = (source: string) => {
    const plages = grille[source]
    if (!plages || plages.length === 0) return
    setGrille((prev) => {
      const next = { ...prev }
      for (const { key } of JOURS) if (key !== source) next[key] = plages.map((p) => ({ ...p }))
      return next
    })
  }

  const enregistrer = async () => {
    if (!dirty || saving) return
    setSaving(true)
    setErreur('')
    setMessage('')
    const fenetres = JOURS.flatMap(({ key }) => grille[key].map((p) => ({ jour: key, ...p })))
    const res = await fetch('/api/pharmacie/professionnels-horaires', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ professionnelId, fenetres }),
    })
    const data = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) {
      setErreur(typeof data.error === 'string' ? data.error : "Erreur lors de l'enregistrement")
      return
    }
    const finale = versGrille(data.fenetres ?? [])
    setGrille(finale)
    setSauvegardee(finale)
    setMessage(`Horaires enregistrés — ${data.creneauxCount} créneaux mis à jour ✓`)
    router.refresh()
  }

  return (
    <div className="mt-2 mb-2 pl-4 border-l-2 border-gray-200">
      <p className="text-xs font-medium text-gray-600 mb-2">
        Jours et horaires de présence.{' '}
        {aucuneRestriction
          ? "Rien de coché : cette personne suit les horaires d'ouverture de la pharmacie."
          : 'Elle ne reçoit que sur ces plages.'}
      </p>
      <div className="space-y-1">
        {JOURS.map(({ key, label }) => {
          const plages = grille[key] ?? []
          const actif = plages.length > 0
          return (
            <div key={key} className="flex flex-col sm:flex-row sm:items-start gap-1.5 py-1.5 border-b border-gray-100 last:border-0">
              <label className="flex items-center gap-2 sm:w-24 shrink-0 text-xs">
                <input type="checkbox" checked={actif} onChange={() => toggleJour(key)} />
                {label}
              </label>
              {!actif && <span className="pl-6 sm:pl-0 text-[11px] text-gray-400">Absent(e)</span>}
              {actif && (
                <div className="flex flex-col gap-1.5 pl-6 sm:pl-0">
                  {plages.map((plage, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <input type="time" value={plage.debut} onChange={(e) => majPlage(key, i, 'debut', e.target.value)} className="border rounded px-2 py-1 text-xs" />
                      <span className="text-xs text-gray-400">à</span>
                      <input type="time" value={plage.fin} onChange={(e) => majPlage(key, i, 'fin', e.target.value)} className="border rounded px-2 py-1 text-xs" />
                      <button type="button" onClick={() => retirerPlage(key, i)} className="text-xs text-red-600 px-1" aria-label="Retirer cette plage">✕</button>
                    </div>
                  ))}
                  <div className="flex gap-3">
                    <button type="button" onClick={() => ajouterPlage(key)} className="text-[11px] underline text-gray-500">+ Ajouter une plage</button>
                    <button type="button" onClick={() => copierSurTousLesJours(key)} className="text-[11px] underline text-gray-500">Copier sur tous les jours</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div className="flex items-center gap-3 mt-3">
        <button type="button" onClick={enregistrer} disabled={!dirty || saving} className="ui-btn-primary !py-1.5 text-sm">
          {saving ? 'Enregistrement…' : 'Enregistrer les horaires'}
        </button>
        {message && <span className="text-xs text-green-700">{message}</span>}
        {erreur && <span className="text-xs text-red-600">{erreur}</span>}
      </div>
    </div>
  )
}
