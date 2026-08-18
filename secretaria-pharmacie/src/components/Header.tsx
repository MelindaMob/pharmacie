import Link from 'next/link'

export default function Header() {
  return (
    <header className="border-b bg-white">
      <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg">
          Secretar.IA Pharmacie
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          <Link href="/recherche" className="text-gray-600 hover:text-black">
            Trouver une pharmacie
          </Link>
          <Link href="/connexion" className="text-gray-600 hover:text-black">
            Connexion
          </Link>
          <Link
            href="/inscription"
            className="bg-black text-white px-3 py-1.5 rounded hover:bg-gray-800"
          >
            S&apos;inscrire
          </Link>
        </nav>
      </div>
    </header>
  )
}
