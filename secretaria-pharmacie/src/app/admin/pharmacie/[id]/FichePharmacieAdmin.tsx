'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Logo from '@/components/Logo'
import AdresseAutocomplete from '@/components/AdresseAutocomplete'

type PharmacieAdmin = {
  id: string
  nom: string
  adresse: string
  telephone: string
  retell_phone_number: string | null
  email: string
  groupement_nom: string | null
  horaires_ouverture: Record<string, { debut: string; fin: string } | null> | null
  types_rdv: { id: string; nom: string; duree_minutes: number }[]
}

const JOURS = [
  ['lundi', 'Lundi'],
  ['mardi', 'Mardi'],
  ['mercredi', 'Mercredi'],
  ['jeudi', 'Jeudi'],
  ['vendredi', 'Vendredi'],
  ['samedi', 'Samedi'],
  ['dimanche', 'Dimanche'],
] as const

export default function FichePharmacieAdmin({ pharmacie }: { pharmacie: PharmacieAdmin }) {
  const router = useRouter()
  const [nom, setNom] = useState(pharmacie.nom)
  const [adresse, setAdresse] = useState(pharmacie.adresse ?? '')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [telephone, setTelephone] = useState(pharmacie.telephone ?? '')
  const [retellPhoneNumber, setRetellPhoneNumber] = useState(
    pharmacie.retell_phone_number ?? ''
  )
  const [email, setEmail] = useState(pharmacie.email ?? '')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    setNom(pharmacie.nom)
    setAdresse(pharmacie.adresse ?? '')
    setTelephone(pharmacie.telephone ?? '')
    setRetellPhoneNumber(pharmacie.retell_phone_number ?? '')
    setEmail(pharmacie.email ?? '')
    setCoords(null)
  }, [pharmacie])

  const enregistrer = async () => {
    setLoading(true)
    setErreur('')
    setMessage('')

    const res = await fetch('/api/admin/modifier-pharmacie', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pharmacieId: pharmacie.id,
        nom,
        adresse,
        telephone,
        retellPhoneNumber,
        email,
        ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
      }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok || data.error) {
      setErreur(data.error ?? 'Erreur lors de l’enregistrement')
      return
    }

    setMessage('Informations enregistrées')
    setCoords(null)
    router.refresh()
  }

  return (
    <div className="min-h-screen px-4 py-4 sm:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="sticky top-0 z-20 -mx-4 px-4 sm:mx-0 sm:px-0 py-3 mb-6 flex items-center justify-between gap-4 bg-[color-mix(in_srgb,var(--color-bg)_92%,transparent)] backdrop-blur-md">
          <Logo className="h-8 sm:h-9 w-auto" href="/admin" />
        </div>

        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] mb-4"
        >
          <span aria-hidden>←</span> Retour au dashboard admin
        </Link>

        <h1 className="font-[family-name:var(--font-display)] text-2xl text-[var(--color-ink)] mb-1">
          Fiche pharmacie
        </h1>
        <p className="text-sm text-[var(--color-ink-soft)] mb-6">
          Vue admin — pas de prise de rendez-vous.
          {pharmacie.groupement_nom ? ` · Groupement : ${pharmacie.groupement_nom}` : ''}
        </p>

        <div className="ui-panel p-4 sm:p-6 space-y-4 mb-6">
          <div>
            <label className="ui-label">Nom</label>
            <input
              type="text"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className="ui-input"
            />
          </div>

          <div>
            <label className="ui-label">Adresse</label>
            <AdresseAutocomplete
              valeurInitiale={adresse}
              onSelect={(s) => {
                setAdresse(s.label)
                setCoords({ lat: s.lat, lng: s.lng })
              }}
            />
            {adresse && (
              <p className="text-xs text-[var(--color-ink-soft)] mt-1.5">{adresse}</p>
            )}
          </div>

          <div>
            <label className="ui-label">Email de connexion</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="ui-input"
              placeholder="email@pharmacie.fr"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="ui-label">Téléphone pharmacie</label>
              <input
                type="tel"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                className="ui-input"
              />
            </div>
            <div>
              <label className="ui-label">Numéro vocal Paul (Telnyx/Retell)</label>
              <input
                type="tel"
                value={retellPhoneNumber}
                onChange={(e) => setRetellPhoneNumber(e.target.value)}
                className="ui-input"
                placeholder="Optionnel"
              />
            </div>
          </div>

          {erreur && <p className="text-red-600 text-sm">{erreur}</p>}
          {message && <p className="text-[var(--color-accent)] text-sm">{message}</p>}

          <button
            type="button"
            onClick={enregistrer}
            disabled={loading}
            className="ui-btn-primary w-full sm:w-auto"
          >
            {loading ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </button>
        </div>

        <div className="ui-panel p-4 sm:p-6 mb-6">
          <h2 className="font-medium text-[var(--color-ink)] mb-3">Horaires d&apos;ouverture</h2>
          {pharmacie.horaires_ouverture &&
          Object.keys(pharmacie.horaires_ouverture).length > 0 ? (
            <div className="space-y-1.5 font-[family-name:var(--font-mono)] text-sm">
              {JOURS.map(([key, label]) => {
                const h = pharmacie.horaires_ouverture?.[key]
                return (
                  <div key={key} className="flex justify-between gap-4">
                    <span className="text-[var(--color-ink-soft)]">{label}</span>
                    <span className={h ? 'text-[var(--color-ink)]' : 'text-[var(--color-line)]'}>
                      {h ? `${h.debut} – ${h.fin}` : 'Fermé'}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-[var(--color-ink-soft)]">Horaires non configurés.</p>
          )}
        </div>

        <div className="ui-panel p-4 sm:p-6">
          <h2 className="font-medium text-[var(--color-ink)] mb-3">Types de rendez-vous</h2>
          {pharmacie.types_rdv.length === 0 ? (
            <p className="text-sm text-[var(--color-ink-soft)]">Aucun type configuré.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {pharmacie.types_rdv.map((t) => (
                <li
                  key={t.id}
                  className="flex justify-between gap-3 border-b border-[var(--color-line)] last:border-0 pb-2 last:pb-0"
                >
                  <span className="text-[var(--color-ink)]">{t.nom}</span>
                  <span className="text-[var(--color-ink-soft)] font-[family-name:var(--font-mono)]">
                    {t.duree_minutes} min
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
