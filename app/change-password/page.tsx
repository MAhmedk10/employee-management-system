import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ChangePasswordForm from './ChangePasswordForm'

// Reachable only by an authenticated user (any role). Not a public page.
export default async function ChangePasswordPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <ChangePasswordForm />
}
