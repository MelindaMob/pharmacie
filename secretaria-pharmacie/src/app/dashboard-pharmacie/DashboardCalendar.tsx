'use client'

import { useMemo, useState } from 'react'
import { Calendar, dateFnsLocalizer } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { fr } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import DetailReservation from './DetailReservation'

const locales = { fr }
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})

type ReservationInfo = {
  id: string
  client_nom: string
  client_telephone: string
  statut: string
}

type Creneau = {
  id: string
  debut: string
  fin: string
  statut: string
  type_rdv_id: string
  types_rdv: { nom: string } | null
  reservations: ReservationInfo[]
}

type CalendarEvent = {
  id: string
  title: string
  start: Date
  end: Date
  resource: {
    statut: string
    reservation: ReservationInfo | undefined
  }
}

export default function DashboardCalendar({ creneaux }: { creneaux: Creneau[] }) {
  const [filtreType, setFiltreType] = useState<string>('tous')
  const [reservationOuverte, setReservationOuverte] = useState<{
    id: string
    clientNom: string
  } | null>(null)

  const typesDisponibles = useMemo(() => {
    const map = new Map<string, string>()
    creneaux.forEach((c) => {
      if (c.type_rdv_id && c.types_rdv?.nom) {
        map.set(c.type_rdv_id, c.types_rdv.nom)
      }
    })
    return Array.from(map.entries())
  }, [creneaux])

  const creneauxFiltres = useMemo(() => {
    if (filtreType === 'tous') return creneaux
    if (filtreType === 'reserves') return creneaux.filter((c) => c.statut === 'reserve')
    return creneaux.filter((c) => c.type_rdv_id === filtreType)
  }, [creneaux, filtreType])

  const events: CalendarEvent[] = creneauxFiltres.map((c) => {
    const reservation = c.reservations?.[0]
    const estReserve = c.statut === 'reserve'

    return {
      id: c.id,
      title: estReserve
        ? `${c.types_rdv?.nom ?? 'RDV'} — ${reservation?.client_nom ?? ''}`
        : c.statut === 'bloque'
          ? 'Bloqué'
          : (c.types_rdv?.nom ?? 'Disponible'),
      start: new Date(c.debut),
      end: new Date(c.fin),
      resource: { statut: c.statut, reservation },
    }
  })

  const eventStyleGetter = (event: CalendarEvent) => {
    const colors: Record<string, string> = {
      disponible: '#22c55e',
      reserve: '#ef4444',
      bloque: '#9ca3af',
    }
    return {
      style: {
        backgroundColor: colors[event.resource.statut] ?? '#22c55e',
        borderRadius: '4px',
        color: 'white',
        border: 'none',
        fontSize: '11px',
      },
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <label className="text-sm font-medium">Afficher :</label>
        <select
          value={filtreType}
          onChange={(e) => setFiltreType(e.target.value)}
          className="border rounded px-2 py-1 text-sm"
        >
          <option value="tous">Tous les créneaux</option>
          <option value="reserves">Réservés uniquement</option>
          {typesDisponibles.map(([id, nom]) => (
            <option key={id} value={id}>
              {nom}
            </option>
          ))}
        </select>
      </div>

      <div style={{ height: 700 }}>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          eventPropGetter={eventStyleGetter}
          views={['week', 'day', 'month']}
          defaultView="week"
          culture="fr"
          onSelectEvent={(event: CalendarEvent) => {
            if (event.resource.statut === 'reserve' && event.resource.reservation?.id) {
              setReservationOuverte({
                id: event.resource.reservation.id,
                clientNom: event.resource.reservation.client_nom,
              })
            }
          }}
        />
      </div>

      {reservationOuverte && (
        <DetailReservation
          reservationId={reservationOuverte.id}
          clientNom={reservationOuverte.clientNom}
          onClose={() => setReservationOuverte(null)}
        />
      )}
    </div>
  )
}
