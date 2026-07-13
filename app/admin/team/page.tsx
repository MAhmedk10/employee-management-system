import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TeamClient from './TeamClient'

// ── Types ────────────────────────────────────────────────────
export type TeamEmployee = {
  id: string
  employee_code: string
  full_name: string
  father_name: string
  cnic: string
  salary: number
  role_title: string | null
  monthly_leave_balance: number
  status: 'active' | 'inactive'
  profile_photo_url: string | null
}

// ── Server Component ──────────────────────────────────────────
export default async function AdminTeamPage() {
  const supabase = await createClient()

  // 1. Verify authenticated session
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 2. Verify admin role via employees table
  const { data: employee } = await supabase
    .from('employees')
    .select('system_role, full_name, profile_photo_url, status')
    .eq('auth_user_id', user.id)
    .single()

  if (!employee || employee.status !== 'active' || employee.system_role !== 'admin') {
    redirect('/login')
  }

  // 3. Fetch all employees (admins can read all via RLS is_admin() policy)
  const { data: employees, error } = await supabase
    .from('employees')
    .select(
      'id, employee_code, full_name, father_name, cnic, salary, role_title, monthly_leave_balance, status, profile_photo_url'
    )
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[v0] Team fetch error:', error)
  }

  return (
    <TeamClient
      adminName={employee.full_name}
      adminPhotoUrl={employee.profile_photo_url ?? null}
      initialEmployees={(employees ?? []) as TeamEmployee[]}
    />
  )
}
