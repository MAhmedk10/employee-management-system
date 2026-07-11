'use server'

import { createClient } from '@supabase/supabase-js'

function employeeCodeToEmail(employeeCode: string) {
  const clean = employeeCode.toLowerCase().replace(/[^a-z0-9]/g, '')
  return `${clean}@internal.linkageems.local`
}

export async function loginWithEmployeeId(employeeCode: string, password: string) {
  const email = employeeCodeToEmail(employeeCode)

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error || !data.user) {
    return { success: false, error: 'Invalid Employee ID or password' }
  }

  const { data: employee } = await supabase
    .from('employees')
    .select('must_change_password, system_role, status')
    .eq('auth_user_id', data.user.id)
    .single()

  if (!employee || employee.status !== 'active') {
    await supabase.auth.signOut()
    return { success: false, error: 'Account not found or inactive' }
  }

  return {
    success: true,
    mustChangePassword: employee.must_change_password,
    role: employee.system_role,
  }
}