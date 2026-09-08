'use client'

import { useRef, useState } from 'react'

export type Medicament = {
  id: string
  denomination: string
  forme_pharmaceutique: string | null
}

export default function MedicamentAutocomplete({
  onSelect,
}: {
  onSelect: (medicament: Medicament) => void
}) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Medicament[]>([])
  const [ouvert, setOuvert] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const chercher = (valeur: string) => {
    setQuery(valeur)

    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (valeur.trim().length < 2) {
      setSuggestions([])
      setOuvert(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/medicaments/rechercher?q=${encodeURIComponent(valeur)}`)
        const data = await res.json()
        const resultats: Medicament[] = data.resultats ?? []
        setSuggestions(resultats)
        setOuvert(resultats.length > 0)
      } catch {
        setSuggestions([])
        setOuvert(false)
      }
    }, 250)
  }

  const selectionner = (medicament: Medicament) => {
    setQuery(medicament.denomination)
    setSuggestions([])
    setOuvert(false)
    onSelect(medicament)
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => chercher(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOuvert(true)}
        onBlur={() => setTimeout(() => setOuvert(false), 150)}
        placeholder="Rechercher un médicament…"
        className="ui-input"
        autoComplete="off"
      />
      {ouvert && (
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
        </ul>
      )}
    </div>
  )
}
