import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SignOutButton from './SignOutButton'

// ── Server Component ──────────────────────────────────────────
// Minimal placeholder Employee Portal. Reachable only by an authenticated,
// active employee (any role). Full features (clock in/out, attendance
// history, profile) arrive in a later task.
export default async function EmployeeDashboardPage() {
  const supabase = await createClient()

  // 1. Verify authenticated session
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 2. Verify the employee exists and is active (any role)
  const { data: employee } = await supabase
    .from('employees')
    .select('full_name, status')
    .eq('auth_user_id', user.id)
    .single()

  if (!employee || employee.status !== 'active') {
    redirect('/login')
  }

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center p-6 text-center"
      style={{ backgroundColor: '#FAFAFB', fontFamily: 'var(--font-inter), system-ui, sans-serif' }}
    >
      <div
        className="w-full flex flex-col items-center"
        style={{
          maxWidth: '440px',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          boxShadow: '0px 1px 3px rgba(0,0,0,0.05), 0px 20px 25px -5px rgba(0,0,0,0.02)',
          padding: '40px',
        }}
      >
        <h1
          style={{
            fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif',
            fontSize: '24px',
            fontWeight: 600,
            lineHeight: '32px',
            letterSpacing: '-0.01em',
            color: '#0F172A',
            marginBottom: '8px',
          }}
        >
          Welcome, {employee.full_name}
        </h1>
        <p style={{ fontSize: '15px', lineHeight: '24px', color: '#64748B', marginBottom: '32px' }}>
          Employee Portal — full features coming soon
        </p>
        <SignOutButton />
      </div>
    </main>
  )
}
