import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import EmployeeDetailClient from './EmployeeDetailClient'

// ── Types ────────────────────────────────────────────────────
export type DetailEmployee = {
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

export type AttendanceRecord = {
  id: string
  date: string
  clock_in_at: string | null
  clock_out_at: string | null
  clock_in_marked_by: 'self' | 'admin' | null
  clock_out_marked_by: 'self' | 'admin' | null
  recorded_by_admin_id: string | null
  is_leave: boolean
  computed_status: 'present' | 'late' | 'absent' | 'on_leave' | 'pending'
}

// ── Server Component ──────────────────────────────────────────
export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // 1. Verify authenticated session
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 2. Verify admin role via employees table
  const { data: admin } = await supabase
    .from('employees')
    .select('system_role, full_name, profile_photo_url, status')
    .eq('auth_user_id', user.id)
    .single()

  if (!admin || admin.status !== 'active' || admin.system_role !== 'admin') {
    redirect('/login')
  }

  // 3. Fetch the target employee (admins can read all via RLS is_admin() policy)
  const { data: employee, error } = await supabase
    .from('employees')
    .select(
      'id, employee_code, full_name, father_name, cnic, salary, role_title, monthly_leave_balance, status, profile_photo_url'
    )
    .eq('id', id)
    .single()

  if (error || !employee) {
    notFound()
  }

  // 4. Fetch that employee's attendance with computed status (most recent first)
  const { data: attendance, error: attErr } = await supabase
    .from('attendance_with_status')
    .select(
      'id, date, clock_in_at, clock_out_at, clock_in_marked_by, clock_out_marked_by, recorded_by_admin_id, is_leave, computed_status'
    )
    .eq('employee_id', id)
    .order('date', { ascending: false })

  if (attErr) {
    console.error('[v0] Attendance fetch error:', attErr)
  }

  return (
    <EmployeeDetailClient
      adminName={admin.full_name}
      adminPhotoUrl={admin.profile_photo_url ?? null}
      employee={employee as DetailEmployee}
      attendance={(attendance ?? []) as AttendanceRecord[]}
    />
  )
}
