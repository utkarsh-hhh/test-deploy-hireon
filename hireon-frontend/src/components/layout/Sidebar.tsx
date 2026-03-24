import { useState, useMemo, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { clsx } from 'clsx'
import type { UserRole } from '@/types'
import { useNotificationStore } from '@/store/notificationStore'
import { useAuth } from '@/hooks/useAuth'

// ... existing types ...

// ─── Types ─────────────────────────────────────────────────────────────────────

interface NavItem {
  to: string
  label: string
  icon: React.ReactNode
  badge?: number
  dot?: boolean         // animated green pulse dot (like Upload Resume in demo)
  customActivePath?: string  // override active detection (startsWith match)
}

interface NavGroup {
  type: 'group'
  label: string
  icon: React.ReactNode
  badge?: number
  subPaths: string[]    // used to auto-expand when any sub-route is active
  items: NavItem[]
}

type NavEntry = NavItem | NavGroup

interface NavSection {
  label: string
  items: NavEntry[]
}

// ─── Nav Config Utility ────────────────────────────────────────────────────────

const getCandidatesGroup = (badgeCount?: number): NavGroup => ({
  type: 'group',
  label: 'Candidates',
  icon: '👥',
  badge: badgeCount,
  subPaths: [
    '/recruiter/candidates',
    '/recruiter/upload',
    '/recruiter/jobs/new',
    '/recruiter/talent-pool',
  ],
  items: [
    { to: '/recruiter/candidates', label: 'All Candidates', icon: '📋' },
    { to: '/recruiter/upload', label: 'Upload Resume', icon: '⬆️', dot: true },
    { to: '/recruiter/jobs/new', label: 'Upload / Add JD', icon: '📄' },
    { to: '/recruiter/talent-pool', label: 'Talent DB', icon: '💾' },
  ],
})

const getSections = (role: UserRole, candidateBadge: number, scheduleBadge: number): NavSection[] => {
  const candidatesGroup = getCandidatesGroup(candidateBadge)

  if (role === 'admin') {
    return [
      {
        label: 'MAIN',
        items: [
          { to: '/recruiter', label: 'Overview', icon: '🏠' },
          { to: '/recruiter/jobs', label: 'Open Positions', icon: '💼' },
          candidatesGroup,
          { to: '/recruiter/pipeline', label: 'Pipeline', icon: '📋' },
          { to: '/recruiter/interviews', label: 'Schedule', icon: '📅', badge: scheduleBadge },
          { to: '/recruiter/offers', label: 'Offers', icon: '📨' },
        ],
      },
      {
        label: 'INTELLIGENCE',
        items: [
          { to: '/recruiter/analytics', label: 'AI Insights', icon: '🧠' },
        ],
      },
      {
        label: 'SETTINGS',
        items: [
          { to: '/admin/team', label: 'Team', icon: '👥' },
          { to: '/admin/audit', label: 'Audit Logs', icon: '📋' },
        ],
      },
    ]
  }

  if (role === 'interviewer') {
    return [
      {
        label: 'MY PANEL',
        items: [
          { to: '/interviewer', label: 'Dashboard', icon: '🏠' },
          { to: '/interviewer/interviews', label: 'My Interviews', icon: '📥' },
          { to: '/interviewer/scorecard-hub', label: 'Scorecard & Eval', icon: '📊', customActivePath: '/interviewer/scorecard' },
          { to: '/interviewer/prep-kit-hub', label: 'Prep Kit', icon: '🗒️', customActivePath: '/interviewer/prep-kit' },
          { to: '/interviewer/live-room-hub', label: 'Live Room', icon: '🟢', customActivePath: '/interviewer/live-room' },
        ],
      },
    ]
  }

  // Recruiter (Default)
  return [
    {
      label: 'MAIN',
      items: [
        { to: '/recruiter', label: 'Overview', icon: '🏠' },
        { to: '/recruiter/jobs', label: 'Open Positions', icon: '💼' },
        candidatesGroup,
        { to: '/recruiter/pipeline', label: 'Pipeline', icon: '📋' },
        { to: '/recruiter/interviews', label: 'Schedule', icon: '📅', badge: scheduleBadge },
      ],
    },
    {
      label: 'INTELLIGENCE',
      items: [
        { to: '/recruiter/analytics', label: 'AI Insights', icon: '🧠' },
      ],
    },
  ]
}

// ─── Sidebar Component ─────────────────────────────────────────────────────────

interface SidebarProps {
  role: UserRole
  collapsed?: boolean
  mobileOpen?: boolean
  setMobileOpen?: (open: boolean) => void
}

export function Sidebar({ role, collapsed = false, mobileOpen = false, setMobileOpen }: SidebarProps) {
  const location = useLocation()
  const { notifications } = useNotificationStore()
  const { user } = useAuth()

  const initials = useMemo(() => {
    if (!user?.full_name) return role.charAt(0).toUpperCase()
    return user.full_name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }, [user?.full_name, role])

  // Track if we are on mobile to handle auto-closing
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024 && mobileOpen) {
        setMobileOpen?.(false)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [mobileOpen, setMobileOpen])

  // Close sidebar on route change on mobile
  useEffect(() => {
    if (mobileOpen) setMobileOpen?.(false)
  }, [location.pathname]) // eslint-disable-line

  // Calculate dynamic badges
  const candidateBadge = useMemo(() => 
    notifications.filter(n => !n.is_read && (n.type === 'application_received' || n.type === 'stage_changed')).length
  , [notifications])

  const scheduleBadge = useMemo(() => 
    notifications.filter(n => !n.is_read && (n.type === 'interview_scheduled' || n.type === 'interview_reminder')).length
  , [notifications])

  const sections = useMemo(() => getSections(role, candidateBadge, scheduleBadge), [role, candidateBadge, scheduleBadge])

  // Track which group labels are expanded. Auto-expand groups whose sub-paths are active.
  const getInitialExpanded = (): Set<string> => {
    const expanded = new Set<string>()
    for (const section of sections) {
      for (const entry of section.items) {
        if ('type' in entry && entry.type === 'group') {
          if (entry.subPaths.some((p) => location.pathname.startsWith(p))) {
            expanded.add(entry.label)
          }
        }
      }
    }
    return expanded
  }

  const [expanded, setExpanded] = useState<Set<string>>(getInitialExpanded)

  const toggleGroup = (label: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }

  const isGroupActive = (group: NavGroup) =>
    group.subPaths.some((p) => location.pathname.startsWith(p))

  return (
    <aside
      className={clsx(
        'h-screen flex flex-col flex-shrink-0 transition-all duration-300 z-[70]',
        'bg-[var(--sidebar-bg)] backdrop-blur-[20px] border-r border-[var(--sidebar-border)]',
        'fixed lg:static inset-y-0 left-0',
        collapsed ? 'w-16' : 'w-60',
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}
    >
      {/* Logo Section */}
      <div className={clsx('sb-header', collapsed && 'flex justify-center px-0')}>
        <div className={clsx('logo-wrap', collapsed && 'justify-center gap-0')}>
          <div className="logo-orbit">
            <div className="logo-orbit-ring"></div>
            <div className="logo-box">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <rect x="2" y="3" width="4" height="16" rx="2" fill="white" opacity="0.95"/>
                <rect x="16" y="3" width="4" height="16" rx="2" fill="white" opacity="0.95"/>
                <rect x="2" y="9" width="18" height="4" rx="2" fill="white" opacity="0.95"/>
              </svg>
            </div>
          </div>
          {!collapsed && (
            <span className="logo-wordmark lwl">
              Hireon
            </span>
          )}
        </div>
      </div>

      <div className="sb-divider" />

      {/* Nav sections */}
      <nav className="flex-1 px-[10px] py-2 overflow-y-auto space-y-0.5">
        {sections.map((section) => (
          <div key={section.label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {!collapsed && (
              <p className="text-[10px] font-bold tracking-[1.5px] uppercase text-[var(--text-light)] px-3 pt-3 pb-1">
                {section.label}
              </p>
            )}

            {section.items.map((entry) => {
              // ── Expandable group (e.g. Candidates) ──────────────────────────
              if ('type' in entry && entry.type === 'group') {
                const isOpen = expanded.has(entry.label)
                const isActive = isGroupActive(entry)

                return (
                  <div key={entry.label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {/* Parent row */}
                    <button
                      onClick={() => toggleGroup(entry.label)}
                      className={clsx(
                        'nav-item w-full text-left',
                        isActive && 'active',
                        collapsed && 'justify-center px-2'
                      )}
                    >
                      <span className="flex-shrink-0 w-[22px] text-center text-base">{entry.icon}</span>
                      {!collapsed && (
                        <>
                          <span className="flex-1">{entry.label}</span>
                          {entry.badge != null && (
                            <span
                              className="text-[10px] font-bold text-white px-[7px] py-[1px] rounded-[10px] min-w-[18px] text-center mr-1"
                              style={{ background: 'linear-gradient(135deg, #6c47ff, #ff6bc6)' }}
                            >
                              {entry.badge}
                            </span>
                          )}
                          {/* chevron */}
                          <span
                            style={{
                              fontSize: 12,
                              display: 'inline-block',
                              transition: 'transform 0.26s',
                              transform: isOpen ? 'rotate(90deg)' : 'none',
                              color: 'var(--text-lite)',
                              marginLeft: 4,
                            }}
                          >
                            ›
                          </span>
                        </>
                      )}
                    </button>

                    {/* Sub-items */}
                    {!collapsed && (
                      <div
                        style={{
                          maxHeight: isOpen ? 500 : 0, // Increased maxHeight to be safe
                          overflow: 'hidden',
                          transition: 'max-height 0.32s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 2,
                        }}
                      >
                        {entry.items.map((sub) => {
                          const subActive = location.pathname === sub.to ||
                            (sub.to !== '/recruiter' && location.pathname.startsWith(sub.to))
                          return (
                            <NavLink
                              key={sub.to}
                              to={sub.to}
                              className={clsx(
                                'flex items-center gap-2 rounded-[9px] text-[12px] font-[500] transition-all duration-150 cursor-pointer select-none',
                                'py-[7px] pr-3',
                                'pl-[28px]',  // indented
                                subActive
                                  ? 'bg-[var(--sb-active)] text-[#6c47ff] font-[700]'
                                  : 'text-[var(--text-mid)] hover:bg-[var(--sb-hover)] hover:text-[#6c47ff]'
                              )}
                            >
                              <span style={{ fontSize: 13, width: 16, textAlign: 'center', flexShrink: 0 }}>
                                {sub.icon}
                              </span>
                              <span className="flex-1">{sub.label}</span>
                              {sub.dot && (
                                <span
                                  style={{
                                    width: 7,
                                    height: 7,
                                    borderRadius: '50%',
                                    background: '#10b981',
                                    flexShrink: 0,
                                    animation: 'pulse 2s infinite',
                                  }}
                                />
                              )}
                            </NavLink>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              }

              // ── Regular nav item ─────────────────────────────────────────────
              const item = entry as NavItem
              return (
                <NavLink
                  key={item.to + (item.customActivePath ?? '') + item.label}
                  to={item.to}
                  end={item.to === '/recruiter' || item.to === '/interviewer' || !!item.customActivePath}
                  className={({ isActive }) => {
                    const active = item.customActivePath
                      ? location.pathname.startsWith(item.customActivePath)
                      : isActive
                    return clsx('nav-item', active && 'active', collapsed && 'justify-center px-2')
                  }}
                >
                  <span className="flex-shrink-0 w-[22px] text-center text-base">{item.icon}</span>
                  {!collapsed && <span className="flex-1">{item.label}</span>}
                  {!collapsed && item.badge != null && (
                    <span
                      className="text-[10px] font-bold text-white px-[7px] py-[2px] rounded-[10px] min-w-[20px] text-center"
                      style={{ background: 'linear-gradient(135deg, #6c47ff, #ff6bc6)' }}
                    >
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              )
            })}
          </div>
        ))}
      </nav>

      {/* User Support / Role */}
      <div className="sb-footer" style={{ cursor: 'default' }}>
        <div
          className={clsx('sb-user-card', collapsed && 'justify-center px-0')}
          style={{ cursor: 'default' }}
        >
          <div className="sb-footer-av">
            {initials}
          </div>
          {!collapsed && (
            <div className="sb-footer-info">
              <div className="sb-footer-name" title={user?.full_name || role}>
                {user?.full_name || role}
              </div>
              <div className="sb-footer-role">AI Hiring Platform</div>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}

// ── Icon components ────────────────────────────────────────────────────────────
function GridIcon() {
  return (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  )
}
function BriefcaseIcon() {
  return (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  )
}
function UsersIcon() {
  return (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}
function KanbanIcon() {
  return (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
    </svg>
  )
}
function CalendarIcon() {
  return (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}
function DocumentIcon() {
  return (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}
function ChartIcon() {
  return (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  )
}
function ClipboardIcon() {
  return (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  )
}
