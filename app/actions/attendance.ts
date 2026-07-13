'use server'

import { createClient as createServerClient } from '@/lib/supabase/server'

async function assertIsAdmin() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: employee } = await supabase
    .from('employees')
    .select('system_role, status')
    .eq('auth_user_id', user.id)
    .single()

  if (!employee || employee.system_role !== 'admin' || employee.status !== 'active') {
    throw new Error('Not authorized — admin access required')
  }
}

/**
 * Record (or amend) a single attendance entry manually.
 * Wraps the SECURITY DEFINER `admin_mark_attendance` RPC, which upserts on
 * (employee_id, date) and stamps the marked-by fields as 'admin'.
 *
 * `clockIn` / `clockOut` are ISO timestamp strings (or null for none).
 */
export async function recordAttendanceManually(input: {
  employeeId: string
  date: string // YYYY-MM-DD
  clockIn: string | null
  clockOut: string | null
}) {
  await assertIsAdmin()
  const supabase = await createServerClient()

  if (!input.employeeId) return { success: false, error: 'Please select an employee.' }
  if (!input.date) return { success: false, error: 'Please choose a date.' }
  if (
    input.clockIn &&
    input.clockOut &&
    new Date(input.clockOut).getTime() <= new Date(input.clockIn).getTime()
  ) {
    return { success: false, error: 'Clock-out must be after clock-in.' }
  }

  const { error } = await supabase.rpc('admin_mark_attendance', {
    p_employee_id: input.employeeId,
    p_date: input.date,
    p_clock_in: input.clockIn,
    p_clock_out: input.clockOut,
  })

  if (error) return { success: false, error: error.message }
  return { success: true }
}
