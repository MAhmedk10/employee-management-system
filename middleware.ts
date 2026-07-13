import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isAdminRoute = pathname.startsWith('/admin')
  const isEmployeeRoute = pathname.startsWith('/employee')

  // Not logged in, trying to reach any protected area — send to login
  if ((isAdminRoute || isEmployeeRoute) && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Logged in and hitting an admin route — verify they're ACTUALLY an admin,
  // not just authenticated. This is the check that was missing.
  if (isAdminRoute && user) {
    const { data: employee } = await supabase
      .from('employees')
      .select('system_role, status')
      .eq('auth_user_id', user.id)
      .single()

    if (!employee || employee.status !== 'active') {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    if (employee.system_role !== 'admin') {
      // Valid, active employee — just not an admin. Send them to their own portal.
      return NextResponse.redirect(new URL('/employee/dashboard', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
