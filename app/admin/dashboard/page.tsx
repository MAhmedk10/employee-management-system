import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardClient from './DashboardClient'

// ── Types ────────────────────────────────────────────────────
export type AttendanceRow = {
  id: string
  employee_id: string
  date: string
  clock_in_at: string | null
  clock_out_at: string | null
  is_leave: boolean
  computed_status: 'present' | 'late' | 'absent' | 'on_leave' | 'pending'
  employee_code: string
  full_name: string
  role_title: string | null
  profile_photo_url: string | null
}

export type DashboardStats = {
  totalEmployees: number
  present: number
  late: number
  absent: number
  onLeave: number
}

// ── Server Component ──────────────────────────────────────────
export default async function AdminDashboardPage() {
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

  // 3. Determine tonight's shift date
  // Night shift starts at 22:00 local time. For the purposes of attendance,
  // the "shift date" is the calendar date when the shift STARTS.
  // If we're before midnight, shift date = today; if we're past midnight
  // (i.e. the AM hours of the overnight shift), shift date = yesterday.
  const now = new Date()
  // Use UTC+5 (PKT) — the offset from .env can be read too, but hardcoding
  // to match the user's local time (2026-07-12T17:25:59+05:00)
  const PKT_OFFSET_MS = 5 * 60 * 60 * 1000
  const pktNow = new Date(now.getTime() + PKT_OFFSET_MS)
  const pktHour = pktNow.getUTCHours()

  // If current PKT time is before 10 AM, the active shift started yesterday evening
  let shiftDate: string
  if (pktHour < 10) {
    const yesterday = new Date(pktNow)
    yesterday.setUTCDate(yesterday.getUTCDate() - 1)
    shiftDate = yesterday.toISOString().slice(0, 10)
  } else {
    shiftDate = pktNow.toISOString().slice(0, 10)
  }

  // 4. Count total ACTIVE employees
  const { count: totalEmployees } = await supabase
    .from('employees')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')

  // 5. Fetch tonight's attendance records with computed status + profile photos
  //    The attendance_with_status view joins employees, so we get employee details.
  //    We also need profile_photo_url which is on employees — join it manually.
  const { data: rawAttendance, error: attendanceError } = await supabase
    .from('attendance_with_status')
    .select(`
      id,
      employee_id,
      date,
      clock_in_at,
      clock_out_at,
      is_leave,
      computed_status,
      employee_code,
      full_name,
      role_title
    `)
    .eq('date', shiftDate)

  if (attendanceError) {
    console.error('Attendance fetch error:', attendanceError)
  }

  // 6. Fetch profile photos for the employees in tonight's attendance
  let photoMap: Record<string, string | null> = {}
  if (rawAttendance && rawAttendance.length > 0) {
    const employeeIds = rawAttendance.map((r) => r.employee_id)
    const { data: photos } = await supabase
      .from('employees')
      .select('id, profile_photo_url')
      .in('id', employeeIds)

    if (photos) {
      photoMap = Object.fromEntries(photos.map((p) => [p.id, p.profile_photo_url]))
    }
  }

  // 7. Merge photos into attendance rows
  const attendance: AttendanceRow[] = (rawAttendance ?? []).map((row) => ({
    ...row,
    profile_photo_url: photoMap[row.employee_id] ?? null,
  }))

  // 8. Compute stat counts from the fetched data
  const stats: DashboardStats = {
    totalEmployees: totalEmployees ?? 0,
    present: attendance.filter((r) => r.computed_status === 'present').length,
    late: attendance.filter((r) => r.computed_status === 'late').length,
    absent: attendance.filter((r) => r.computed_status === 'absent').length,
    onLeave: attendance.filter((r) => r.computed_status === 'on_leave').length,
  }

  // 9. Format shift date for display (e.g. "Saturday, July 12, 2026")
  const shiftDateDisplay = new Date(shiftDate + 'T12:00:00Z').toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })

  return (
    <DashboardClient
      adminName={employee.full_name}
      adminPhotoUrl={employee.profile_photo_url ?? null}
      shiftDate={shiftDate}
      shiftDateDisplay={shiftDateDisplay}
      initialAttendance={attendance}
      stats={stats}
    />
  )
}
