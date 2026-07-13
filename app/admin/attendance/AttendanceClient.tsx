'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { recordAttendanceManually } from '@/app/actions/attendance'
import type { AttendanceRow, AttendanceEmployeeOption, AttendanceStatus } from './page'

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
  AttendanceStatus,
  { label: string; bg: string; color: string; dot: string }
> = {
  present: { label: 'Present', bg: '#DCFCE7', color: '#15803D', dot: '#22C55E' },
  late: { label: 'Late', bg: '#FEF3C7', color: '#B45309', dot: '#F59E0B' },
  absent: { label: 'Absent', bg: '#FEE2E2', color: '#B91C1C', dot: '#EF4444' },
  on_leave: { label: 'On Leave', bg: '#DBEAFE', color: '#1D4ED8', dot: '#3B82F6' },
  pending: { label: 'Pending', bg: '#F1F5F9', color: '#64748B', dot: '#94A3B8' },
}

const STATUS_ORDER: AttendanceStatus[] = ['present', 'late', 'absent', 'on_leave', 'pending']

function attendanceSource(row: AttendanceRow): 'self' | 'admin' | null {
  const marked = row.clock_in_marked_by ?? row.clock_out_marked_by
  if (marked) return marked
  if (row.recorded_by_admin_id) return 'admin'
  return null
}

const inputClass =
  'w-full px-3 py-2 border rounded-lg text-sm outline-none transition-all focus:ring-2 focus:ring-[#2E9BF0]/20 focus:border-[#2E9BF0]'
const inputStyle = { borderColor: '#E2E8F0', color: '#0F172A' } as const

// ── Main Client ───────────────────────────────────────────────
interface Props {
  adminName: string
  adminPhotoUrl: string | null
  initialAttendance: AttendanceRow[]
  employees: AttendanceEmployeeOption[]
}

