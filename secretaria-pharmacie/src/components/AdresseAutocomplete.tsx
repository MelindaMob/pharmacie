'use client'

import { useEffect, useRef, useState } from 'react'

type Suggestion = {
  label: string
  lat: number
  lng: number
}

type Props = {
  onSelect: (suggestion: Suggestion) => void
  valeurInitiale?: string
}

export default function AdresseAutocomplete({ onSelect, valeurInitiale }: Props) {
  const [query, setQuery] = useState(valeurInitiale ?? '')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [ouvert, setOuvert] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setQuery(valeurInitiale ?? '')
  }, [valeurInitiale])

  const chercher = (valeur: string) => {
    setQuery(valeur)

    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (valeur.trim().length < 3) {
      setSuggestions([])
      setOuvert(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(valeur)}&limit=5`
        )
        const json = await res.json()
        const items: Suggestion[] = (json.features ?? []).map(
          (f: {
            properties: { label: string }
            geometry: { coordinates: [number, number] }
          }) => ({
            label: f.properties.label,
            lng: f.geometry.coordinates[0],
            lat: f.geometry.coordinates[1],
          })
        )
        setSuggestions(items)
        setOuvert(items.length > 0)
      } catch {
        setSuggestions([])
        setOuvert(false)
      }
    }, 300)
  }

  const selectionner = (suggestion: Suggestion) => {
    setQuery(suggestion.label)
    setSuggestions([])
    setOuvert(false)
    onSelect(suggestion)
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => chercher(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOuvert(true)}
        onBlur={() => setTimeout(() => setOuvert(false), 150)}
        placeholder="Adresse, ville…"
        className="w-full border rounded px-3 py-2"
        autoComplete="off"
      />
      {ouvert && (
        <ul className="absolute z-10 mt-1 w-full rounded border bg-white shadow-sm">
          {suggestions.map((s) => (
            <li key={`${s.label}-${s.lat}-${s.lng}`}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectionner(s)}
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
