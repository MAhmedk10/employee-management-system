'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { AttendanceRow, DashboardStats } from './page'

// ── Status helpers ────────────────────────────────────────────
type ComputedStatus = AttendanceRow['computed_status']

function statusLabel(s: ComputedStatus) {
  return {
    present: 'Present',
    late: 'Late',
    absent: 'Absent',
    on_leave: 'On Leave',
    pending: 'Pending',
  }[s]
}

function statusClasses(s: ComputedStatus) {
  return {
    present: 'bg-emerald-100 text-emerald-700',
    late: 'bg-orange-100 text-orange-700',
    absent: 'bg-red-100 text-red-700',
    on_leave: 'bg-violet-100 text-violet-700',
    pending: 'bg-slate-100 text-slate-600',
  }[s]
}

function statusDotClass(s: ComputedStatus) {
  return {
    present: 'bg-emerald-500',
    late: 'bg-orange-500',
    absent: 'bg-red-500',
    on_leave: 'bg-violet-500',
    pending: 'bg-slate-400',
  }[s]
}

function formatTime(iso: string | null) {
  if (!iso) return '--:--'
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Karachi',
  })
}

function hoursWorked(clockIn: string | null, clockOut: string | null) {
  if (!clockIn) return '--'
  const end = clockOut ? new Date(clockOut) : new Date()
  const diff = (end.getTime() - new Date(clockIn).getTime()) / 1000 / 60 / 60
  if (diff < 0 || diff > 24) return '--'
  const h = Math.floor(diff)
  const m = Math.floor((diff - h) * 60)
  return `${h}h ${m.toString().padStart(2, '0')}m`
}

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

// ── Stat Card ─────────────────────────────────────────────────
function StatCard({
  label,
  value,
  icon,
  accentClass,
  iconBgClass,
  iconTextClass,
  subContent,
}: {
  label: string
  value: number
  icon: string
  accentClass: string
  iconBgClass: string
  iconTextClass: string
  subContent?: React.ReactNode
}) {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 card-shadow relative overflow-hidden group">
      {/* Top accent stripe */}
      <div className={`absolute top-0 left-0 w-full h-1 ${accentClass}`} />
      <div className="flex justify-between items-start mb-4">
        <p
          className="uppercase tracking-wider text-[11px] font-semibold"
          style={{ color: '#64748B', fontFamily: 'var(--font-inter)' }}
        >
          {label}
        </p>
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconBgClass} ${iconTextClass}`}
        >
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
        </div>
      </div>
      <p
        className="text-3xl font-bold"
        style={{ fontFamily: 'var(--font-jetbrains-mono)', color: '#0F172A' }}
      >
        {value}
      </p>
      {subContent && <div className="mt-3">{subContent}</div>}
    </div>
  )
}

// ── Avatar ────────────────────────────────────────────────────
function Avatar({
  photoUrl,
  name,
  status,
  size = 'md',
}: {
  photoUrl: string | null
  name: string
  status: ComputedStatus
  size?: 'sm' | 'md'
}) {
  const dim = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm'
  return (
    <div className="relative flex-shrink-0">
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl}
          alt={name}
          className={`${dim} rounded-full object-cover border-2 border-white shadow-sm`}
        />
      ) : (
        <div
          className={`${dim} rounded-full flex items-center justify-center font-bold border-2 border-white shadow-sm`}
          style={{ background: '#E2E8F8', color: '#0F172A' }}
        >
          {getInitials(name)}
        </div>
      )}
      <span
        className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${statusDotClass(status)}`}
      />
    </div>
  )
}

// ── Main Dashboard Client ─────────────────────────────────────
interface Props {
  adminName: string
  adminPhotoUrl: string | null
  shiftDate: string
  shiftDateDisplay: string
  initialAttendance: AttendanceRow[]
  stats: DashboardStats
}

