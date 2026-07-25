import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
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

  const isPharmacieRoute = request.nextUrl.pathname.startsWith('/dashboard-pharmacie')
  const isClientRoute = request.nextUrl.pathname.startsWith('/dashboard-client')
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin')

  if ((isPharmacieRoute || isClientRoute || isAdminRoute) && !user) {
    return NextResponse.redirect(new URL('/connexion', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/dashboard-pharmacie/:path*',
    '/dashboard-client/:path*',
    '/admin/:path*',
  ],
}
