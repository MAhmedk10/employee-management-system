'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { updateEmployee, setEmployeeStatus } from '@/app/actions/employees'
import { uploadEmployeePhoto } from '@/lib/uploadEmployeePhoto'
import type { DetailEmployee, AttendanceRecord } from './page'

const PAGE_SIZE = 10

// ── Helpers ───────────────────────────────────────────────────
function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

function formatDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTime(ts: string | null) {
  if (!ts) return '—'
  return new Date(ts).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function hoursWorked(inTs: string | null, outTs: string | null) {
  if (!inTs || !outTs) return '—'
  const diffMs = new Date(outTs).getTime() - new Date(inTs).getTime()
  if (diffMs <= 0) return '—'
  const totalMinutes = Math.round(diffMs / 60000)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}h`
}

const STATUS_META: Record<
  AttendanceRecord['computed_status'],
  { label: string; bg: string; color: string; dot: string }
> = {
  present: { label: 'Present', bg: '#DCFCE7', color: '#15803D', dot: '#22C55E' },
  late: { label: 'Late', bg: '#FEF3C7', color: '#B45309', dot: '#F59E0B' },
  absent: { label: 'Absent', bg: '#FEE2E2', color: '#B91C1C', dot: '#EF4444' },
  on_leave: { label: 'On Leave', bg: '#DBEAFE', color: '#1D4ED8', dot: '#3B82F6' },
  pending: { label: 'Pending', bg: '#F1F5F9', color: '#64748B', dot: '#94A3B8' },
}

function attendanceSource(row: AttendanceRecord): 'self' | 'admin' | null {
  const marked = row.clock_in_marked_by ?? row.clock_out_marked_by
  if (marked) return marked
  if (row.recorded_by_admin_id) return 'admin'
  return null
}

// ── Shared form types (mirrors Team modals) ───────────────────
interface EmployeeFormValues {
  fullName: string
  fatherName: string
  cnic: string
  salary: string
  roleTitle: string
  monthlyLeaveBalance: string
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span
        className="block text-[12px] font-semibold mb-1.5 uppercase tracking-wide"
        style={{ color: '#64748B' }}
      >
        {label}
      </span>
      {children}
    </label>
  )
}

const inputClass =
  'w-full px-3 py-2 border rounded-lg text-sm outline-none transition-all focus:ring-2 focus:ring-[#2E9BF0]/20 focus:border-[#2E9BF0]'
const inputStyle = { borderColor: '#E2E8F0', color: '#0F172A' } as const

// ── Main Detail Client ────────────────────────────────────────
interface Props {
  adminName: string
  adminPhotoUrl: string | null
  employee: DetailEmployee
  attendance: AttendanceRecord[]
}

export default function EmployeeDetailClient({
  adminName,
  adminPhotoUrl,
  employee,
  attendance,
}: Props) {
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const [editOpen, setEditOpen] = useState(false)
  const [togglingStatus, setTogglingStatus] = useState(false)

  const [monthFilter, setMonthFilter] = useState<'all' | string>('all')
  const [page, setPage] = useState(1)

  // ── Available months (from attendance data) ────────────────
  const monthOptions = useMemo(() => {
    const set = new Map<string, string>()
    for (const row of attendance) {
      const key = row.date.slice(0, 7) // YYYY-MM
      if (!set.has(key)) {
        const label = new Date(`${row.date.slice(0, 7)}-01T00:00:00`).toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric',
        })
        set.set(key, label)
      }
    }
    return Array.from(set.entries()) // [key, label]
  }, [attendance])

  // ── Filtering + pagination ─────────────────────────────────
  const filtered = useMemo(() => {
    if (monthFilter === 'all') return attendance
    return attendance.filter((r) => r.date.slice(0, 7) === monthFilter)
  }, [attendance, monthFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageStart = (currentPage - 1) * PAGE_SIZE
  const pageRows = filtered.slice(pageStart, pageStart + PAGE_SIZE)

  // ── Sign out ───────────────────────────────────────────────
  async function handleSignOut() {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  // ── Status toggle ──────────────────────────────────────────
  async function handleToggleStatus() {
    setTogglingStatus(true)
    const next = employee.status === 'active' ? 'inactive' : 'active'
    const res = await setEmployeeStatus(employee.id, next)
    setTogglingStatus(false)
    if (!res.success) {
      alert(res.error ?? 'Failed to update status')
      return
    }
    router.refresh()
  }

  // ── Sidebar width classes ──────────────────────────────────
  const sidebarW = sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'
  const mainML = sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'

  const navLinks = [
    { label: 'Dashboard', icon: 'dashboard', href: '/admin/dashboard', active: false },
    { label: 'Team', icon: 'group', href: '/admin/team', active: true },
    { label: 'Attendance', icon: 'how_to_reg', href: '/admin/attendance', active: false },
    { label: 'Leave', icon: 'calendar_today', href: '/admin/leave', active: false },
    { label: 'Settings', icon: 'settings', href: '/admin/settings', active: false },
  ]

  const isActive = employee.status === 'active'

  return (
    <>
      {/* ── Google Material Symbols ── */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap');
        .material-symbols-outlined {
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
          display: inline-block;
          line-height: 1;
          vertical-align: middle;
        }
      `}</style>

      <div className="min-h-screen" style={{ backgroundColor: '#FAFAFB' }}>
        {/* ── Mobile overlay ── */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-[55] lg:hidden backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ── Sidebar ── */}
        <aside
          className={`fixed left-0 top-0 h-full sidebar-transition flex flex-col border-r z-[60] overflow-hidden ${sidebarW} ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
          style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}
        >
          {/* Logo section */}
          <div
            className={`h-16 flex items-center flex-shrink-0 border-b sidebar-transition ${
              sidebarCollapsed ? 'lg:justify-center px-3' : 'justify-between px-4'
            }`}
            style={{ borderColor: '#E2E8F0' }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => sidebarCollapsed && setSidebarCollapsed(false)}
                className={`w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-lg bg-white border overflow-hidden ${
                  sidebarCollapsed ? 'lg:cursor-pointer' : 'cursor-default'
                }`}
                style={{ borderColor: '#E2E8F0' }}
                aria-label={sidebarCollapsed ? 'Expand sidebar' : undefined}
                title={sidebarCollapsed ? 'Expand sidebar' : undefined}
                tabIndex={sidebarCollapsed ? 0 : -1}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/brand/linkage-icon.png"
                  alt="The Linkage Digital"
                  className="w-7 h-7 object-contain"
                />
              </button>
              <div
                className={`flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${
                  sidebarCollapsed ? 'lg:max-w-0 lg:opacity-0' : 'max-w-[160px] opacity-100'
                }`}
                aria-hidden={sidebarCollapsed}
              >
                <h1
                  className="font-bold text-base leading-tight whitespace-nowrap"
                  style={{ color: '#0F172A', fontFamily: 'var(--font-space-grotesk)' }}
                >
                  The Linkage
                </h1>
                <p
                  className="text-[10px] uppercase tracking-widest font-bold leading-none whitespace-nowrap"
                  style={{ color: '#64748B' }}
                >
                  Enterprise EMS
                </p>
              </div>
            </div>
            {/* Mobile close */}
            <button
              className="lg:hidden p-1.5 rounded-lg hover:bg-[#F0F3FF] transition-colors"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
            >
              <span className="material-symbols-outlined text-[20px]" style={{ color: '#64748B' }}>
                close
              </span>
            </button>
            {/* Desktop collapse toggle */}
            {!sidebarCollapsed && (
              <button
                className="hidden lg:flex items-center justify-center w-6 h-6 rounded-full hover:bg-[#F0F3FF] transition-colors ml-auto flex-shrink-0"
                onClick={() => setSidebarCollapsed(true)}
                aria-label="Collapse sidebar"
              >
                <span className="material-symbols-outlined text-[18px]" style={{ color: '#64748B' }}>
                  chevron_left
                </span>
              </button>
            )}
          </div>

          {/* Nav */}
          <nav className="flex-1 py-4 overflow-y-auto custom-scrollbar">
            <div className="px-3 space-y-0.5">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-3 px-3 py-2.5 transition-all ${
                    link.active ? 'border-r-4 font-semibold' : 'hover:bg-[#F0F3FF]'
                  } ${sidebarCollapsed ? 'justify-center' : ''}`}
                  style={
                    link.active
                      ? { backgroundColor: '#E2E8F8', borderColor: '#43A9FF', color: '#2E9BF0' }
                      : { color: '#64748B' }
                  }
                  title={sidebarCollapsed ? link.label : undefined}
                >
                  <span className="material-symbols-outlined text-[22px] flex-shrink-0">
                    {link.icon}
                  </span>
                  {!sidebarCollapsed && (
                    <span className="text-[14px] whitespace-nowrap" style={{ fontFamily: 'var(--font-inter)' }}>
                      {link.label}
                    </span>
                  )}
                </a>
              ))}
            </div>

            {/* New Report CTA */}
            {!sidebarCollapsed && (
              <div className="px-4 mt-6">
                <button className="w-full py-2.5 gradient-accent text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-md">
                  <span className="material-symbols-outlined text-[20px]">add</span>
                  New Report
                </button>
              </div>
            )}
          </nav>

          {/* Footer nav */}
          <div className="p-4 border-t space-y-1" style={{ borderColor: '#E2E8F0' }}>
            {!sidebarCollapsed && (
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-lg mb-2"
                style={{ backgroundColor: '#F8FAFC' }}
              >
                {adminPhotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={adminPhotoUrl || '/placeholder.svg'}
                    alt={adminName}
                    className="w-7 h-7 rounded-full object-cover"
                  />
                ) : (
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: '#E2E8F8', color: '#0F172A' }}
                  >
                    {getInitials(adminName)}
                  </div>
                )}
                <div className="overflow-hidden">
                  <p className="text-[13px] font-semibold truncate leading-tight" style={{ color: '#0F172A' }}>
                    {adminName}
                  </p>
                  <p className="text-[11px]" style={{ color: '#64748B' }}>
                    Admin
                  </p>
                </div>
              </div>
            )}

            <button
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors hover:bg-red-50 ${
                sidebarCollapsed ? 'justify-center' : ''
              }`}
              style={{ color: '#EF4444' }}
              onClick={handleSignOut}
              disabled={signingOut}
              title={sidebarCollapsed ? 'Sign Out' : undefined}
            >
              <span className="material-symbols-outlined text-[20px]">
                {signingOut ? 'hourglass_empty' : 'logout'}
              </span>
              {!sidebarCollapsed && (
                <span className="text-[14px] font-medium">
                  {signingOut ? 'Signing out…' : 'Sign Out'}
                </span>
              )}
            </button>
          </div>
        </aside>

        {/* ── Content wrapper ── */}
        <div className={`sidebar-transition min-h-screen flex flex-col ${mainML}`}>
          {/* Top AppBar */}
          <header
            className="sticky top-0 right-0 z-50 flex justify-between items-center h-16 px-4 md:px-8 border-b shadow-sm"
            style={{
              backgroundColor: 'rgba(255,255,255,0.85)',
              backdropFilter: 'blur(12px)',
              borderColor: '#E2E8F0',
            }}
          >
            <div className="flex items-center gap-3">
              <button
                className="lg:hidden p-2 rounded-lg hover:bg-[#F0F3FF] transition-colors"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open sidebar"
              >
                <span className="material-symbols-outlined" style={{ color: '#64748B' }}>
                  menu
                </span>
              </button>
              <a
                href="/admin/team"
                className="flex items-center gap-2 text-sm font-medium px-2 py-1.5 rounded-lg hover:bg-[#F0F3FF] transition-colors"
                style={{ color: '#64748B' }}
              >
                <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                Back to Team
              </a>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
              <button className="p-2 relative transition-colors" style={{ color: '#64748B' }}>
                <span className="material-symbols-outlined">notifications</span>
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
              </button>
              <div className="h-8 w-px mx-1" style={{ backgroundColor: '#E2E8F0' }} />
              <div className="flex items-center gap-2 md:gap-3 px-2 py-1 rounded-full hover:bg-[#F0F3FF] transition-all cursor-pointer">
                {adminPhotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={adminPhotoUrl || '/placeholder.svg'}
                    alt={adminName}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: '#E2E8F8', color: '#0F172A' }}
                  >
                    {getInitials(adminName)}
                  </div>
                )}
                <div className="hidden sm:block text-left">
                  <p
                    className="text-sm font-semibold leading-none"
                    style={{ color: '#0F172A', fontFamily: 'var(--font-inter)' }}
                  >
                    {adminName}
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ color: '#64748B' }}>
                    Admin
                  </p>
                </div>
              </div>
            </div>
          </header>

          {/* ── Main canvas ── */}
          <main className="p-4 md:p-8 flex-1">
            {/* Profile header card */}
            <section
              className="bg-white border rounded-xl card-shadow p-5 md:p-6 mb-6 flex flex-col md:flex-row md:items-center gap-5"
              style={{ borderColor: '#E2E8F0' }}
            >
              {/* Avatar with status dot */}
              <div className="relative flex-shrink-0">
                {employee.profile_photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={employee.profile_photo_url || '/placeholder.svg'}
                    alt={employee.full_name}
                    className="w-20 h-20 rounded-xl object-cover border-2 border-white shadow-sm"
                  />
                ) : (
                  <div
                    className="w-20 h-20 rounded-xl flex items-center justify-center font-bold text-2xl border-2 border-white shadow-sm"
                    style={{ background: '#E2E8F8', color: '#0F172A' }}
                  >
                    {getInitials(employee.full_name)}
                  </div>
                )}
                <span
                  className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white"
                  style={{ backgroundColor: isActive ? '#22C55E' : '#94A3B8' }}
                  aria-hidden="true"
                />
              </div>

              {/* Identity */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2
                    className="text-xl md:text-2xl font-bold tracking-tight"
                    style={{ color: '#0F172A', fontFamily: 'var(--font-space-grotesk)' }}
                  >
                    {employee.full_name}
                  </h2>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                      isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {employee.status}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-md text-[12px] font-semibold"
                    style={{
                      backgroundColor: '#E2E8F8',
                      color: '#0F172A',
                      fontFamily: 'var(--font-jetbrains-mono)',
                    }}
                  >
                    {employee.employee_code}
                  </span>
                  <span className="text-sm" style={{ color: '#64748B' }}>
                    {employee.role_title ?? 'No role assigned'}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => setEditOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-semibold hover:bg-[#F0F3FF] transition-all"
                  style={{ borderColor: '#E2E8F0', color: '#0F172A' }}
                >
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                  Edit
                </button>
                <button
                  onClick={handleToggleStatus}
                  disabled={togglingStatus}
                  className="inline-flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-semibold transition-all disabled:opacity-60"
                  style={{
                    borderColor: isActive ? '#FECACA' : '#BBF7D0',
                    color: isActive ? '#EF4444' : '#10B981',
                    backgroundColor: isActive ? '#FEF2F2' : '#F0FDF4',
                  }}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {togglingStatus ? 'hourglass_empty' : isActive ? 'person_off' : 'person'}
                  </span>
                  {isActive ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </section>

            {/* Info cards */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
              {/* Personal Info */}
              <div
                className="bg-white border rounded-xl card-shadow p-5"
                style={{ borderColor: '#E2E8F0' }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-[20px]" style={{ color: '#2E9BF0' }}>
                    person
                  </span>
                  <h3
                    className="text-[12px] font-bold uppercase tracking-widest"
                    style={{ color: '#2E9BF0' }}
                  >
                    Personal Info
                  </h3>
                </div>
                <dl className="space-y-4">
                  <div>
                    <dt className="text-[11px] uppercase tracking-wide font-semibold" style={{ color: '#94A3B8' }}>
                      Father Name
                    </dt>
                    <dd className="text-sm font-semibold mt-0.5" style={{ color: '#0F172A' }}>
                      {employee.father_name}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-wide font-semibold" style={{ color: '#94A3B8' }}>
                      CNIC
                    </dt>
                    <dd
                      className="text-sm font-semibold mt-0.5"
                      style={{ color: '#0F172A', fontFamily: 'var(--font-jetbrains-mono)' }}
                    >
                      {employee.cnic}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Employment */}
              <div
                className="bg-white border rounded-xl card-shadow p-5"
                style={{ borderColor: '#E2E8F0' }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-[20px]" style={{ color: '#2E9BF0' }}>
                    work
                  </span>
                  <h3
                    className="text-[12px] font-bold uppercase tracking-widest"
                    style={{ color: '#2E9BF0' }}
                  >
                    Employment
                  </h3>
                </div>
                <dl className="space-y-4">
                  <div>
                    <dt className="text-[11px] uppercase tracking-wide font-semibold" style={{ color: '#94A3B8' }}>
                      Role
                    </dt>
                    <dd className="text-sm font-semibold mt-0.5" style={{ color: '#0F172A' }}>
                      {employee.role_title ?? '—'}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <dt className="text-[11px] uppercase tracking-wide font-semibold" style={{ color: '#94A3B8' }}>
                        Code
                      </dt>
                      <dd
                        className="text-sm font-semibold mt-0.5"
                        style={{ color: '#0F172A', fontFamily: 'var(--font-jetbrains-mono)' }}
                      >
                        {employee.employee_code}
                      </dd>
                    </div>
                    <div className="text-right">
                      <dt className="text-[11px] uppercase tracking-wide font-semibold" style={{ color: '#94A3B8' }}>
                        Status
                      </dt>
                      <dd
                        className="text-sm font-bold mt-0.5 capitalize"
                        style={{ color: isActive ? '#15803D' : '#64748B' }}
                      >
                        {employee.status}
                      </dd>
                    </div>
                  </div>
                </dl>
              </div>

              {/* Leave Balance */}
              <div
                className="bg-white border rounded-xl card-shadow p-5"
                style={{ borderColor: '#E2E8F0' }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-[20px]" style={{ color: '#2E9BF0' }}>
                    event_available
                  </span>
                  <h3
                    className="text-[12px] font-bold uppercase tracking-widest"
                    style={{ color: '#2E9BF0' }}
                  >
                    Leave Balance
                  </h3>
                </div>
                <div className="flex flex-col items-center justify-center text-center py-2">
                  <div className="flex items-baseline gap-1.5">
                    <span
                      className="text-4xl font-bold"
                      style={{ color: '#0F172A', fontFamily: 'var(--font-space-grotesk)' }}
                    >
                      {employee.monthly_leave_balance}
                    </span>
                    <span className="text-sm font-semibold" style={{ color: '#64748B' }}>
                      days
                    </span>
                  </div>
                  <p className="text-[13px] mt-1" style={{ color: '#64748B' }}>
                    Monthly Leave Remaining
                  </p>
                  <div className="w-full h-1.5 rounded-full mt-4 gradient-accent" style={{ opacity: 0.85 }} />
                </div>
              </div>
            </section>

            {/* Attendance History */}
            <section
              className="bg-white border rounded-xl card-shadow overflow-hidden"
              style={{ borderColor: '#E2E8F0' }}
            >
              <div
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b"
                style={{ borderColor: '#E2E8F0' }}
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px]" style={{ color: '#2E9BF0' }}>
                    history
                  </span>
                  <h3
                    className="text-base font-bold"
                    style={{ color: '#0F172A', fontFamily: 'var(--font-space-grotesk)' }}
                  >
                    Attendance History
                  </h3>
                </div>
                <div className="select-wrapper">
                  <select
                    value={monthFilter}
                    onChange={(e) => {
                      setMonthFilter(e.target.value)
                      setPage(1)
                    }}
                    aria-label="Filter attendance by month"
                  >
                    <option value="all">All records</option>
                    {monthOptions.map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined text-[20px] select-chevron" aria-hidden="true">
                    expand_more
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse" style={{ minWidth: 720 }}>
                  <thead>
                    <tr style={{ backgroundColor: 'rgba(231,238,254,0.3)', borderBottom: '1px solid #E2E8F0' }}>
                      {['Date', 'Clock In', 'Clock Out', 'Hours Worked', 'Status', 'Source'].map((h) => (
                        <th
                          key={h}
                          className="px-6 py-4 text-[11px] uppercase tracking-widest font-semibold"
                          style={{ color: '#64748B', fontFamily: 'var(--font-inter)' }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-sm" style={{ color: '#64748B' }}>
                          {attendance.length === 0
                            ? 'No attendance records yet for this employee.'
                            : 'No records match the selected month.'}
                        </td>
                      </tr>
                    ) : (
                      pageRows.map((row) => {
                        const meta = STATUS_META[row.computed_status]
                        const source = attendanceSource(row)
                        return (
                          <tr
                            key={row.id}
                            className="transition-colors"
                            style={{ borderBottom: '1px solid rgba(226,232,240,0.5)' }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                          >
                            <td className="px-6 py-4 text-sm font-medium" style={{ color: '#0F172A' }}>
                              {formatDate(row.date)}
                            </td>
                            <td
                              className="px-6 py-4 text-sm"
                              style={{ color: '#0F172A', fontFamily: 'var(--font-jetbrains-mono)' }}
                            >
                              {row.is_leave ? '—' : formatTime(row.clock_in_at)}
                            </td>
                            <td
                              className="px-6 py-4 text-sm"
                              style={{ color: '#0F172A', fontFamily: 'var(--font-jetbrains-mono)' }}
                            >
                              {row.is_leave ? '—' : formatTime(row.clock_out_at)}
                            </td>
                            <td
                              className="px-6 py-4 text-sm font-bold"
                              style={{ color: '#0F172A', fontFamily: 'var(--font-jetbrains-mono)' }}
                            >
                              {row.is_leave ? '—' : hoursWorked(row.clock_in_at, row.clock_out_at)}
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold"
                                style={{ backgroundColor: meta.bg, color: meta.color }}
                              >
                                <span
                                  className="w-1.5 h-1.5 rounded-full"
                                  style={{ backgroundColor: meta.dot }}
                                />
                                {meta.label}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {source ? (
                                <span
                                  className="inline-flex items-center gap-1.5 text-[12px] font-medium"
                                  style={{ color: '#64748B' }}
                                >
                                  <span className="material-symbols-outlined text-[16px]">
                                    {source === 'admin' ? 'admin_panel_settings' : 'smartphone'}
                                  </span>
                                  {source === 'admin' ? 'Admin' : 'Self'}
                                </span>
                              ) : (
                                <span className="text-sm" style={{ color: '#94A3B8' }}>
                                  —
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Footer / pagination */}
              <div
                className="px-6 py-4 border-t flex justify-between items-center"
                style={{ borderColor: '#E2E8F0', backgroundColor: '#FAFAFB' }}
              >
                <p className="text-sm" style={{ color: '#64748B' }}>
                  {filtered.length === 0
                    ? 'No records'
                    : `Showing ${pageStart + 1}–${pageStart + pageRows.length} of ${filtered.length} record${
                        filtered.length !== 1 ? 's' : ''
                      }`}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="w-9 h-9 flex items-center justify-center border rounded-lg transition-colors hover:bg-[#F0F3FF] disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ borderColor: '#E2E8F0', color: '#64748B' }}
                    aria-label="Previous page"
                  >
                    <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                  </button>
                  <span className="text-sm px-1" style={{ color: '#64748B' }}>
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="w-9 h-9 flex items-center justify-center border rounded-lg transition-colors hover:bg-[#F0F3FF] disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ borderColor: '#E2E8F0', color: '#64748B' }}
                    aria-label="Next page"
                  >
                    <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                  </button>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>

      {/* ── Edit Employee modal ── */}
      {editOpen && (
        <EditEmployeeModal
          employee={employee}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            setEditOpen(false)
            router.refresh()
          }}
        />
      )}
    </>
  )
}

// ── Modal shell (mirrors Team modal styling) ──────────────────
function ModalShell({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string
  subtitle?: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-[32rem] max-h-[90vh] overflow-y-auto custom-scrollbar card-shadow"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="sticky top-0 flex items-start justify-between px-6 py-5 border-b"
          style={{ borderColor: '#E2E8F0', backgroundColor: '#FFFFFF' }}
        >
          <div>
            <h3
              className="text-lg font-bold"
              style={{ color: '#0F172A', fontFamily: 'var(--font-space-grotesk)' }}
            >
              {title}
            </h3>
            {subtitle && (
              <p className="text-sm mt-0.5" style={{ color: '#64748B' }}>
                {subtitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#F0F3FF] transition-colors"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-[22px]" style={{ color: '#64748B' }}>
              close
            </span>
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

// ── Edit Employee modal ───────────────────────────────────────
function EditEmployeeModal({
  employee,
  onClose,
  onSaved,
}: {
  employee: DetailEmployee
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<EmployeeFormValues>({
    fullName: employee.full_name,
    fatherName: employee.father_name,
    cnic: employee.cnic,
    salary: String(employee.salary),
    roleTitle: employee.role_title ?? '',
    monthlyLeaveBalance: String(employee.monthly_leave_balance),
  })
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(employee.profile_photo_url)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function update(key: keyof EmployeeFormValues, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const salary = Number(form.salary)
    const leave = Number(form.monthlyLeaveBalance)
    if (!form.fullName.trim() || !form.fatherName.trim() || !form.cnic.trim()) {
      setError('Full name, father name, and CNIC are required.')
      return
    }
    if (Number.isNaN(salary) || salary < 0) {
      setError('Please enter a valid salary.')
      return
    }
    if (Number.isNaN(leave) || leave < 0) {
      setError('Please enter a valid leave balance.')
      return
    }

    setSubmitting(true)
    try {
      let profilePhotoUrl: string | undefined
      if (photoFile) {
        profilePhotoUrl = await uploadEmployeePhoto(photoFile, employee.employee_code)
      }

      const res = await updateEmployee(employee.id, {
        fullName: form.fullName.trim(),
        fatherName: form.fatherName.trim(),
        cnic: form.cnic.trim(),
        salary,
        roleTitle: form.roleTitle.trim(),
        monthlyLeaveBalance: leave,
        profilePhotoUrl,
      })

      if (!res.success) {
        setError(res.error ?? 'Failed to update employee.')
        setSubmitting(false)
        return
      }
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setSubmitting(false)
    }
  }

  return (
    <ModalShell
      title="Edit Employee"
      subtitle={`Update profile details for ${employee.employee_code}.`}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Photo */}
        <div className="flex items-center gap-4">
          {photoPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoPreview || '/placeholder.svg'}
              alt={form.fullName}
              className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-sm"
            />
          ) : (
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-lg border-2 border-white shadow-sm"
              style={{ background: '#E2E8F8', color: '#0F172A' }}
            >
              {getInitials(form.fullName || employee.full_name)}
            </div>
          )}
          <label className="cursor-pointer">
            <span
              className="inline-flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-semibold hover:bg-[#F0F3FF] transition-all"
              style={{ borderColor: '#E2E8F0', color: '#0F172A' }}
            >
              <span className="material-symbols-outlined text-[18px]">photo_camera</span>
              Change Photo
            </span>
            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          </label>
        </div>

        <FormField label="Full Name">
          <input
            className={inputClass}
            style={inputStyle}
            value={form.fullName}
            onChange={(e) => update('fullName', e.target.value)}
          />
        </FormField>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Father Name">
            <input
              className={inputClass}
              style={inputStyle}
              value={form.fatherName}
              onChange={(e) => update('fatherName', e.target.value)}
            />
          </FormField>
          <FormField label="CNIC">
            <input
              className={inputClass}
              style={inputStyle}
              value={form.cnic}
              onChange={(e) => update('cnic', e.target.value)}
            />
          </FormField>
        </div>
        <FormField label="Role / Designation">
          <input
            className={inputClass}
            style={inputStyle}
            value={form.roleTitle}
            onChange={(e) => update('roleTitle', e.target.value)}
          />
        </FormField>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Salary">
            <input
              type="number"
              min="0"
              step="0.01"
              className={inputClass}
              style={inputStyle}
              value={form.salary}
              onChange={(e) => update('salary', e.target.value)}
            />
          </FormField>
          <FormField label="Monthly Leave Balance (days)">
            <input
              type="number"
              min="0"
              step="0.5"
              className={inputClass}
              style={inputStyle}
              value={form.monthlyLeaveBalance}
              onChange={(e) => update('monthlyLeaveBalance', e.target.value)}
            />
          </FormField>
        </div>

        {error && (
          <div
            className="rounded-lg px-4 py-3 text-sm"
            style={{ backgroundColor: '#FEE2E2', color: '#93000A' }}
          >
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 border rounded-lg text-sm font-semibold hover:bg-[#F0F3FF] transition-all"
            style={{ borderColor: '#E2E8F0', color: '#0F172A' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 py-2.5 gradient-accent text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-all shadow-md disabled:opacity-60"
          >
            {submitting ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>
    </ModalShell>
  )
}
