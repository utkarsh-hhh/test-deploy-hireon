import { useAuth } from '@/hooks/useAuth'
import { NotificationBell } from './NotificationBell'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

interface TopbarProps {
  title?: string
  onToggleMenu?: () => void
}

export function Topbar({ title, onToggleMenu }: TopbarProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)
  const [isDark, setIsDark] = useState(false)

  // Sync dark class on <html>
  useEffect(() => {
    const root = document.documentElement
    if (isDark) root.classList.add('dark')
    else root.classList.remove('dark')
  }, [isDark])

  const initials = user?.full_name
    ? user.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U'

  const profilePath = user?.role === 'interviewer' ? '/interviewer/profile' : '/recruiter/profile'
  const settingsPath = user?.role === 'interviewer' ? '/interviewer/settings' : '/recruiter/settings'

  const menuItems = [
    { label: 'My Profile', icon: '👤', path: profilePath },
    { label: 'Settings', icon: '⚙️', path: settingsPath },
  ]

  return (
    <header
      className="flex-shrink-0 flex items-center justify-between gap-4 px-4 md:px-6"
      style={{
        height: '64px',
        background: 'transparent',
        position: 'relative',
        zIndex: 50,
      }}
    >
      {/* Mobile Menu Toggle */}
      <button 
        onClick={onToggleMenu}
        className="flex lg:hidden items-center justify-center w-9 h-9 rounded-xl bg-white/40 border border-white/60 shadow-sm"
      >
        <span className="text-xl">☰</span>
      </button>

      {/* Search bar */}
      <div className="flex-1 hidden md:flex justify-center">
        <div
          className="flex items-center gap-2 w-full max-w-[440px] rounded-[12px] px-[16px] py-[8px] transition-all duration-200"
          style={{
            background: 'rgba(255, 255, 255, 0.4)',
            backdropFilter: 'blur(10px)',
            border: `1.5px solid ${searchFocused ? '#6c47ff' : 'rgba(255, 255, 255, 0.6)'}`,
          }}
        >
          <span style={{ fontSize: '14px', opacity: 0.5 }}>🔍</span>
          <input
            type="text"
            placeholder="Search candidates, roles, interviews..."
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="border-none bg-transparent text-[13px] outline-none w-full"
            style={{ fontFamily: "'Sora', sans-serif", color: 'var(--text)' }}
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 md:gap-3.5 flex-shrink-0">

        {/* Theme toggle */}
        <button
          onClick={() => setIsDark(!isDark)}
          className="w-[36px] h-[36px] rounded-[10px] flex items-center justify-center text-[16px] cursor-pointer transition-all duration-200 hover:scale-105 shadow-sm"
          style={{ 
            background: 'rgba(255,255,255,0.4)', 
            border: '1.5px solid rgba(255,255,255,0.6)',
            backdropFilter: 'blur(10px)'
          }}
        >
          {isDark ? '☀️' : '🌙'}
        </button>

        {/* Notifications */}
        <div className="relative">
          <NotificationBell />
        </div>

        {/* User avatar / menu */}
        <div className="relative ml-1">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-[36px] h-[36px] rounded-full flex items-center justify-center text-white text-[13px] font-black cursor-pointer transition-all duration-200 hover:scale-110 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #6c47ff, #ff6bc6)',
              boxShadow: '0 4px 12px rgba(108,71,255,0.3)',
            }}
          >
            {initials}
          </button>

          <AnimatePresence>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="absolute right-0 top-[46px] w-60 rounded-[18px] z-40 overflow-hidden py-2"
                  style={{
                    background: 'rgba(255, 255, 255, 0.85)',
                    border: '1px solid rgba(255, 255, 255, 0.5)',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                    backdropFilter: 'blur(20px)',
                  }}
                >
                  <div
                    className="px-5 py-4 mb-1"
                    style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}
                  >
                    <p className="text-[14px] font-bold text-gray-900 leading-tight">
                      {user?.full_name}
                    </p>
                    <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                      {user?.email}
                    </p>
                  </div>

                  {menuItems.map((item) => (
                    <button
                      key={item.label}
                      onClick={() => { setMenuOpen(false); navigate(item.path) }}
                      className="w-full flex items-center gap-3 px-5 py-2.5 text-[13px] font-bold text-gray-700 transition-all hover:bg-violet-50 hover:text-violet-600 group"
                    >
                      <span className="text-[16px] transition-transform group-hover:scale-110">{item.icon}</span>
                      {item.label}
                    </button>
                  ))}

                  <div className="mt-1 pt-1" style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                    <button
                      onClick={() => { setMenuOpen(false); logout() }}
                      className="w-full flex items-center gap-3 px-5 py-2.5 text-[13px] font-bold text-red-500 transition-all hover:bg-red-50"
                    >
                      <span className="text-[16px]">🚪</span>
                      Sign out
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}


