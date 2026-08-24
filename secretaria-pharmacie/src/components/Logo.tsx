import Link from 'next/link'

export default function Logo({
  className = 'h-8 w-auto',
  href = '/',
}: {
  className?: string
  href?: string | null
  /** Conservé pour compatibilité des appels existants */
  priority?: boolean
}) {
  const image = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo-secretar-ia.png"
      alt="Secretar.IA"
      width={1024}
      height={228}
      className={className}
      style={{ width: 'auto' }}
      decoding="async"
    />
  )

  if (href === null) return image

  return (
    <Link href={href} className="inline-flex items-center shrink-0" aria-label="Secretar.IA">
      {image}
    </Link>
  )
}
