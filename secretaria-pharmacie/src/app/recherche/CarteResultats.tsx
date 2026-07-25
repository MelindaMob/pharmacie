'use client'

import { useEffect, useRef } from 'react'
import { Map, Marker, NavigationControl, Popup } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

type Resultat = {
  pharmacie_id: string
  nom: string
  adresse: string
  lat: number
  lng: number
  distance_km: number
}

export default function CarteResultats({
  resultats,
  centre,
}: {
  resultats: Resultat[]
  centre: { lat: number; lng: number } | null
}) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Map | null>(null)
  const markersRef = useRef<Marker[]>([])

  // Initialiser la carte une seule fois
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return

    const map = new Map({
      container: mapContainer.current,
      style: 'https://tiles.openfreemap.org/styles/positron',
      center: centre ? [centre.lng, centre.lat] : [2.3522, 48.8566],
      zoom: 13,
    })

    map.addControl(new NavigationControl(), 'top-right')

    map.on('load', () => {
      map.resize()
    })

    // Recalculer la taille si le conteneur change (layout grille)
    const ro = new ResizeObserver(() => {
      map.resize()
    })
    ro.observe(mapContainer.current)

    mapRef.current = map

    return () => {
      ro.disconnect()
      markersRef.current.forEach((m) => m.remove())
      markersRef.current = []
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Recentrer quand la position de recherche change
  useEffect(() => {
    if (mapRef.current && centre) {
      mapRef.current.flyTo({ center: [centre.lng, centre.lat], zoom: 13 })
    }
  }, [centre])

  // Mettre à jour les marqueurs quand les résultats changent
  useEffect(() => {
    if (!mapRef.current) return

    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    resultats.forEach((r) => {
      if (r.lat == null || r.lng == null) return

      const popup = new Popup({ offset: 25 }).setHTML(`
        <div style="font-family: sans-serif;">
          <strong>${r.nom}</strong><br/>
          <span style="font-size: 12px; color: #666;">${r.adresse}</span><br/>
          <span style="font-size: 12px; color: #16a34a;">${r.distance_km} km</span><br/>
          <a href="/pharmacie/${r.pharmacie_id}" style="font-size: 13px; color: #000; text-decoration: underline;">Voir les créneaux</a>
        </div>
      `)

      const marker = new Marker({ color: '#16a34a' })
        .setLngLat([r.lng, r.lat])
        .setPopup(popup)
        .addTo(mapRef.current!)

      markersRef.current.push(marker)
    })
  }, [resultats])

  return <div ref={mapContainer} className="w-full h-full min-h-[300px] rounded-lg" />
}
