import { getUserRole } from '@/lib/auth/getRole'
import { redirect } from 'next/navigation'
import DashboardNav from '../DashboardNav'

export const dynamic = 'force-dynamic'

function Section({
  id,
  titre,
  children,
}: {
  id: string
  titre: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-20 mb-6 pb-6 border-b border-[var(--color-line)] last:border-0">
      <h2 className="font-medium text-[var(--color-ink)] mb-2">{titre}</h2>
      <div className="text-sm text-[var(--color-ink-soft)] space-y-2">{children}</div>
    </section>
  )
}

export default async function AidePage() {
  const role = await getUserRole()
  if (!role || role.role !== 'pharmacie') redirect('/connexion')

  return (
    <DashboardNav actif="aide">
      <div className="max-w-2xl">
        <h1 className="text-lg font-semibold text-[var(--color-ink)] mb-1">Aide</h1>
        <p className="text-sm text-[var(--color-ink-soft)] mb-6">
          Ce que fait chaque section du tableau de bord.
        </p>

        <Section id="horaires" titre="Horaires d'ouverture">
          <p>
            Cochez les jours ouverts. Vous pouvez déclarer jusqu&apos;à 2 plages par jour (par
            exemple une le matin et une l&apos;après-midi, pour une pause déjeuner). Un jour
            décoché affiche &laquo; Fermé &raquo; — Paul (l&apos;assistant vocal) ne proposera
            jamais de créneau ce jour-là.
          </p>
          <p>
            Tant que ces horaires ne sont pas enregistrés, le reste du tableau de bord
            (Calendrier, Messages, Manquants, Infos supplémentaires) reste grisé.
          </p>
        </Section>

        <Section id="exceptions" titre="Fermetures et horaires exceptionnels">
          <p>
            Pour un jour férié, une fermeture ponctuelle, ou des horaires différents sur une
            période donnée, sans toucher à vos horaires habituels. Les créneaux sont régénérés
            automatiquement dès l&apos;enregistrement.
          </p>
        </Section>

        <Section id="types-rdv" titre="Types de rendez-vous proposés">
          <p>
            Cochez les prestations que votre pharmacie propose. Vous pouvez ajuster la durée de
            chaque créneau, et le nombre de rendez-vous acceptés en même temps sur un même créneau
            (par exemple 3 vaccinations en parallèle, contre 1 seul dépistage). Décocher une
            prestation ne supprime rien : elle est simplement désactivée, et les créneaux déjà
            réservés restent visibles.
          </p>
        </Section>

        <Section id="delai-annulation" titre="Délai d'annulation minimum">
          <p>
            Nombre d&apos;heures avant le rendez-vous en dessous duquel le patient ne peut plus
            annuler en ligne ni par téléphone.
          </p>
        </Section>

        <Section id="manquants" titre="Produits manquants">
          <p>
            Une fiche par patient qui attend un produit précis. Si un autre patient attend le
            même produit, créez une deuxième fiche : chacune a son propre statut. Pour une
            information générale valable pour tout le monde (rupture ou réassort), utilisez plutôt
            Infos supplémentaires.
          </p>
          <p>
            Trois statuts, sur la même ligne : <strong>Manquant</strong> (en attente),{' '}
            <strong>Disponible</strong> (envoie un SMS au patient) et <strong>Délivré</strong>{' '}
            (le produit a été remis). Une fiche marquée Délivré est retirée automatiquement du
            tableau de bord au bout de 7 jours.
          </p>
        </Section>

        <Section id="infos-supplementaires" titre="Infos supplémentaires">
          <p>
            Tout ce que vous écrivez ici, Paul peut le dire aux patients qui appellent — chargé
            silencieusement au début de chaque appel, comme vos horaires. Vous pouvez fixer une
            date de début (l&apos;info n&apos;est lue par Paul qu&apos;à partir de ce jour-là)
            et/ou une date de fin (elle disparaît toute seule après), ou laisser les deux vides
            pour une info à supprimer vous-même le moment venu.
          </p>
        </Section>
      </div>
    </DashboardNav>
  )
}
