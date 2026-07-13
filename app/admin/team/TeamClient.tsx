'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { createEmployee, updateEmployee, setEmployeeStatus } from '@/app/actions/employees'
import { uploadEmployeePhoto } from '@/lib/uploadEmployeePhoto'
import type { TeamEmployee } from './page'

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

function statusClasses(status: TeamEmployee['status']) {
  return status === 'active'
    ? 'bg-emerald-100 text-emerald-700'
    : 'bg-slate-200 text-slate-600'
}

// ── Avatar ────────────────────────────────────────────────────
function Avatar({
  photoUrl,
  name,
}: {
  photoUrl: string | null
  name: string
}) {
  return photoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={photoUrl || '/placeholder.svg'}
      alt={name}
      className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm flex-shrink-0"
    />
  ) : (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 border-white shadow-sm flex-shrink-0"
      style={{ background: '#E2E8F8', color: '#0F172A' }}
    >
      {getInitials(name)}
    </div>
  )
}

// ── Employee form fields (shared by Add + Edit) ───────────────
interface EmployeeFormValues {
  fullName: string
  fatherName: string
  cnic: string
  salary: string
  roleTitle: string
  monthlyLeaveBalance: string
}

const emptyForm: EmployeeFormValues = {
  fullName: '',
  fatherName: '',
  cnic: '',
  salary: '',
  roleTitle: '',
  monthlyLeaveBalance: '',
}

function FormField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
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

// ── Main Team Client ──────────────────────────────────────────
interface Props {
  adminName: string
  adminPhotoUrl: string | null
  initialEmployees: TeamEmployee[]
  initialAddOpen?: boolean
}

