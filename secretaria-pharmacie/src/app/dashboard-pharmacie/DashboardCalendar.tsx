'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, dateFnsLocalizer, type View } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { fr } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import DetailReservation from './DetailReservation'
import AjouterRdvModal from './AjouterRdvModal'

const locales = { fr }
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: fr }),
  getDay,
  locales,
})

type ReservationInfo = {
  id: string
  client_nom: string
  client_telephone: string
  client_email: string | null
  statut: string
  canal?: string
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

type FiltreStatut = 'confirme' | 'annule' | 'no_show' | 'disponible'

type CalendarEvent = {
  id: string
  title: string
  start: Date
  end: Date
  resource: {
    estDispo: boolean
    reservation: ReservationInfo | undefined
    typeId: string
    typeNom: string
    debut: string
    options?: { creneauId: string; typeNom: string }[]
  }
}

const COULEURS_TYPES = ['#1B4B66', '#1F8A5F', '#B45309', '#6D4C9F', '#B33951', '#2E7BB5']

const COULEURS_STATUT: Record<FiltreStatut, string> = {
  confirme: '#1B4B66',
  annule: '#B33951',
  no_show: '#B45309',
  disponible: '#1F8A5F',
}

const OPTIONS_FILTRE: { key: FiltreStatut; label: string }[] = [
  { key: 'confirme', label: 'Confirmés' },
  { key: 'annule', label: 'Annulés' },
  { key: 'no_show', label: 'Absences' },
  { key: 'disponible', label: 'Disponibles' },
]

const MESSAGES_FR = {
  today: "Aujourd'hui",
  previous: 'Précédent',
  next: 'Suivant',
  month: 'Mois',
  week: 'Semaine',
  day: 'Jour',
  agenda: 'Agenda',
  date: 'Date',
  time: 'Heure',
  event: 'Événement',
  noEventsInRange: 'Aucun rendez-vous sur cette période.',
  showMore: (total: number) => `+ ${total} de plus`,
}

function CalendarToolbar({
  label,
  onNavigate,
  onView,
  view,
}: {
  label: string
  onNavigate: (action: 'PREV' | 'NEXT' | 'TODAY') => void
  onView: (view: View) => void
  view: View
}) {
  const vues: { key: View; label: string }[] = [
    { key: 'week', label: 'Semaine' },
    { key: 'day', label: 'Jour' },
    { key: 'agenda', label: 'Agenda' },
  ]

  return (
    <div className="rbc-toolbar-custom flex flex-wrap items-center justify-between gap-2 sm:gap-3 mb-3 px-1">
      <button
        type="button"
        onClick={() => onNavigate('TODAY')}
        className="ui-btn-ghost !py-1.5 text-sm"
      >
        Aujourd&apos;hui
      </button>

      <div className="flex items-center gap-2 order-first sm:order-none w-full sm:w-auto justify-center">
        <button
          type="button"
          onClick={() => onNavigate('PREV')}
          aria-label="Période précédente"
          className="w-9 h-9 flex items-center justify-center rounded-lg border border-[var(--color-line)] text-[var(--color-ink)] hover:bg-[var(--color-accent-soft)]"
        >
          ‹
        </button>
        <span className="text-sm font-medium text-[var(--color-ink)] min-w-[8rem] sm:min-w-[9rem] text-center capitalize">
          {label}
        </span>
        <button
          type="button"
          onClick={() => onNavigate('NEXT')}
          aria-label="Période suivante"
          className="w-9 h-9 flex items-center justify-center rounded-lg border border-[var(--color-line)] text-[var(--color-ink)] hover:bg-[var(--color-accent-soft)]"
        >
          ›
        </button>
      </div>

      <div className="flex gap-1 border border-[var(--color-line)] rounded-lg p-0.5 bg-[var(--color-surface)]">
        {vues.map((v) => (
          <button
            key={v.key}
            type="button"
            onClick={() => onView(v.key)}
            className={`text-xs px-2.5 sm:px-3 py-1.5 rounded-md transition-colors ${
              view === v.key
                ? 'bg-[var(--color-primary)] text-white'
                : 'text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function iconeCanal(canal?: string) {
  if (canal === 'vocal') return '📞'
  if (canal === 'manuel') return '✍️'
  return '💻'
}

function CalendarEventCard({
  event,
  filtre,
  couleurParType,
}: {
  event: CalendarEvent
  filtre: FiltreStatut
  couleurParType: Map<string, string>
}) {
  const couleur = event.resource.estDispo
    ? (couleurParType.get(event.resource.typeId) ?? COULEURS_STATUT.disponible)
    : COULEURS_STATUT[filtre]

  return (
    <div
      style={{
        borderLeft: `3px solid ${couleur}`,
        background: `${couleur}14`,
        height: '100%',
        padding: '3px 6px',
        borderRadius: '4px',
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      <p
        style={{
          fontSize: '11px',
          fontFamily: 'var(--font-mono)',
          color: couleur,
          lineHeight: 1.2,
        }}
      >
        {format(event.start, 'HH:mm')}
        {!event.resource.estDispo && (
          <span style={{ marginLeft: '4px' }}>{iconeCanal(event.resource.reservation?.canal)}</span>
        )}
      </p>
      {!event.resource.estDispo && (
        <p
          style={{
            fontSize: '12px',
            fontWeight: 500,
            color: 'var(--color-ink)',
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {event.title}
        </p>
      )}
    </div>
  )
}

function reservationPourFiltre(creneau: Creneau, filtre: FiltreStatut) {
  if (filtre === 'annule') {
    return creneau.reservations?.find((r) => r.statut === 'annule')
  }
  return creneau.reservations?.find((r) => r.statut === filtre)
}

export default function DashboardCalendar({
  creneaux,
  pharmacieId,
}: {
  creneaux: Creneau[]
  pharmacieId: string
}) {
  const router = useRouter()
  const [filtre, setFiltre] = useState<FiltreStatut>('confirme')
  const [view, setView] = useState<View>('week')
  const [date, setDate] = useState(() => new Date())
  const [reservationOuverte, setReservationOuverte] = useState<{
    id: string
    clientNom: string
    clientTelephone: string
    clientEmail?: string | null
    typeRdv: string
    typeRdvId: string
    dateHeure: string
    canal?: string
  } | null>(null)
  const [creationOuverte, setCreationOuverte] = useState<{
    creneauId: string
    typeNom: string
    dateHeure: string
    options?: { creneauId: string; typeNom: string }[]
  } | null>(null)
  const [ajoutLibreOuvert, setAjoutLibreOuvert] = useState(false)

  useEffect(() => {
    const isMobile = window.matchMedia('(max-width: 768px)').matches
    if (filtre === 'disponible' || isMobile) setView('day')
    else setView('week')
  }, [filtre])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const onChange = () => {
      if (mq.matches) setView('day')
      else if (filtre !== 'disponible') setView('week')
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [filtre])

  const typesDisponibles = useMemo(() => {
    const map = new Map<string, string>()
    creneaux.forEach((c) => {
      if (c.type_rdv_id && c.types_rdv?.nom) {
        map.set(c.type_rdv_id, c.types_rdv.nom)
      }
    })
    return Array.from(map.entries())
  }, [creneaux])

  const couleurParType = useMemo(() => {
    const map = new Map<string, string>()
    typesDisponibles.forEach(([id], i) => {
      map.set(id, COULEURS_TYPES[i % COULEURS_TYPES.length])
    })
    return map
  }, [typesDisponibles])

  const creneauxFiltres = useMemo(() => {
    if (filtre === 'disponible') {
      return creneaux.filter((c) => c.statut === 'disponible')
    }
    if (filtre === 'annule') {
      return creneaux.filter((c) => c.reservations?.some((r) => r.statut === 'annule'))
    }
    if (filtre === 'no_show') {
      return creneaux.filter(
        (c) => c.statut === 'reserve' && c.reservations?.some((r) => r.statut === 'no_show')
      )
    }
    // Confirmés : créneau réservé, même si la résa jointe est incomplète
    return creneaux.filter((c) => {
      if (c.statut !== 'reserve') return false
      const resas = c.reservations ?? []
      if (resas.length === 0) return true
      return resas.some((r) => r.statut === 'confirme')
    })
  }, [creneaux, filtre])

  const events: CalendarEvent[] = useMemo(() => {
    if (filtre === 'disponible') {
      const parHoraire = new Map<string, Creneau[]>()
      creneauxFiltres.forEach((c) => {
        const key = new Date(c.debut).toISOString()
        const liste = parHoraire.get(key) ?? []
        liste.push(c)
        parHoraire.set(key, liste)
      })

      return Array.from(parHoraire.entries()).map(([, liste]) => {
        const premier = liste[0]
        const finMs = Math.min(...liste.map((c) => new Date(c.fin).getTime()))
        const options = liste.map((c) => ({
          creneauId: c.id,
          typeNom: c.types_rdv?.nom ?? 'Disponible',
        }))
        return {
          id: premier.id,
          title: options.length > 1 ? `${options.length} motifs` : (options[0].typeNom),
          start: new Date(premier.debut),
          end: new Date(finMs - 1000),
          resource: {
            estDispo: true,
            reservation: undefined,
            typeId: premier.type_rdv_id,
            typeNom: options[0].typeNom,
            debut: premier.debut,
            options,
          },
        }
      })
    }

    return creneauxFiltres.map((c) => {
      const reservation = reservationPourFiltre(c, filtre)
      return {
        id: c.id,
        title: reservation?.client_nom ?? 'Réservé',
        start: new Date(c.debut),
        end: new Date(c.fin),
        resource: {
          estDispo: false,
          reservation,
          typeId: c.type_rdv_id,
          typeNom: c.types_rdv?.nom ?? '',
          debut: c.debut,
        },
      }
    })
  }, [creneauxFiltres, filtre])

  const calendarComponents = useMemo(
    () => ({
      event: ({ event }: { event: CalendarEvent }) => (
        <CalendarEventCard event={event} filtre={filtre} couleurParType={couleurParType} />
      ),
      toolbar: CalendarToolbar,
    }),
    [filtre, couleurParType]
  )

  const rafraichir = () => router.refresh()

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-3">
        <div className="flex gap-1 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl p-1 overflow-x-auto">
          {OPTIONS_FILTRE.map((o) => (
            <button
              key={o.key}
              type="button"
              onClick={() => setFiltre(o.key)}
              className={`text-xs px-3 py-2 rounded-lg whitespace-nowrap transition-colors ${
                filtre === o.key
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setAjoutLibreOuvert(true)}
          className="ui-btn-primary w-full sm:w-auto shrink-0"
        >
          + Ajouter un rendez-vous
        </button>
      </div>

      <div className="calendar-shell">
        <div className="min-w-[320px] h-[min(70vh,650px)] sm:h-[650px]">
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            components={calendarComponents}
            views={['week', 'day', 'agenda']}
            view={view}
            date={date}
            onView={setView}
            onNavigate={setDate}
            step={15}
            timeslots={2}
            culture="fr"
            messages={MESSAGES_FR}
            onSelectEvent={(event: CalendarEvent) => {
              if (event.resource.estDispo) {
                const options = event.resource.options ?? [
                  { creneauId: event.id, typeNom: event.resource.typeNom },
                ]
                setCreationOuverte({
                  creneauId: options[0].creneauId,
                  typeNom: options[0].typeNom,
                  dateHeure: format(new Date(event.resource.debut), "EEEE d MMMM 'à' HH:mm", {
                    locale: fr,
                  }),
                  options,
                })
              } else if (event.resource.reservation) {
                setReservationOuverte({
                  id: event.resource.reservation.id,
                  clientNom: event.resource.reservation.client_nom,
                  clientTelephone: event.resource.reservation.client_telephone,
                  clientEmail: event.resource.reservation.client_email,
                  typeRdv: event.resource.typeNom,
                  typeRdvId: event.resource.typeId,
                  dateHeure: format(new Date(event.resource.debut), "EEEE d MMMM 'à' HH:mm", {
                    locale: fr,
                  }),
                  canal: event.resource.reservation.canal,
                })
              }
            }}
          />
        </div>
      </div>

      {reservationOuverte && (
        <DetailReservation
          reservationId={reservationOuverte.id}
          clientNom={reservationOuverte.clientNom}
          clientTelephone={reservationOuverte.clientTelephone}
          clientEmail={reservationOuverte.clientEmail}
          typeRdv={reservationOuverte.typeRdv}
          typeRdvId={reservationOuverte.typeRdvId}
          pharmacieId={pharmacieId}
          dateHeure={reservationOuverte.dateHeure}
          canal={reservationOuverte.canal}
          onClose={() => setReservationOuverte(null)}
        />
      )}

      {creationOuverte && (
        <AjouterRdvModal
          pharmacieId={pharmacieId}
          preselection={creationOuverte}
          onClose={() => setCreationOuverte(null)}
          onCree={() => {
            setCreationOuverte(null)
            rafraichir()
          }}
        />
      )}

      {ajoutLibreOuvert && (
        <AjouterRdvModal
          pharmacieId={pharmacieId}
          onClose={() => setAjoutLibreOuvert(false)}
          onCree={() => {
            setAjoutLibreOuvert(false)
            rafraichir()
          }}
        />
      )}
    </div>
  )
}
