'use client'

import { useRef, useState } from 'react'

export type Medicament = {
  id: string
  denomination: string
  forme_pharmaceutique: string | null
}

export default function MedicamentAutocomplete({
  onSelect,
  onChangeTexte,
  onSelectLibre,
}: {
  onSelect: (medicament: Medicament) => void
  /** Appelé à chaque frappe : permet de garder le texte tapé comme produit libre (hors liste). */
  onChangeTexte?: (texte: string) => void
  /** Choix « Autre » : enregistre le texte tel quel, hors catalogue. */
  onSelectLibre?: (texte: string) => void
}) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Medicament[]>([])
  const [ouvert, setOuvert] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const chercher = (valeur: string) => {
    setQuery(valeur)
    onChangeTexte?.(valeur)

    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (valeur.trim().length < 2) {
      setSuggestions([])
      setOuvert(false)
      return
    }

    setOuvert(true)

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/medicaments/rechercher?q=${encodeURIComponent(valeur)}`)
        const data = await res.json()
        const resultats: Medicament[] = data.resultats ?? []
        setSuggestions(resultats)
        setOuvert(true)
      } catch {
        setSuggestions([])
        setOuvert(true)
      }
    }, 250)
  }

  const selectionner = (medicament: Medicament) => {
    setQuery(medicament.denomination)
    setSuggestions([])
    setOuvert(false)
    onSelect(medicament)
  }

  const choisirAutre = () => {
    const texte = query.trim()
    if (texte.length < 2) return
    setSuggestions([])
    setOuvert(false)
    onSelectLibre?.(texte)
  }

  const saisie = query.trim()
  const montrerListe = ouvert && saisie.length >= 2

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => chercher(e.target.value)}
        onFocus={() => saisie.length >= 2 && setOuvert(true)}
        onBlur={() => setTimeout(() => setOuvert(false), 150)}
        placeholder="Rechercher un produit…"
        className="ui-input"
        autoComplete="off"
      />
      {montrerListe && (
        <ul className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto rounded border border-[var(--color-line)] bg-[var(--color-surface)] shadow-sm">
          {suggestions.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--color-accent-soft)]"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectionner(m)}
              >
                {m.denomination}
                {m.forme_pharmaceutique && (
                  <span className="ml-1 text-xs text-[var(--color-ink-soft)]">
                    — {m.forme_pharmaceutique}
                  </span>
                )}
              </button>
            </li>
          ))}
          <li className={suggestions.length > 0 ? 'border-t border-[var(--color-line)]' : ''}>
            <button
              type="button"
              className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--color-accent-soft)]"
              onMouseDown={(e) => e.preventDefault()}
              onClick={choisirAutre}
            >
              <span className="font-medium">Autre</span>
              <span className="ml-1 text-xs text-[var(--color-ink-soft)]">
                — enregistrer « {saisie} » tel quel
              </span>
            </button>
          </li>
        </ul>
      )}
    </div>
  )
}