export default function TeamClient({
  adminName,
  adminPhotoUrl,
  initialEmployees,
  initialAddOpen = false,
}: Props) {
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [page, setPage] = useState(1)

  // Modals
  const [addOpen, setAddOpen] = useState(initialAddOpen)
  const [editTarget, setEditTarget] = useState<TeamEmployee | null>(null)

  // ── Filtering ──────────────────────────────────────────────
  const filtered = useMemo(() => {
    return initialEmployees.filter((emp) => {
      const matchSearch =
        search.trim() === '' ||
        emp.full_name.toLowerCase().includes(search.toLowerCase()) ||
        emp.employee_code.toLowerCase().includes(search.toLowerCase()) ||
        (emp.role_title ?? '').toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === 'all' || emp.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [initialEmployees, search, statusFilter])

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
  const [togglingId, setTogglingId] = useState<string | null>(null)
  async function handleToggleStatus(emp: TeamEmployee) {
    setTogglingId(emp.id)
    const next = emp.status === 'active' ? 'inactive' : 'active'
    const res = await setEmployeeStatus(emp.id, next)
    setTogglingId(null)
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
                  <rect x="9" y="9" width="4" height="4" rx="0.5" fill="url(#sg-team)" />
                  <defs>
                    <linearGradient id="sg-team" x1="9" y1="9" x2="13" y2="13" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#2E9BF0" />
                      <stop offset="1" stopColor="#9B30E0" />
                    </linearGradient>
                  </defs>
                </svg>
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
              <div className="relative hidden sm:block">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-[20px]" style={{ color: '#94A3B8' }}>
                    search
                  </span>
                </span>
                <input
                  type="text"
                  placeholder="Global search…"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  className="block w-48 md:w-64 pl-10 pr-3 py-1.5 border rounded-full text-sm outline-none transition-all focus:ring-2"
                  style={{ borderColor: '#E2E8F0', color: '#0F172A', fontFamily: 'var(--font-inter)' }}
                  id="team-search"
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
                    Admin
                  </p>
                </div>
              </div>
            </div>
          </header>

          {/* ── Main canvas ── */}
          <main className="p-4 md:p-8 flex-1">
            {/* Page header */}
            <section className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
              <div>
                <h2
                  className="text-2xl md:text-3xl font-bold tracking-tight"
                  style={{ color: '#0F172A', fontFamily: 'var(--font-space-grotesk)' }}
                >
                  Team
                </h2>
                <p className="text-sm mt-1" style={{ color: '#64748B' }}>
                  Manage your employees and workforce structure.
                </p>
              </div>
              <button
                onClick={() => setAddOpen(true)}
                className="px-5 py-2.5 gradient-accent text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-md"
              >
                <span className="material-symbols-outlined text-[18px]">person_add</span>
                Add Employee
              </button>
            </section>

            {/* Filter bar */}
            <section
              className="bg-white border rounded-xl card-shadow px-4 py-4 mb-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-4"
              style={{ borderColor: '#E2E8F0' }}
            >
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-[20px]" style={{ color: '#94A3B8' }}>
                    filter_list
                  </span>
                </span>
                <input
                  type="text"
                  placeholder="Filter by name, ID or role…"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  className="w-full pl-10 pr-3 py-2 border rounded-lg text-sm outline-none transition-all focus:ring-2 focus:ring-[#2E9BF0]/20 focus:border-[#2E9BF0]"
                  style={{ borderColor: '#E2E8F0', color: '#0F172A' }}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium" style={{ color: '#64748B' }}>
                  Status:
                </span>
                <div className="select-wrapper">
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')
                      setPage(1)
                    }}
                    aria-label="Filter by status"
                  >
                    <option value="all">All Members</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                  <span className="material-symbols-outlined text-[20px] select-chevron" aria-hidden="true">
                    expand_more
                  </span>
                </div>
              </div>
            </section>

            {/* Team table */}
            <section
              className="bg-white border rounded-xl card-shadow overflow-hidden"
              style={{ borderColor: '#E2E8F0' }}
            >
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse" style={{ minWidth: 700 }}>
                  <thead>
                    <tr style={{ backgroundColor: 'rgba(231,238,254,0.3)', borderBottom: '1px solid #E2E8F0' }}>
                      {['Employee', 'Role', 'Leave Balance', 'Status', 'Actions'].map((h) => (
                        <th
                          key={h}
                          className={`px-6 py-4 text-[11px] uppercase tracking-widest font-semibold ${
                            h === 'Actions' ? 'text-right' : ''
                          }`}
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
                        <td colSpan={5} className="px-6 py-12 text-center text-sm" style={{ color: '#64748B' }}>
                          {initialEmployees.length === 0
                            ? 'No employees yet. Click “Add Employee” to create the first one.'
                            : 'No employees match the current filters.'}
                        </td>
                      </tr>
                    ) : (
                      pageRows.map((emp) => (
                        <tr
                          key={emp.id}
                          className="transition-colors group"
                          style={{ borderBottom: '1px solid rgba(226,232,240,0.5)' }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F0F3FF')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          {/* Employee */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <Avatar photoUrl={emp.profile_photo_url} name={emp.full_name} />
                              <div>
                                <p className="font-semibold text-sm" style={{ color: '#0F172A' }}>
                                  {emp.full_name}
                                </p>
                                <p
                                  className="text-[12px]"
                                  style={{ color: '#64748B', fontFamily: 'var(--font-jetbrains-mono)' }}
                                >
                                  {emp.employee_code}
                                </p>
                              </div>
                            </div>
                          </td>
                          {/* Role */}
                          <td className="px-6 py-4 text-sm" style={{ color: '#0F172A' }}>
                            {emp.role_title ?? '—'}
                          </td>
                          {/* Leave balance */}
                          <td className="px-6 py-4">
                            <span
                              className="inline-flex items-center px-3 py-1 rounded-lg text-[13px] font-semibold"
                              style={{
                                backgroundColor: '#E2E8F8',
                                color: '#0F172A',
                                fontFamily: 'var(--font-jetbrains-mono)',
                              }}
                            >
                              {emp.monthly_leave_balance} days
                            </span>
                          </td>
                          {/* Status */}
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold tracking-wide capitalize ${statusClasses(
                                emp.status
                              )}`}
                            >
                              {emp.status}
                            </span>
                          </td>
                          {/* Actions */}
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setEditTarget(emp)}
                                className="p-2 rounded-lg hover:bg-[#E2E8F8] transition-colors"
                                style={{ color: '#64748B' }}
                                title="Edit employee"
                                aria-label={`Edit ${emp.full_name}`}
                              >
                                <span className="material-symbols-outlined text-[20px]">edit</span>
                              </button>
                              <button
                                onClick={() => handleToggleStatus(emp)}
                                disabled={togglingId === emp.id}
                                className="p-2 rounded-lg hover:bg-[#E2E8F8] transition-colors disabled:opacity-50"
                                style={{ color: emp.status === 'active' ? '#EF4444' : '#10B981' }}
                                title={emp.status === 'active' ? 'Deactivate employee' : 'Activate employee'}
                                aria-label={
                                  emp.status === 'active'
                                    ? `Deactivate ${emp.full_name}`
                                    : `Activate ${emp.full_name}`
                                }
                              >
                                <span className="material-symbols-outlined text-[20px]">
                                  {togglingId === emp.id
                                    ? 'hourglass_empty'
                                    : emp.status === 'active'
                                      ? 'person_off'
                                      : 'person'}
                                </span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table footer / pagination */}
              <div
                className="px-6 py-4 border-t flex justify-between items-center"
                style={{ borderColor: '#E2E8F0', backgroundColor: '#FAFAFB' }}
              >
                <p className="text-sm" style={{ color: '#64748B' }}>
                  Showing {pageRows.length} of {filtered.length} employee{filtered.length !== 1 ? 's' : ''}
                  {search || statusFilter !== 'all' ? ' (filtered)' : ''}
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

      {/* ── Add Employee modal ── */}
      {addOpen && (
        <AddEmployeeModal
          onClose={() => setAddOpen(false)}
          onCreated={() => {
            setAddOpen(false)
            router.refresh()
          }}
        />
      )}

      {/* ── Edit Employee modal ── */}
      {editTarget && (
        <EditEmployeeModal
          employee={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => {
            setEditTarget(null)
            router.refresh()
          }}
        />
      )}
    </>
  )
}

// ── Modal shell ───────────────────────────────────────────────
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
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

// ── Add Employee modal ────────────────────────────────────────
function AddEmployeeModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: () => void
}) {
  const [form, setForm] = useState<EmployeeFormValues>(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [credentials, setCredentials] = useState<{
    employeeCode: string
    tempPassword: string
  } | null>(null)

  function update(key: keyof EmployeeFormValues, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
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
    const res = await createEmployee({
      fullName: form.fullName.trim(),
      fatherName: form.fatherName.trim(),
      cnic: form.cnic.trim(),
      salary,
      roleTitle: form.roleTitle.trim(),
      monthlyLeaveBalance: leave,
    })
    setSubmitting(false)

    if (!res.success) {
      setError(res.error ?? 'Failed to create employee.')
      return
    }
    setCredentials({ employeeCode: res.employeeCode!, tempPassword: res.tempPassword! })
  }

  // After success we show the generated credentials the admin must share.
  if (credentials) {
    return (
      <ModalShell
        title="Employee Created"
        subtitle="Share these login credentials with the employee. The password will not be shown again."
        onClose={onCreated}
      >
        <div className="space-y-4">
          <div className="rounded-lg border p-4" style={{ borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' }}>
            <p className="text-[12px] font-semibold uppercase tracking-wide mb-1" style={{ color: '#64748B' }}>
              Employee ID
            </p>
            <p className="text-base font-bold" style={{ color: '#0F172A', fontFamily: 'var(--font-jetbrains-mono)' }}>
              {credentials.employeeCode}
            </p>
          </div>
          <div className="rounded-lg border p-4" style={{ borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' }}>
            <p className="text-[12px] font-semibold uppercase tracking-wide mb-1" style={{ color: '#64748B' }}>
              Temporary Password
            </p>
            <p className="text-base font-bold" style={{ color: '#0F172A', fontFamily: 'var(--font-jetbrains-mono)' }}>
              {credentials.tempPassword}
            </p>
          </div>
          <p className="text-[13px]" style={{ color: '#64748B' }}>
            The employee will be prompted to change this password on first login.
          </p>
          <button
            onClick={onCreated}
            className="w-full py-2.5 gradient-accent text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-all shadow-md"
          >
            Done
          </button>
        </div>
      </ModalShell>
    )
  }

  return (
    <ModalShell title="Add Employee" subtitle="Create a new employee profile and login account." onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Full Name">
          <input
            className={inputClass}
            style={inputStyle}
            value={form.fullName}
            onChange={(e) => update('fullName', e.target.value)}
            placeholder="e.g. Julianne Devis"
          />
        </FormField>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Father Name">
            <input
              className={inputClass}
              style={inputStyle}
              value={form.fatherName}
              onChange={(e) => update('fatherName', e.target.value)}
              placeholder="Father's name"
            />
          </FormField>
          <FormField label="CNIC">
            <input
              className={inputClass}
              style={inputStyle}
              value={form.cnic}
              onChange={(e) => update('cnic', e.target.value)}
              placeholder="00000-0000000-0"
            />
          </FormField>
        </div>
        <FormField label="Role / Designation">
          <input
            className={inputClass}
            style={inputStyle}
            value={form.roleTitle}
            onChange={(e) => update('roleTitle', e.target.value)}
            placeholder="e.g. Senior Product Designer"
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
              placeholder="0.00"
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
              placeholder="e.g. 22"
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
            {submitting ? 'Creating…' : 'Create Employee'}
          </button>
        </div>
      </form>
    </ModalShell>
  )
}

// ── Edit Employee modal ───────────────────────────────────────
function EditEmployeeModal({
  employee,
  onClose,
  onSaved,
}: {
  employee: TeamEmployee
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
