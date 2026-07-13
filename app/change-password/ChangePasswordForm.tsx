'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ChangePasswordForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)
    const newPassword = (formData.get('new-password') as string) ?? ''
    const confirmPassword = (formData.get('confirm-password') as string) ?? ''

    // ── Client-side validation ──
    if (newPassword.length < 8) {
      setError('Your new password must be at least 8 characters long.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('The passwords you entered do not match.')
      return
    }

    setLoading(true)
    const supabase = createClient()

    try {
      // 1. Update the password on the auth user.
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      })
      if (updateError) {
        setError(updateError.message || 'Failed to update your password. Please try again.')
        return
      }

      // 2. Clear the must_change_password flag on the user's own record.
      const { error: rpcError } = await supabase.rpc('clear_must_change_password')
      if (rpcError) {
        setError(rpcError.message || 'Your password was updated, but we could not finish setup. Please try again.')
        return
      }

      // 3. Redirect based on the user's system_role.
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data: employee, error: roleError } = await supabase
        .from('employees')
        .select('system_role')
        .eq('auth_user_id', user.id)
        .single()

      if (roleError || !employee) {
        setError('Your password was updated, but we could not determine your account role. Please sign in again.')
        return
      }

      if (employee.system_role === 'admin') {
        router.push('/admin/dashboard')
      } else {
        router.push('/employee/dashboard')
      }
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 relative"
      style={{ backgroundColor: '#FAFAFB', fontFamily: 'var(--font-inter), system-ui, sans-serif' }}
    >
      {/* ── Circuit line background motifs ── */}
      <svg
        className="circuit-line top-0 left-0 w-64 h-64"
        fill="none"
        viewBox="0 0 200 200"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path d="M0 20H40V60H80V100H120V140H160V180H200" stroke="#0F172A" strokeWidth="1.5" />
        <circle cx="40" cy="20" fill="#0F172A" r="2.5" />
        <circle cx="80" cy="60" fill="#0F172A" r="2.5" />
        <circle cx="120" cy="100" fill="#0F172A" r="2.5" />
      </svg>

      <svg
        className="circuit-line bottom-0 right-0 w-64 h-64 rotate-180"
        fill="none"
        viewBox="0 0 200 200"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{ transform: 'rotate(180deg)' }}
      >
        <path d="M0 20H40V60H80V100H120V140H160V180H200" stroke="#0F172A" strokeWidth="1.5" />
        <rect fill="#2E9BF0" height="4" width="4" x="118" y="138" />
        <rect fill="#9B30E0" height="4" width="4" x="158" y="178" />
        <circle cx="40" cy="20" fill="#0F172A" r="2.5" />
      </svg>

      {/* ── Main card ── */}
      <main className="w-full z-10" style={{ maxWidth: '440px' }} role="main">
        <div
          className="flex flex-col items-center"
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            boxShadow: '0px 1px 3px rgba(0,0,0,0.05), 0px 20px 25px -5px rgba(0,0,0,0.02)',
            padding: '40px',
          }}
        >
          {/* ── Icon badge ── */}
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #2E9BF0 0%, #9B30E0 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '24px',
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="5" y="11" width="14" height="10" rx="2" stroke="#FFFFFF" strokeWidth="1.6" />
              <path d="M8 11V7a4 4 0 118 0v4" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" />
              <circle cx="12" cy="16" r="1.3" fill="#FFFFFF" />
            </svg>
          </div>

          {/* ── Header ── */}
          <div className="text-center" style={{ marginBottom: '32px' }}>
            <h1
              style={{
                fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif',
                fontSize: '22px',
                fontWeight: '700',
                lineHeight: '28px',
                letterSpacing: '-0.01em',
                color: '#0F172A',
                marginBottom: '6px',
              }}
            >
              Set a New Password
            </h1>
            <p style={{ fontSize: '14px', lineHeight: '20px', color: '#64748B' }}>
              Choose a strong password to secure your account.
            </p>
          </div>

          {/* ── Error banner ── */}
          {error && (
            <div
              role="alert"
              aria-live="assertive"
              style={{
                width: '100%',
                backgroundColor: '#FEE2E2',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '8px',
                padding: '12px 16px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: '2px' }}>
                <circle cx="8" cy="8" r="7.5" stroke="#EF4444" strokeWidth="1" />
                <path d="M8 4.5V8.5" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="8" cy="11" r="0.75" fill="#EF4444" />
              </svg>
              <span style={{ fontSize: '14px', lineHeight: '20px', color: '#93000A' }}>{error}</span>
            </div>
          )}

          {/* ── Form ── */}
          <form className="w-full" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* New Password */}
            <div>
              <label
                htmlFor="new-password"
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  lineHeight: '16px',
                  color: '#0F172A',
                  marginBottom: '8px',
                  marginLeft: '2px',
                }}
              >
                New Password
              </label>
              <div
                className="input-wrapper"
                style={{
                  position: 'relative',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  backgroundColor: '#FFFFFF',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                    color: '#94A3B8',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M8 11V7a4 4 0 118 0v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <circle cx="12" cy="16" r="1.25" fill="currentColor" />
                  </svg>
                </div>
                <input
                  id="new-password"
                  name="new-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  disabled={loading}
                  style={{
                    width: '100%',
                    paddingLeft: '44px',
                    paddingRight: '44px',
                    paddingTop: '12px',
                    paddingBottom: '12px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    outline: 'none',
                    fontSize: '15px',
                    lineHeight: '24px',
                    color: '#0F172A',
                  }}
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((v) => !v)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    color: '#94A3B8',
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#0F172A')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#94A3B8')}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M3 3l18 18M10.58 10.58A3 3 0 0013.42 13.42M7.38 7.38C5.41 8.7 3.9 10.5 3 12c1.73 3.07 5.12 5 9 5a9.9 9.9 0 004.62-1.13M9.9 4.24A9.77 9.77 0 0112 4c3.88 0 7.27 1.93 9 5-0.72 1.28-1.73 2.4-2.95 3.27"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M1 12C2.73 8.93 6.12 7 10 7s7.27 1.93 9 5c-1.73 3.07-5.12 5-9 5S2.73 15.07 1 12z" stroke="currentColor" strokeWidth="1.5" />
                      <circle cx="10" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                  )}
                </button>
              </div>
              <p style={{ fontSize: '12px', lineHeight: '16px', color: '#94A3B8', marginTop: '6px', marginLeft: '2px' }}>
                Must be at least 8 characters.
              </p>
            </div>

            {/* Confirm New Password */}
            <div>
              <label
                htmlFor="confirm-password"
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  lineHeight: '16px',
                  color: '#0F172A',
                  marginBottom: '8px',
                  marginLeft: '2px',
                }}
              >
                Confirm New Password
              </label>
              <div
                className="input-wrapper"
                style={{
                  position: 'relative',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  backgroundColor: '#FFFFFF',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                    color: '#94A3B8',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M8 11V7a4 4 0 118 0v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <circle cx="12" cy="16" r="1.25" fill="currentColor" />
                  </svg>
                </div>
                <input
                  id="confirm-password"
                  name="confirm-password"
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  disabled={loading}
                  style={{
                    width: '100%',
                    paddingLeft: '44px',
                    paddingRight: '44px',
                    paddingTop: '12px',
                    paddingBottom: '12px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    outline: 'none',
                    fontSize: '15px',
                    lineHeight: '24px',
                    color: '#0F172A',
                  }}
                />
                <button
                  type="button"
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  onClick={() => setShowConfirm((v) => !v)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    color: '#94A3B8',
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#0F172A')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#94A3B8')}
                >
                  {showConfirm ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M3 3l18 18M10.58 10.58A3 3 0 0013.42 13.42M7.38 7.38C5.41 8.7 3.9 10.5 3 12c1.73 3.07 5.12 5 9 5a9.9 9.9 0 004.62-1.13M9.9 4.24A9.77 9.77 0 0112 4c3.88 0 7.27 1.93 9 5-0.72 1.28-1.73 2.4-2.95 3.27"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M1 12C2.73 8.93 6.12 7 10 7s7.27 1.93 9 5c-1.73 3.07-5.12 5-9 5S2.73 15.07 1 12z" stroke="currentColor" strokeWidth="1.5" />
                      <circle cx="10" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="gradient-btn"
              style={{
                width: '100%',
                padding: '13px 24px',
                borderRadius: '8px',
                border: 'none',
                color: '#FFFFFF',
                fontWeight: '600',
                fontSize: '15px',
                lineHeight: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? (
                <>
                  <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
                    <path d="M12 2a10 10 0 0110 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  <span>Update Password</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </>
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