export default function DashboardClient({
  adminName,
  adminPhotoUrl,
  shiftDate,
  shiftDateDisplay,
  initialAttendance,
  stats,
}: Props) {
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ComputedStatus | 'all'>('all')
  const [signingOut, setSigningOut] = useState(false)

  // ── Client-side filtering (no re-fetch on each keystroke) ──
  const filtered = useMemo(() => {
    return initialAttendance.filter((row) => {
      const matchSearch =
        search.trim() === '' ||
        row.full_name.toLowerCase().includes(search.toLowerCase()) ||
        row.employee_code.toLowerCase().includes(search.toLowerCase()) ||
        (row.role_title ?? '').toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === 'all' || row.computed_status === statusFilter
      return matchSearch && matchStatus
    })
  }, [initialAttendance, search, statusFilter])

  // ── Sign out ───────────────────────────────────────────────
  async function handleSignOut() {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  // ── Present % for progress bar ─────────────────────────────
  const presentPct =
    stats.totalEmployees > 0
      ? Math.round(((stats.present + stats.late) / stats.totalEmployees) * 100)
      : 0

  // ── Sidebar width classes ──────────────────────────────────
  const sidebarW = sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'
  const mainML = sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'

  const navLinks = [
    { label: 'Dashboard', icon: 'dashboard', href: '/admin/dashboard', active: true },
    { label: 'Team', icon: 'group', href: '/admin/team', active: false },
    { label: 'Attendance', icon: 'how_to_reg', href: '/admin/attendance', active: false },
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
          style={{
            backgroundColor: '#FFFFFF',
            borderColor: '#E2E8F0',
          }}
        >
          {/* Logo section */}
          <div
            className={`h-16 flex items-center flex-shrink-0 border-b sidebar-transition ${
              sidebarCollapsed ? 'lg:justify-center px-3' : 'justify-between px-4'
            }`}
            style={{ borderColor: '#E2E8F0' }}
          >
            <div className="flex items-center gap-3 min-w-0">
              {/* Brand mark — doubles as the expand control when collapsed */}
              <button
                type="button"
                onClick={() => sidebarCollapsed && setSidebarCollapsed(false)}
                className={`w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-lg gradient-accent ${
                  sidebarCollapsed ? 'lg:cursor-pointer' : 'cursor-default'
                }`}
                aria-label={sidebarCollapsed ? 'Expand sidebar' : undefined}
                title={sidebarCollapsed ? 'Expand sidebar' : undefined}
                tabIndex={sidebarCollapsed ? 0 : -1}
              >
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <rect x="3" y="3" width="16" height="16" rx="2" fill="white" fillOpacity="0.2" />
                  <rect x="6" y="6" width="10" height="10" rx="1.5" fill="white" fillOpacity="0.9" />
                  <rect x="9" y="9" width="4" height="4" rx="0.5" fill="url(#sg)" />
                  <defs>
                    <linearGradient id="sg" x1="9" y1="9" x2="13" y2="13" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#2E9BF0" />
                      <stop offset="1" stopColor="#9B30E0" />
                    </linearGradient>
                  </defs>
                </svg>
              </button>
              {/* Wordmark + subtitle — smoothly collapses to zero width, no clip */}
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
            {/* Desktop collapse toggle — only shown when expanded */}
            {!sidebarCollapsed && (
              <button
                className="hidden lg:flex items-center justify-center w-6 h-6 rounded-full hover:bg-[#F0F3FF] transition-colors ml-auto flex-shrink-0"
                onClick={() => setSidebarCollapsed(true)}
                aria-label="Collapse sidebar"
              >
                <span
                  className="material-symbols-outlined text-[18px]"
                  style={{ color: '#64748B' }}
                >
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
                    link.active
                      ? 'border-r-4 font-semibold'
                      : 'hover:bg-[#F0F3FF]'
                  } ${sidebarCollapsed ? 'justify-center' : ''}`}
                  style={
                    link.active
                      ? {
                          backgroundColor: '#E2E8F8',
                          borderColor: '#43A9FF',
                          color: '#2E9BF0',
                        }
                      : { color: '#64748B' }
                  }
                  title={sidebarCollapsed ? link.label : undefined}
                >
                  <span className="material-symbols-outlined text-[22px] flex-shrink-0">
                    {link.icon}
                  </span>
                  {!sidebarCollapsed && (
                    <span
                      className="text-[14px] whitespace-nowrap"
                      style={{ fontFamily: 'var(--font-inter)' }}
                    >
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
            {/* Admin user display */}
            {!sidebarCollapsed && (
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-lg mb-2"
                style={{ backgroundColor: '#F8FAFC' }}
              >
                {adminPhotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={adminPhotoUrl}
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
                  <p
                    className="text-[13px] font-semibold truncate leading-tight"
                    style={{ color: '#0F172A' }}
                  >
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
              {/* Mobile hamburger */}
              <button
                className="lg:hidden p-2 rounded-lg hover:bg-[#F0F3FF] transition-colors"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open sidebar"
              >
                <span className="material-symbols-outlined" style={{ color: '#64748B' }}>
                  menu
                </span>
              </button>
              {/* Search */}
              <div className="relative hidden sm:block">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-[20px]" style={{ color: '#94A3B8' }}>
                    search
                  </span>
                </span>
                <input
                  type="text"
                  placeholder="Search employees…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="block w-48 md:w-64 pl-10 pr-3 py-1.5 border rounded-full text-sm outline-none transition-all focus:ring-2"
                  style={{
                    borderColor: '#E2E8F0',
                    color: '#0F172A',
                    fontFamily: 'var(--font-inter)',
                  }}
                  id="dashboard-search"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
              {/* Notifications */}
              <button className="p-2 relative transition-colors" style={{ color: '#64748B' }}>
                <span className="material-symbols-outlined">notifications</span>
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
              </button>
              {/* Help */}
              <button className="hidden md:flex p-2 transition-colors" style={{ color: '#64748B' }}>
                <span className="material-symbols-outlined">help</span>
              </button>

              <div className="h-8 w-px mx-1" style={{ backgroundColor: '#E2E8F0' }} />

              {/* Admin avatar */}
              <div className="flex items-center gap-2 md:gap-3 px-2 py-1 rounded-full hover:bg-[#F0F3FF] transition-all cursor-pointer">
                {adminPhotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={adminPhotoUrl}
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
            {/* Dashboard header */}
            <section className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
              <div>
                <h2
                  className="text-2xl md:text-3xl font-bold tracking-tight"
                  style={{ color: '#0F172A', fontFamily: 'var(--font-space-grotesk)' }}
                >
                  Dashboard
                </h2>
                <p className="text-sm mt-1" style={{ color: '#64748B' }}>
                  {shiftDateDisplay} · Tonight&apos;s Shift
                </p>
              </div>
              <div className="flex flex-wrap gap-3 w-full md:w-auto">
                <a
                  href="/admin/settings"
                  className="flex-1 md:flex-none px-4 py-2.5 border rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#F0F3FF] transition-all"
                  style={{ borderColor: '#E2E8F0', color: '#0F172A', backgroundColor: '#FFFFFF' }}
                >
                  <span className="material-symbols-outlined text-[18px]">settings</span>
                  Settings
                </a>
                <button className="flex-1 md:flex-none px-5 py-2.5 gradient-accent text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-md">
                  <span className="material-symbols-outlined text-[18px]">person_add</span>
                  Add Employee
                </button>
              </div>
            </section>

            {/* ── Stats Grid ── */}
            <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
              {/* Total Employees */}
              <StatCard
                label="Total Employees"
                value={stats.totalEmployees}
                icon="groups"
                accentClass="gradient-accent"
                iconBgClass="bg-blue-50"
                iconTextClass="text-[#2E9BF0]"
                subContent={
                  <div className="flex items-center gap-1 text-[13px] text-[#2E9BF0] font-semibold">
                    <span className="material-symbols-outlined text-[16px]">work</span>
                    <span>Active staff</span>
                  </div>
                }
              />

              {/* Present Tonight */}
              <StatCard
                label="Present Tonight"
                value={stats.present}
                icon="check_circle"
                accentClass="bg-emerald-500"
                iconBgClass="bg-emerald-50"
                iconTextClass="text-emerald-600"
                subContent={
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 rounded-full overflow-hidden" style={{ height: 6, backgroundColor: '#E2E8F8' }}>
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${presentPct}%` }}
                      />
                    </div>
                    <span className="text-[12px] font-bold text-emerald-600">{presentPct}%</span>
                  </div>
                }
              />

              {/* Late Tonight */}
              <StatCard
                label="Late Tonight"
                value={stats.late}
                icon="schedule"
                accentClass="bg-orange-500"
                iconBgClass="bg-orange-50"
                iconTextClass="text-orange-500"
                subContent={
                  <div className="flex items-center gap-1 text-[13px] text-orange-500 font-semibold">
                    <span className="material-symbols-outlined text-[16px]">timer</span>
                    <span>Clocked in late</span>
                  </div>
                }
              />

              {/* Absent / On Leave */}
              <StatCard
                label="Absent Tonight"
                value={stats.absent}
                icon="person_off"
                accentClass="bg-red-500"
                iconBgClass="bg-red-50"
                iconTextClass="text-red-500"
                subContent={
                  <div className="flex items-center gap-1 text-[13px] text-red-500 font-semibold">
                    <span className="material-symbols-outlined text-[16px]">event_busy</span>
                    <span>{stats.onLeave} on approved leave</span>
                  </div>
                }
              />
            </section>

            {/* ── Attendance Table ── */}
            <section
              className="bg-white border rounded-xl card-shadow overflow-hidden"
              style={{ borderColor: '#E2E8F0' }}
            >
              {/* Table header bar */}
              <div
                className="px-6 py-5 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                style={{ borderColor: '#E2E8F0', backgroundColor: '#FAFAFB' }}
              >
                <div>
                  <h3
                    className="text-lg font-semibold"
                    style={{ color: '#0F172A', fontFamily: 'var(--font-space-grotesk)' }}
                  >
                    Tonight&apos;s Attendance
                  </h3>
                  <p className="text-sm mt-0.5" style={{ color: '#64748B' }}>
                    Shift date: {shiftDate} · {filtered.length} of {initialAttendance.length} shown
                  </p>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                  {/* Mobile search */}
                  <div className="relative sm:hidden flex-1">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span
                        className="material-symbols-outlined text-[18px]"
                        style={{ color: '#94A3B8' }}
                      >
                        search
                      </span>
                    </span>
                    <input
                      type="text"
                      placeholder="Search…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 border rounded-lg text-sm outline-none"
                      style={{ borderColor: '#E2E8F0', color: '#0F172A' }}
                    />
                  </div>
                  {/* Status filter */}
                  <div className="select-wrapper">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as ComputedStatus | 'all')}
                      id="status-filter"
                      aria-label="Filter by status"
                    >
                      <option value="all">All Statuses</option>
                      <option value="present">Present</option>
                      <option value="late">Late</option>
                      <option value="absent">Absent</option>
                      <option value="on_leave">On Leave</option>
                      <option value="pending">Pending</option>
                    </select>
                    <span
                      className="material-symbols-outlined text-[20px] select-chevron"
                      aria-hidden="true"
                    >
                      expand_more
                    </span>
                  </div>
                  <a
                    href="/admin/attendance"
                    className="flex items-center gap-1 text-sm font-semibold hover:underline"
                    style={{ color: '#2E9BF0' }}
                  >
                    Full History
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </a>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse" style={{ minWidth: 700 }}>
                  <thead>
                    <tr style={{ backgroundColor: 'rgba(231,238,254,0.3)', borderBottom: '1px solid #E2E8F0' }}>
                      {['Employee', 'Role', 'Clock In', 'Clock Out', 'Hours', 'Status'].map((h) => (
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
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-sm" style={{ color: '#64748B' }}>
                          {initialAttendance.length === 0
                            ? 'No attendance records for tonight\'s shift yet.'
                            : 'No employees match the current filters.'}
                        </td>
                      </tr>
                    ) : (
                      filtered.map((row) => (
                        <tr
                          key={row.id}
                          className="transition-colors group"
                          style={{ borderBottom: '1px solid rgba(226,232,240,0.5)' }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.backgroundColor = '#F0F3FF')
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.backgroundColor = 'transparent')
                          }
                        >
                          {/* Employee */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <Avatar
                                photoUrl={row.profile_photo_url}
                                name={row.full_name}
                                status={row.computed_status}
                              />
                              <div>
                                <p className="font-semibold text-sm" style={{ color: '#0F172A' }}>
                                  {row.full_name}
                                </p>
                                <p
                                  className="text-[12px]"
                                  style={{
                                    color: '#64748B',
                                    fontFamily: 'var(--font-jetbrains-mono)',
                                  }}
                                >
                                  {row.employee_code}
                                </p>
                              </div>
                            </div>
                          </td>
                          {/* Role */}
                          <td className="px-6 py-4 text-sm" style={{ color: '#0F172A' }}>
                            {row.role_title ?? '—'}
                          </td>
                          {/* Clock In */}
                          <td
                            className="px-6 py-4 text-sm"
                            style={{
                              fontFamily: 'var(--font-jetbrains-mono)',
                              color:
                                row.computed_status === 'late'
                                  ? '#F97316'
                                  : row.clock_in_at
                                  ? '#0F172A'
                                  : '#94A3B8',
                            }}
                          >
                            {formatTime(row.clock_in_at)}
                          </td>
                          {/* Clock Out */}
                          <td
                            className="px-6 py-4 text-sm"
                            style={{
                              fontFamily: 'var(--font-jetbrains-mono)',
                              color: row.clock_out_at ? '#0F172A' : '#94A3B8',
                            }}
                          >
                            {formatTime(row.clock_out_at)}
                          </td>
                          {/* Hours */}
                          <td
                            className="px-6 py-4 text-sm"
                            style={{ fontFamily: 'var(--font-jetbrains-mono)', color: '#0F172A' }}
                          >
                            {row.is_leave ? '—' : hoursWorked(row.clock_in_at, row.clock_out_at)}
                          </td>
                          {/* Status badge */}
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase ${statusClasses(row.computed_status)}`}
                            >
                              {statusLabel(row.computed_status)}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table footer */}
              <div
                className="px-6 py-4 border-t flex justify-between items-center"
                style={{ borderColor: '#E2E8F0', backgroundColor: '#FAFAFB' }}
              >
                <p className="text-sm" style={{ color: '#64748B' }}>
                  Showing {filtered.length} record{filtered.length !== 1 ? 's' : ''}
                  {search || statusFilter !== 'all' ? ' (filtered)' : ''}
                </p>
                <a
                  href="/admin/attendance"
                  className="text-sm font-semibold hover:underline flex items-center gap-1"
                  style={{ color: '#2E9BF0' }}
                >
                  View Full Attendance History
                  <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                </a>
              </div>
            </section>

            {/* ── Bottom panels ── */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8 pb-8">
              {/* Quick summary card */}
              <div
                className="lg:col-span-2 bg-white border rounded-xl p-6 card-shadow"
                style={{ borderColor: '#E2E8F0' }}
              >
                <h4
                  className="font-bold text-lg mb-6"
                  style={{ color: '#0F172A', fontFamily: 'var(--font-space-grotesk)' }}
                >
                  Tonight&apos;s Shift Summary
                </h4>
                {/* Horizontal breakdown bars */}
                <div className="space-y-4">
                  {[
                    {
                      label: 'Present',
                      value: stats.present,
                      total: stats.totalEmployees,
                      colorClass: 'bg-emerald-500',
                      textClass: 'text-emerald-600',
                    },
                    {
                      label: 'Late',
                      value: stats.late,
                      total: stats.totalEmployees,
                      colorClass: 'bg-orange-400',
                      textClass: 'text-orange-600',
                    },
                    {
                      label: 'Absent',
                      value: stats.absent,
                      total: stats.totalEmployees,
                      colorClass: 'bg-red-400',
                      textClass: 'text-red-600',
                    },
                    {
                      label: 'On Leave',
                      value: stats.onLeave,
                      total: stats.totalEmployees,
                      colorClass: 'bg-violet-400',
                      textClass: 'text-violet-600',
                    },
                  ].map(({ label, value, total, colorClass, textClass }) => {
                    const pct = total > 0 ? Math.round((value / total) * 100) : 0
                    return (
                      <div key={label}>
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-sm font-medium" style={{ color: '#64748B' }}>
                            {label}
                          </span>
                          <span className={`text-sm font-bold ${textClass}`}>
                            {value}
                            <span className="text-[11px] font-normal ml-1" style={{ color: '#94A3B8' }}>
                              ({pct}%)
                            </span>
                          </span>
                        </div>
                        <div
                          className="w-full rounded-full overflow-hidden"
                          style={{ height: 8, backgroundColor: '#E2E8F8' }}
                        >
                          <div
                            className={`h-full rounded-full ${colorClass} transition-all duration-700`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
                <p className="text-xs mt-6 pt-4 border-t" style={{ color: '#94A3B8', borderColor: '#E2E8F0' }}>
                  Based on {initialAttendance.length} attendance records for shift date {shiftDate}.
                  Unrecorded employees not included.
                </p>
              </div>

              {/* Quick links */}
              <div
                className="bg-white border rounded-xl p-6 card-shadow flex flex-col"
                style={{ borderColor: '#E2E8F0' }}
              >
                <h4
                  className="font-bold text-lg mb-6"
                  style={{ color: '#0F172A', fontFamily: 'var(--font-space-grotesk)' }}
                >
                  Quick Actions
                </h4>
                <div className="space-y-3 flex-1">
                  {[
                    { label: 'Manage Team', icon: 'group', href: '/admin/team', desc: 'View & edit employees' },
                    {
                      label: 'Attendance History',
                      icon: 'how_to_reg',
                      href: '/admin/attendance',
                      desc: 'Full attendance records',
                    },
                    {
                      label: 'Leave Requests',
                      icon: 'calendar_today',
                      href: '/admin/leave',
                      desc: 'Approve or reject leave',
                    },
                    { label: 'Settings', icon: 'settings', href: '/admin/settings', desc: 'Office & shift config' },
                  ].map((item) => (
                    <a
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-4 p-3 rounded-xl border transition-all hover:border-[#43A9FF] hover:bg-[#F0F3FF] group"
                      style={{ borderColor: '#E2E8F0' }}
                    >
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:gradient-accent transition-all"
                        style={{ backgroundColor: '#E2E8F8' }}
                      >
                        <span className="material-symbols-outlined text-[20px]" style={{ color: '#2E9BF0' }}>
                          {item.icon}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: '#0F172A' }}>
                          {item.label}
                        </p>
                        <p className="text-[12px]" style={{ color: '#64748B' }}>
                          {item.desc}
                        </p>
                      </div>
                      <span
                        className="material-symbols-outlined text-[18px] ml-auto group-hover:translate-x-1 transition-transform"
                        style={{ color: '#94A3B8' }}
                      >
                        arrow_forward
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    </>
  )
}
