import Logo from '@/components/Logo'

const JOURS_ORDRE = [
  ['lundi', 'Lun'],
  ['mardi', 'Mar'],
  ['mercredi', 'Mer'],
  ['jeudi', 'Jeu'],
  ['vendredi', 'Ven'],
  ['samedi', 'Sam'],
  ['dimanche', 'Dim'],
] as const

type Plage = { debut: string; fin: string }

/** Nouveau format : tableau de plages ; ancien : un seul {debut, fin}. */
function versPlages(valeur: unknown): Plage[] {
  if (!valeur) return []
  if (Array.isArray(valeur)) {
    return valeur.filter(
      (p): p is Plage =>
        !!p && typeof p === 'object' && typeof p.debut === 'string' && typeof p.fin === 'string'
    )
  }
  if (typeof valeur === 'object' && valeur !== null && 'debut' in valeur && 'fin' in valeur) {
    const p = valeur as Plage
    if (typeof p.debut === 'string' && typeof p.fin === 'string') return [p]
  }
  return []
}

function libellePlage(p: Plage) {
  return `${p.debut.slice(0, 5)} – ${p.fin.slice(0, 5)}`
}

export default function PharmacyTicketCard({
  nom,
  adresse,
  telephone,
  horaires,
}: {
  nom: string
  adresse: string
  telephone: string
  horaires: Record<string, unknown> | null
}) {
  return (
    <div className="ticket-perforation bg-[var(--color-surface)] rounded-t-xl border border-[var(--color-line)] p-6 pb-8">
      <div className="mb-4">
        <Logo className="h-7 w-auto" href={null} />
      </div>

      <h1 className="font-[family-name:var(--font-display)] text-2xl text-[var(--color-ink)] mb-2">
        {nom}
      </h1>

      <p className="font-[family-name:var(--font-mono)] text-sm text-[var(--color-ink-soft)] leading-relaxed">
        {adresse}
        <br />
        {telephone}
      </p>

      {horaires && Object.keys(horaires).length > 0 && (
        <div className="mt-5 pt-4 border-t border-dashed border-[var(--color-line)]">
          <p className="text-xs uppercase tracking-wide text-[var(--color-ink-soft)] mb-2">
            Horaires
          </p>
          <div className="space-y-1 font-[family-name:var(--font-mono)] text-sm">
            {JOURS_ORDRE.map(([key, label]) => {
              const plages = versPlages(horaires[key])
              const ouvert = plages.length > 0
              return (
                <div key={key} className="flex justify-between gap-3">
                  <span className="text-[var(--color-ink-soft)]">{label}</span>
                  <span
                    className={`text-right ${ouvert ? 'text-[var(--color-ink)]' : 'text-[var(--color-line)]'}`}
                  >
                    {ouvert ? plages.map(libellePlage).join(' · ') : 'Fermé'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