export default function AttendanceClient({
  adminName,
  adminPhotoUrl,
  initialAttendance,
  employees,
}: Props) {
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [employeeFilter, setEmployeeFilter] = useState<'all' | string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | AttendanceStatus>('all')
  const [page, setPage] = useState(1)

  const [recordOpen, setRecordOpen] = useState(false)

  const hasActiveFilters =
    search.trim() !== '' ||
    fromDate !== '' ||
    toDate !== '' ||
    employeeFilter !== 'all' ||
    statusFilter !== 'all'

  function resetFilters() {
    setSearch('')
    setFromDate('')
    setToDate('')
    setEmployeeFilter('all')
    setStatusFilter('all')
    setPage(1)
  }

  // ── Filtering ──────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return initialAttendance.filter((r) => {
      if (q && !r.full_name.toLowerCase().includes(q) && !r.employee_code.toLowerCase().includes(q)) {
        return false
      }
      if (employeeFilter !== 'all' && r.employee_id !== employeeFilter) return false
      if (statusFilter !== 'all' && r.computed_status !== statusFilter) return false
      if (fromDate && r.date < fromDate) return false
      if (toDate && r.date > toDate) return false
      return true
    })
  }, [initialAttendance, search, employeeFilter, statusFilter, fromDate, toDate])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageStart = (currentPage - 1) * PAGE_SIZE
  const pageRows = filtered.slice(pageStart, pageStart + PAGE_SIZE)

  // ── CSV export ─────────────────────────────────────────────
  function handleExportCsv() {
    const header = [
      'Date',
      'Employee',
      'Employee Code',
      'Clock In',
      'Clock Out',
      'Hours Worked',
      'Status',
      'Marked By',
    ]
    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`
    const lines = filtered.map((r) => {
      const source = attendanceSource(r)
      return [
        formatDate(r.date),
        r.full_name,
        r.employee_code,
        r.is_leave ? '—' : formatTime(r.clock_in_at),
        r.is_leave ? '—' : formatTime(r.clock_out_at),
        r.is_leave ? '—' : hoursWorked(r.clock_in_at, r.clock_out_at),
        STATUS_META[r.computed_status].label,
        source ? (source === 'admin' ? 'Admin' : 'Self') : '—',
      ]
        .map((c) => escape(String(c)))
        .join(',')
    })
    const csv = [header.map(escape).join(','), ...lines].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `attendance-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // ── Sign out ───────────────────────────────────────────────
  async function handleSignOut() {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  // ── Sidebar width classes ──────────────────────────────────
  const sidebarW = sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'
  const mainML = sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'

  const navLinks = [
    { label: 'Dashboard', icon: 'dashboard', href: '/admin/dashboard', active: false },
    { label: 'Team', icon: 'group', href: '/admin/team', active: false },
    { label: 'Attendance', icon: 'how_to_reg', href: '/admin/attendance', active: true },
    { label: 'Leave', icon: 'calendar_today', href: '/admin/leave', active: false },
    { label: 'Settings', icon: 'settings', href: '/admin/settings', active: false },
  ]

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
                <button
                  onClick={() => setRecordOpen(true)}
                  className="w-full py-2.5 gradient-accent text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-md"
                >
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
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <button
                className="lg:hidden p-2 rounded-lg hover:bg-[#F0F3FF] transition-colors"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open sidebar"
              >
                <span className="material-symbols-outlined" style={{ color: '#64748B' }}>
                  menu
                </span>
              </button>
              <div className="relative w-full max-w-md">
                <span
                  className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px]"
                  style={{ color: '#94A3B8' }}
                >
                  search
                </span>
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  placeholder="Search attendance…"
                  className="w-full pl-10 pr-3 py-2 rounded-lg text-sm outline-none transition-all focus:ring-2 focus:ring-[#2E9BF0]/20 focus:border-[#2E9BF0] border"
                  style={{ borderColor: '#E2E8F0', backgroundColor: '#F8FAFC', color: '#0F172A' }}
                  aria-label="Search attendance"
                />
              </div>
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
                    Administrator
                  </p>
                </div>
              </div>
            </div>
          </header>

          {/* ── Main canvas ── */}
          <main className="p-4 md:p-8 flex-1">
            {/* Page header + actions */}
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
              <div>
                <h1
                  className="text-2xl font-bold tracking-tight"
                  style={{ color: '#0F172A', fontFamily: 'var(--font-space-grotesk)' }}
                >
                  Attendance
                </h1>
                <p className="text-sm mt-1" style={{ color: '#64748B' }}>
                  Full attendance history across all employees
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleExportCsv}
                  className="inline-flex items-center gap-2 px-4 py-2.5 border rounded-lg text-sm font-semibold hover:bg-[#F0F3FF] transition-all bg-white"
                  style={{ borderColor: '#E2E8F0', color: '#0F172A' }}
                >
                  <span className="material-symbols-outlined text-[18px]">ios_share</span>
                  Export CSV
                </button>
                <button
                  onClick={() => setRecordOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 gradient-accent text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-all shadow-md"
                >
                  <span className="material-symbols-outlined text-[18px]">add_circle</span>
                  Record Attendance Manually
                </button>
              </div>
            </div>

            {/* Filter bar */}
            <div
              className="bg-white border rounded-xl card-shadow p-4 mb-6 flex flex-col lg:flex-row lg:items-end gap-4"
              style={{ borderColor: '#E2E8F0' }}
            >
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Date range */}
                <div>
                  <label
                    className="block text-[11px] font-semibold mb-1.5 uppercase tracking-wide"
                    style={{ color: '#64748B' }}
                  >
                    Date Range
                  </label>
                  <div
                    className="flex items-center gap-2 border rounded-lg px-3 py-2"
                    style={{ borderColor: '#E2E8F0' }}
                  >
                    <span className="material-symbols-outlined text-[18px]" style={{ color: '#94A3B8' }}>
                      calendar_today
                    </span>
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => {
                        setFromDate(e.target.value)
                        setPage(1)
                      }}
                      className="flex-1 min-w-0 text-sm outline-none bg-transparent"
                      style={{ color: '#0F172A' }}
                      aria-label="From date"
                    />
                    <span className="text-sm" style={{ color: '#94A3B8' }}>
                      –
                    </span>
                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) => {
                        setToDate(e.target.value)
                        setPage(1)
                      }}
                      className="flex-1 min-w-0 text-sm outline-none bg-transparent"
                      style={{ color: '#0F172A' }}
                      aria-label="To date"
                    />
                  </div>
                </div>

                {/* Employee */}
                <div>
                  <label
                    className="block text-[11px] font-semibold mb-1.5 uppercase tracking-wide"
                    style={{ color: '#64748B' }}
                  >
                    Employee
                  </label>
                  <div className="select-wrapper">
                    <select
                      value={employeeFilter}
                      onChange={(e) => {
                        setEmployeeFilter(e.target.value)
                        setPage(1)
                      }}
                      aria-label="Filter by employee"
                    >
                      <option value="all">All Employees</option>
                      {employees.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.full_name} ({e.employee_code})
                        </option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined text-[20px] select-chevron" aria-hidden="true">
                      expand_more
                    </span>
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label
                    className="block text-[11px] font-semibold mb-1.5 uppercase tracking-wide"
                    style={{ color: '#64748B' }}
                  >
                    Status
                  </label>
                  <div className="select-wrapper">
                    <select
                      value={statusFilter}
                      onChange={(e) => {
                        setStatusFilter(e.target.value as 'all' | AttendanceStatus)
                        setPage(1)
                      }}
                      aria-label="Filter by status"
                    >
                      <option value="all">All Status</option>
                      {STATUS_ORDER.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_META[s].label}
                        </option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined text-[20px] select-chevron" aria-hidden="true">
                      expand_more
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={resetFilters}
                disabled={!hasActiveFilters}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 border rounded-lg text-sm font-semibold transition-all hover:bg-[#F0F3FF] disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                style={{ borderColor: '#E2E8F0', color: '#2E9BF0' }}
              >
                <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                Reset
              </button>
            </div>

            {/* Attendance table */}
            <section
              className="bg-white border rounded-xl card-shadow overflow-hidden"
              style={{ borderColor: '#E2E8F0' }}
            >
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse" style={{ minWidth: 900 }}>
                  <thead>
                    <tr style={{ backgroundColor: 'rgba(231,238,254,0.3)', borderBottom: '1px solid #E2E8F0' }}>
                      {['Date', 'Employee', 'Clock In', 'Clock Out', 'Hours Worked', 'Status', 'Marked By'].map(
                        (h) => (
                          <th
                            key={h}
                            className="px-6 py-4 text-[11px] uppercase tracking-widest font-semibold"
                            style={{ color: '#64748B', fontFamily: 'var(--font-inter)' }}
                          >
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-sm" style={{ color: '#64748B' }}>
                          {initialAttendance.length === 0
                            ? 'No attendance records yet.'
                            : 'No records match the current filters.'}
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
                            <td className="px-6 py-4 text-sm font-medium whitespace-nowrap" style={{ color: '#0F172A' }}>
                              {formatDate(row.date)}
                            </td>
                            <td className="px-6 py-4">
                              <a
                                href={`/admin/team/${row.employee_id}`}
                                className="flex items-center gap-3 group"
                              >
                                {row.profile_photo_url ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={row.profile_photo_url || '/placeholder.svg'}
                                    alt={row.full_name}
                                    className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                                  />
                                ) : (
                                  <div
                                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                                    style={{ background: '#E2E8F8', color: '#0F172A' }}
                                  >
                                    {getInitials(row.full_name)}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p
                                    className="text-sm font-semibold leading-tight truncate group-hover:text-[#2E9BF0] transition-colors"
                                    style={{ color: '#0F172A' }}
                                  >
                                    {row.full_name}
                                  </p>
                                  <p
                                    className="text-[11px] mt-0.5"
                                    style={{ color: '#64748B', fontFamily: 'var(--font-jetbrains-mono)' }}
                                  >
                                    {row.employee_code}
                                  </p>
                                </div>
                              </a>
                            </td>
                            <td
                              className="px-6 py-4 text-sm whitespace-nowrap"
                              style={{ color: '#0F172A', fontFamily: 'var(--font-jetbrains-mono)' }}
                            >
                              {row.is_leave ? '—' : formatTime(row.clock_in_at)}
                            </td>
                            <td
                              className="px-6 py-4 text-sm whitespace-nowrap"
                              style={{ color: '#0F172A', fontFamily: 'var(--font-jetbrains-mono)' }}
                            >
                              {row.is_leave ? '—' : formatTime(row.clock_out_at)}
                            </td>
                            <td
                              className="px-6 py-4 text-sm font-bold whitespace-nowrap"
                              style={{ color: '#0F172A', fontFamily: 'var(--font-jetbrains-mono)' }}
                            >
                              {row.is_leave ? '—' : hoursWorked(row.clock_in_at, row.clock_out_at)}
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold"
                                style={{ backgroundColor: meta.bg, color: meta.color }}
                              >
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: meta.dot }} />
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

      {/* ── Record Attendance modal ── */}
      {recordOpen && (
        <RecordAttendanceModal
          employees={employees}
          onClose={() => setRecordOpen(false)}
          onSaved={() => {
            setRecordOpen(false)
            router.refresh()
          }}
        />
      )}
    </>
  )
}

// ── Record Attendance modal ───────────────────────────────────
function RecordAttendanceModal({
  employees,
  onClose,
  onSaved,
}: {
  employees: AttendanceEmployeeOption[]
  onClose: () => void
  onSaved: () => void
}) {
  const [employeeId, setEmployeeId] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [clockIn, setClockIn] = useState('')
  const [clockOut, setClockOut] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Returns true when clock-out rolls past midnight relative to clock-in
  const isNextDay = Boolean(clockIn && clockOut && clockOut < clockIn)

  // Combine a YYYY-MM-DD date and an HH:mm time into an ISO string.
  // When forNextDay is true the date is advanced by one day (night-shift rollover).
  function toIso(timeStr: string, forNextDay = false): string | null {
    if (!timeStr) return null
    let d = date
    if (forNextDay) {
      const next = new Date(`${date}T00:00:00`)
      next.setDate(next.getDate() + 1)
      d = next.toISOString().slice(0, 10)
    }
    const local = new Date(`${d}T${timeStr}:00`)
    if (Number.isNaN(local.getTime())) return null
    return local.toISOString()
  }

  // Human-readable label for the next-day note, e.g. "July 13"
  const nextDayLabel = (() => {
    if (!date) return ''
    const next = new Date(`${date}T00:00:00`)
    next.setDate(next.getDate() + 1)
    return next.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
  })()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!employeeId) {
      setError('Please select an employee.')
      return
    }
    if (!date) {
      setError('Please choose a date.')
      return
    }
    if (!clockIn && !clockOut) {
      setError('Enter at least a clock-in or clock-out time.')
      return
    }

    setSubmitting(true)
    try {
      const res = await recordAttendanceManually({
        employeeId,
        date,
        clockIn: toIso(clockIn),
        clockOut: toIso(clockOut, isNextDay),
      })
      if (!res.success) {
        setError(res.error ?? 'Failed to record attendance.')
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
              Record Attendance Manually
            </h3>
            <p className="text-sm mt-0.5" style={{ color: '#64748B' }}>
              Log a shift for an employee (WFH or exception cases).
            </p>
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <label className="block">
            <span
              className="block text-[12px] font-semibold mb-1.5 uppercase tracking-wide"
              style={{ color: '#64748B' }}
            >
              Employee
            </span>
            <div className="select-wrapper">
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                aria-label="Select employee"
              >
                <option value="">Select an employee…</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.full_name} ({e.employee_code})
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined text-[20px] select-chevron" aria-hidden="true">
                expand_more
              </span>
            </div>
          </label>

          <label className="block">
            <span
              className="block text-[12px] font-semibold mb-1.5 uppercase tracking-wide"
              style={{ color: '#64748B' }}
            >
              Date
            </span>
            <input
              type="date"
              className={inputClass}
              style={inputStyle}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span
                className="block text-[12px] font-semibold mb-1.5 uppercase tracking-wide"
                style={{ color: '#64748B' }}
              >
                Clock In
              </span>
              <input
                type="time"
                className={inputClass}
                style={inputStyle}
                value={clockIn}
                onChange={(e) => setClockIn(e.target.value)}
              />
            </label>
            <div className="block">
              <span
                className="block text-[12px] font-semibold mb-1.5 uppercase tracking-wide"
                style={{ color: '#64748B' }}
              >
                Clock Out
              </span>
              <input
                type="time"
                className={inputClass}
                style={inputStyle}
                value={clockOut}
                onChange={(e) => setClockOut(e.target.value)}
                aria-label="Clock Out"
              />
              {isNextDay && nextDayLabel && (
                <p
                  className="mt-1.5 text-xs flex items-center gap-1"
                  style={{ color: '#4F46E5' }}
                >
                  <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
                    info
                  </span>
                  Will be recorded for {nextDayLabel} (next day)
                </p>
              )}
            </div>
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
              {submitting ? 'Saving…' : 'Record Attendance'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
