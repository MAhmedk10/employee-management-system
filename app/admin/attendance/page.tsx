import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AttendanceClient from './AttendanceClient'

// ── Types ────────────────────────────────────────────────────
export type AttendanceStatus = 'present' | 'late' | 'absent' | 'on_leave' | 'pending'

export type AttendanceRow = {
  id: string
  employee_id: string
  date: string
  clock_in_at: string | null
  clock_out_at: string | null
  clock_in_marked_by: 'self' | 'admin' | null
  clock_out_marked_by: 'self' | 'admin' | null
  recorded_by_admin_id: string | null
  is_leave: boolean
  employee_code: string
  full_name: string
  role_title: string | null
  computed_status: AttendanceStatus
  profile_photo_url: string | null
}

export type AttendanceEmployeeOption = {
  id: string
  full_name: string
  employee_code: string
}

// ── Server Component ──────────────────────────────────────────
export default async function AdminAttendancePage() {
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

  // 3. Fetch all attendance rows (admins can read all via RLS is_admin() policy)
  const { data: rows, error } = await supabase
    .from('attendance_with_status')
    .select(
      'id, employee_id, date, clock_in_at, clock_out_at, clock_in_marked_by, clock_out_marked_by, recorded_by_admin_id, is_leave, employee_code, full_name, role_title, computed_status'
    )
    .order('date', { ascending: false })
    .order('clock_in_at', { ascending: false, nullsFirst: false })
    .limit(1000)

  if (error) {
    console.error('[v0] Attendance fetch error:', error)
  }

  // 4. Fetch employee directory (for filter dropdown + manual entry + avatars)
  const { data: employees } = await supabase
    .from('employees')
    .select('id, full_name, employee_code, profile_photo_url')
    .order('full_name', { ascending: true })

  const photoMap = new Map<string, string | null>(
    (employees ?? []).map((e) => [e.id, e.profile_photo_url ?? null])
  )

  const attendance: AttendanceRow[] = (rows ?? []).map((r) => ({
    ...(r as Omit<AttendanceRow, 'profile_photo_url'>),
    profile_photo_url: photoMap.get(r.employee_id) ?? null,
  }))

  const employeeOptions: AttendanceEmployeeOption[] = (employees ?? []).map((e) => ({
    id: e.id,
    full_name: e.full_name,
    employee_code: e.employee_code,
  }))

  return (
    <AttendanceClient
      adminName={employee.full_name}
      adminPhotoUrl={employee.profile_photo_url ?? null}
      initialAttendance={attendance}
      employees={employeeOptions}
    />
  )
}
