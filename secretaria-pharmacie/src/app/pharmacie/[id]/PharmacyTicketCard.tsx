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

export default function PharmacyTicketCard({
  nom,
  adresse,
  telephone,
  horaires,
}: {
  nom: string
  adresse: string
  telephone: string
  horaires: Record<string, { debut: string; fin: string } | null> | null
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
              const h = horaires[key]
              return (
                <div key={key} className="flex justify-between">
                  <span className="text-[var(--color-ink-soft)]">{label}</span>
                  <span className={h ? 'text-[var(--color-ink)]' : 'text-[var(--color-line)]'}>
                    {h ? `${h.debut} – ${h.fin}` : 'Fermé'}
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
