import { useAuth } from '@/hooks/useAuth'
import { motion } from 'framer-motion'
import { useState } from 'react'

export default function InterviewerProfilePage() {
  const { user } = useAuth()
  const [isEditing, setIsEditing] = useState(false)

  const initials = user?.full_name
    ? user.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'I'

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>
          Interviewer Profile
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">Manage your personal information and panelist preferences.</p>
      </div>

      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-900 rounded-[32px] p-8 border border-gray-100 dark:border-gray-800 shadow-xl shadow-gray-100 dark:shadow-none overflow-hidden relative"
      >
        <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center md:items-start">
          {/* Avatar Area */}
          <div className="relative">
            <div 
              className="w-32 h-32 rounded-[40px] flex items-center justify-center text-white text-4xl font-black shadow-2xl"
              style={{ background: 'linear-gradient(135deg, #6c47ff, #ff6bc6)' }}
            >
              {initials}
            </div>
            <button className="absolute bottom-[-10px] right-[-10px] bg-white border border-gray-100 p-2.5 rounded-2xl shadow-lg hover:scale-110 transition-transform">
              📸
            </button>
          </div>

          {/* Info Area */}
          <div className="flex-1 space-y-6 text-center md:text-left">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{user?.full_name}</h2>
              <p className="text-violet-600 font-bold uppercase tracking-widest text-[11px]">{user?.role} · Panel Specialist</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 max-w-xl">
              <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter mb-1">Work Email</p>
                <p className="text-sm font-bold text-gray-700 dark:text-gray-300">{user?.email}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter mb-1">Interviewer ID</p>
                <p className="text-sm font-bold text-gray-700 dark:text-gray-300">#{user?.id?.slice(0, 8)}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 justify-center md:justify-start">
              <button 
                onClick={() => setIsEditing(!isEditing)}
                className="bg-[#6c47ff] text-white px-8 py-3 rounded-2xl text-sm font-black shadow-lg shadow-violet-200 hover:scale-105 active:scale-95 transition-transform"
              >
                {isEditing ? 'Save Changes' : 'Edit Profile'}
              </button>
              <button 
                onClick={() => alert('Calendar settings coming soon!')}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 px-8 py-3 rounded-2xl text-sm font-black hover:bg-gray-50 active:bg-gray-100 transition-all"
              >
                Sync Calendar
              </button>
            </div>
          </div>
        </div>

        {/* Decorative Blobs */}
        <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-violet-100 dark:bg-violet-900/20 rounded-full blur-3xl opacity-50" />
        <div className="absolute bottom-[-50px] left-[-30px] w-48 h-48 bg-pink-100 dark:bg-pink-900/20 rounded-full blur-3xl opacity-30" />
      </motion.div>

      {/* Stats / Performance Overview */}
      <div className="grid md:grid-cols-3 gap-6">
        {[
          { label: 'Interviews Conducted', val: '28', color: 'bg-blue-50 text-blue-600', icon: '🎤' },
          { label: 'Avg Rating Given', val: '3.9', color: 'bg-emerald-50 text-emerald-600', icon: '⭐' },
          { label: 'Scorecards Pending', val: '0', color: 'bg-orange-50 text-orange-600', icon: '📝' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white dark:bg-gray-900 p-6 rounded-[24px] border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-5"
          >
            <div className={`w-12 h-12 rounded-2xl ${stat.color} flex items-center justify-center text-xl`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</p>
              <p className="text-2xl font-black text-gray-900 dark:text-white leading-tight">{stat.val}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
