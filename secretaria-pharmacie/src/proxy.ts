import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isPharmacieRoute = pathname.startsWith('/dashboard-pharmacie')
  const isClientRoute = pathname.startsWith('/dashboard-client')
  const isAdminRoute = pathname.startsWith('/admin')

  if ((isPharmacieRoute || isClientRoute || isAdminRoute) && !user) {
    return NextResponse.redirect(new URL('/connexion', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/dashboard-pharmacie',
    '/dashboard-pharmacie/:path*',
    '/dashboard-client',
    '/dashboard-client/:path*',
    '/admin',
    '/admin/:path*',
  ],
}
