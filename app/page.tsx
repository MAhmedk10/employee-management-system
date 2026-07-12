import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// ── Root entry point ──────────────────────────────────────────
// Server component that routes users based on their session.
//  • Not authenticated       → /login
//  • Authenticated + admin    → /admin/dashboard
//  • Authenticated + employee → /employee/dashboard
export default async function RootPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: employee } = await supabase
    .from('employees')
    .select('system_role, status')
    .eq('auth_user_id', user.id)
    .single()

  if (!employee || employee.status !== 'active') {
    redirect('/login')
  }

  if (employee.system_role === 'admin') {
    redirect('/admin/dashboard')
  }

  redirect('/employee/dashboard')
}
