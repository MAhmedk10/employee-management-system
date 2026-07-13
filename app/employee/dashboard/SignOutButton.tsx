'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SignOutButton() {
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={signingOut}
      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-red-50 disabled:opacity-60"
      style={{ color: '#EF4444', border: '1px solid #E2E8F0' }}
    >
      <span className="material-symbols-outlined text-[20px]">
        {signingOut ? 'hourglass_empty' : 'logout'}
      </span>
      {signingOut ? 'Signing out…' : 'Sign Out'}
    </button>
  )
}
