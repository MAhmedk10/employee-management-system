'use server'

import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

function employeeCodeToEmail(employeeCode: string) {
  const clean = employeeCode.toLowerCase().replace(/[^a-z0-9]/g, '')
  return `${clean}@internal.linkageems.local`
}

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%'
  let password = ''
  for (let i = 0; i < 12; i++) {
    password += chars[Math.floor(Math.random() * chars.length)]
  }
  return password
}

// SERVICE ROLE client — only ever used inside server actions, never sent to
// the browser. Required specifically for auth.admin.createUser(), which the
// public anon key cannot do.
function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function assertIsAdmin() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
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

export async function createEmployee(input: {
  fullName: string
  fatherName: string
  cnic: string
  salary: number
  roleTitle: string
  monthlyLeaveBalance: number
}) {
  await assertIsAdmin()

  const supabase = await createServerClient()
  const serviceClient = getServiceClient()

  // Generate the next Employee Code, e.g. EMP-0009
  const { count } = await supabase
    .from('employees')
    .select('*', { count: 'exact', head: true })
  const nextNumber = (count ?? 0) + 1
  const employeeCode = `EMP-${String(nextNumber).padStart(4, '0')}`
  const email = employeeCodeToEmail(employeeCode)
  const tempPassword = generateTempPassword()

  // Create the REAL Supabase Auth login account
  const { data: authUser, error: authError } = await serviceClient.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  })

  if (authError || !authUser.user) {
    return { success: false, error: `Failed to create login account: ${authError?.message}` }
  }

  // Create the employee profile record
  const { data: newEmployee, error: insertError } = await supabase
    .from('employees')
    .insert({
      employee_code: employeeCode,
      auth_user_id: authUser.user.id,
      full_name: input.fullName,
      father_name: input.fatherName,
      cnic: input.cnic,
      salary: input.salary,
      role_title: input.roleTitle,
      system_role: 'employee',
      monthly_leave_balance: input.monthlyLeaveBalance,
      must_change_password: true,
    })
    .select('id')
    .single()

  if (insertError || !newEmployee) {
    // Roll back the auth account so we don't leave an orphaned login with no profile
    await serviceClient.auth.admin.deleteUser(authUser.user.id)
    return { success: false, error: `Failed to create employee record: ${insertError?.message}` }
  }

  return {
    success: true,
    employeeId: newEmployee.id,
    employeeCode,
    tempPassword,
  }
}

export async function updateEmployee(employeeId: string, input: {
  fullName: string
  fatherName: string
  cnic: string
  salary: number
  roleTitle: string
  monthlyLeaveBalance: number
  profilePhotoUrl?: string
}) {
  await assertIsAdmin()
  const supabase = await createServerClient()

  const { error } = await supabase
    .from('employees')
    .update({
      full_name: input.fullName,
      father_name: input.fatherName,
      cnic: input.cnic,
      salary: input.salary,
      role_title: input.roleTitle,
      monthly_leave_balance: input.monthlyLeaveBalance,
      ...(input.profilePhotoUrl ? { profile_photo_url: input.profilePhotoUrl } : {}),
    })
    .eq('id', employeeId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function setEmployeeStatus(employeeId: string, status: 'active' | 'inactive') {
  await assertIsAdmin()
  const supabase = await createServerClient()

  const { error } = await supabase
    .from('employees')
    .update({ status })
    .eq('id', employeeId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}
