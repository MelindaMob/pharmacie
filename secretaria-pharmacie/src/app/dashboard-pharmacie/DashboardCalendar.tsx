'use client'

import { Calendar, dateFnsLocalizer } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { fr } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'

const locales = { fr }
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})

type Creneau = {
  id: string
  debut: string
  fin: string
  statut: string
  types_rdv: { nom: string } | null
  reservations: {
    client_nom: string
    client_telephone: string
    statut: string
  }[]
}

type CalendarEvent = {
  id: string
  title: string
  start: Date
  end: Date
  resource: {
    statut: string
    reservation:
      | {
          client_nom: string
          client_telephone: string
          statut: string
        }
      | undefined
  }
}

export default function DashboardCalendar({ creneaux }: { creneaux: Creneau[] }) {
  const events: CalendarEvent[] = creneaux.map((c) => {
    const reservation = c.reservations?.[0]
    const estReserve = c.statut === 'reserve'

    return {
      id: c.id,
      title: estReserve
        ? `${c.types_rdv?.nom ?? 'RDV'} — ${reservation?.client_nom ?? ''}`
        : c.statut === 'bloque'
          ? 'Bloqué'
          : 'Disponible',
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
      },
    }
  }

  return (
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
      />
    </div>
  )
}
