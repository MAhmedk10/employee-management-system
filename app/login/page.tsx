'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { loginWithEmployeeId } from '@/app/actions/auth'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const employeeId = formData.get('employee-id') as string
    const password = formData.get('password') as string

    try {
      const result = await loginWithEmployeeId(employeeId, password)

      if (!result.success || result.error) {
        setError(result.error ?? 'An unexpected error occurred.')
        return
      }

      if (result.mustChangePassword) {
        router.push('/change-password')
        return
      }

      if (result.role === 'admin') {
        router.push('/admin/dashboard')
      } else if (result.role === 'employee') {
        router.push('/employee/dashboard')
      } else {
        router.push('/dashboard')
      }
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative"
         style={{ backgroundColor: '#FAFAFB', fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>

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

      {/* ── Main login card ── */}
      <main
        className="w-full z-10"
        style={{ maxWidth: '440px' }}
        role="main"
      >
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
          {/* ── Brand logo ── */}
          <div style={{ marginBottom: '24px' }}>
            {/* Inline SVG wordmark to avoid external image dependency */}
            <svg width="160" height="36" viewBox="0 0 160 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Linkage Digital">
              {/* Geometric brand mark */}
              <rect x="0" y="8" width="20" height="20" rx="2" fill="url(#logo-gradient)" />
              <rect x="4" y="12" width="12" height="12" rx="1" fill="white" fillOpacity="0.9" />
              <rect x="7" y="15" width="6" height="6" rx="0.5" fill="url(#logo-gradient)" />
              {/* Pixel clusters */}
              <rect x="18" y="6" width="3" height="3" rx="0.5" fill="#2E9BF0" fillOpacity="0.5" />
              <rect x="22" y="4" width="2" height="2" rx="0.25" fill="#9B30E0" fillOpacity="0.4" />
              {/* Wordmark */}
              <text
                x="30"
                y="26"
                fontFamily="var(--font-space-grotesk), system-ui, sans-serif"
                fontSize="18"
                fontWeight="700"
                letterSpacing="-0.5"
                fill="#0F172A"
              >
                Linkage
              </text>
              <text
                x="98"
                y="26"
                fontFamily="var(--font-space-grotesk), system-ui, sans-serif"
                fontSize="18"
                fontWeight="400"
                letterSpacing="-0.3"
                fill="#64748B"
              >
                Digital
              </text>
              <defs>
                <linearGradient id="logo-gradient" x1="0" y1="0" x2="20" y2="20" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#2E9BF0" />
                  <stop offset="1" stopColor="#9B30E0" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* ── Header ── */}
          <div className="text-center" style={{ marginBottom: '32px' }}>
            <h1
              style={{
                fontFamily: 'var(--font-inter), system-ui, sans-serif',
                fontSize: '22px',
                fontWeight: '600',
                lineHeight: '28px',
                letterSpacing: '-0.01em',
                color: '#0F172A',
                marginBottom: '6px',
              }}
            >
              Admin Portal
            </h1>
            <p style={{ fontSize: '14px', lineHeight: '20px', color: '#64748B' }}>
              Sign in to your account to continue
            </p>
          </div>

          {/* ── Error banner ── */}
          {error && (
            <div
              id="login-error"
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
              {/* Error icon */}
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: '2px' }}>
                <circle cx="8" cy="8" r="7.5" stroke="#EF4444" strokeWidth="1" />
                <path d="M8 4.5V8.5" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="8" cy="11" r="0.75" fill="#EF4444" />
              </svg>
              <span style={{ fontSize: '14px', lineHeight: '20px', color: '#93000A' }}>
                {error}
              </span>
            </div>
          )}

          {/* ── Login form ── */}
          <form
            id="loginForm"
            className="w-full"
            onSubmit={handleSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
          >
            {/* Employee ID field */}
            <div>
              <label
                htmlFor="employee-id"
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
                Employee ID
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
                {/* Person icon */}
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
                    <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M4 20c0-4 3.582-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
                <input
                  id="employee-id"
                  name="employee-id"
                  type="text"
                  placeholder="EMP-0001"
                  required
                  autoComplete="username"
                  disabled={loading}
                  style={{
                    width: '100%',
                    paddingLeft: '44px',
                    paddingRight: '16px',
                    paddingTop: '12px',
                    paddingBottom: '12px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    outline: 'none',
                    fontSize: '15px',
                    lineHeight: '24px',
                    color: '#0F172A',
                    fontFamily: 'var(--font-jetbrains-mono), monospace',
                  }}
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', padding: '0 2px' }}>
                <label
                  htmlFor="password"
                  style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    lineHeight: '16px',
                    color: '#0F172A',
                  }}
                >
                  Password
                </label>
                <a
                  href="#"
                  style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#2E9BF0',
                    textDecoration: 'none',
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#9B30E0')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#2E9BF0')}
                >
                  Forgot password?
                </a>
              </div>
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
                {/* Lock icon */}
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
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
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
                {/* Toggle visibility */}
                <button
                  type="button"
                  id="togglePassword"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword(v => !v)}
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
                  onMouseEnter={e => (e.currentTarget.style.color = '#0F172A')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#94A3B8')}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M3 3l18 18M10.58 10.58A3 3 0 0013.42 13.42M7.38 7.38C5.41 8.7 3.9 10.5 3 12c1.73 3.07 5.12 5 9 5a9.9 9.9 0 004.62-1.13M9.9 4.24A9.77 9.77 0 0112 4c3.88 0 7.27 1.93 9 5-0.72 1.28-1.73 2.4-2.95 3.27" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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

            {/* Remember me */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 2px' }}>
              <input
                id="remember"
                name="remember"
                type="checkbox"
                disabled={loading}
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '4px',
                  accentColor: '#2E9BF0',
                  cursor: 'pointer',
                }}
              />
              <label
                htmlFor="remember"
                style={{
                  fontSize: '14px',
                  lineHeight: '20px',
                  color: '#64748B',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                Remember this device
              </label>
            </div>

            {/* Submit button */}
            <button
              id="loginSubmitBtn"
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
                  <svg
                    className="animate-spin"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
                    <path d="M12 2a10 10 0 0110 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* ── Divider ── */}
          <div
            style={{
              width: '100%',
              marginTop: '32px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '12px' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(226, 232, 240, 0.6)' }} />
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: '#94A3B8',
                  whiteSpace: 'nowrap',
                }}
              >
                or continue with
              </span>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(226, 232, 240, 0.6)' }} />
            </div>

            {/* SSO buttons */}
            <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
              <button
                type="button"
                id="googleSSOBtn"
                title="Login with Google"
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '10px 0',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  backgroundColor: '#FFFFFF',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
              >
                <svg className="w-4 h-4" width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                <span style={{ fontSize: '14px', fontWeight: '500', color: '#0F172A' }}>Google</span>
              </button>

              <button
                type="button"
                id="microsoftSSOBtn"
                title="Login with Microsoft"
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '10px 0',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  backgroundColor: '#FFFFFF',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
              >
                <svg width="16" height="16" viewBox="0 0 23 23" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <rect width="11" height="11" fill="#f35325" />
                  <rect x="12" width="11" height="11" fill="#81bc06" />
                  <rect y="12" width="11" height="11" fill="#05a6f0" />
                  <rect x="12" y="12" width="11" height="11" fill="#ffba08" />
                </svg>
                <span style={{ fontSize: '14px', fontWeight: '500', color: '#0F172A' }}>Microsoft</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <footer style={{ marginTop: '24px', textAlign: 'center' }}>
          <p style={{ fontSize: '12px', color: 'rgba(100, 116, 139, 0.6)' }}>
            &copy; 2026 The Linkage Digital — Enterprise OS
          </p>
          <div
            style={{
              marginTop: '12px',
              display: 'flex',
              justifyContent: 'center',
              gap: '16px',
              fontSize: '11px',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {['Privacy Policy', 'Terms of Use', 'Support'].map(link => (
              <a
                key={link}
                href="#"
                style={{ color: 'rgba(100, 116, 139, 0.7)', textDecoration: 'none', transition: 'color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#2E9BF0')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(100, 116, 139, 0.7)')}
              >
                {link}
              </a>
            ))}
          </div>
        </footer>
      </main>
    </div>
  )
}
