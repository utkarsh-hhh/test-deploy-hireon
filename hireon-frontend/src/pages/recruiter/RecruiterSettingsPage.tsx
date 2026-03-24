import { motion } from 'framer-motion'
import { useState } from 'react'

export default function RecruiterSettingsPage() {
  const [notifications, setNotifications] = useState(true)
  const [marketing, setMarketing] = useState(false)

  const handleAction = (label: string) => {
    console.log(`Setting action: ${label}`)
    // In a real app, this would open a modal or navigate
    alert(`${label} settings coming soon!`)
  }

  const sections = [
    {
      title: 'General',
      items: [
        { label: 'Account Email', sub: 'Change your login email address', icon: '📧' },
        { label: 'Security & Password', sub: 'Manage your authentication methods', icon: '🔒' },
        { label: 'Language', sub: 'English (US)', icon: '🌐' },
      ]
    },
    {
      title: 'Hiring Workflow',
      items: [
        { label: 'Custom Pipeline', sub: 'Configure default hiring stages', icon: '⚡' },
        { label: 'Scorecard Templates', sub: 'Manage interview evaluation forms', icon: '📋' },
        { label: 'Email Templates', sub: 'Configure automated reach-out sequences', icon: '✉️' },
      ]
    }
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10 select-none">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>
          Settings
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">Fine-tune your recruiting experience and account preferences.</p>
      </div>

      <div className="grid lg:grid-cols-[1fr_300px] gap-8">
        <div className="space-y-8">
          {sections.map((section, idx) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white dark:bg-gray-900 rounded-[32px] border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm"
            >
              <div className="px-8 py-5 bg-gray-50/50 dark:bg-gray-800/50 border-bottom border-gray-100 dark:border-gray-800">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">{section.title}</h3>
              </div>
              <div className="divide-y divide-gray-50 dark:divide-gray-800">
                {section.items.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => handleAction(item.label)}
                    className="w-full text-left px-8 py-5 flex items-center justify-between hover:bg-violet-50/50 dark:hover:bg-violet-900/20 active:bg-violet-100/50 transition-all group"
                  >
                    <div className="flex items-center gap-5">
                      <span className="text-xl group-hover:scale-125 transition-transform duration-300">{item.icon}</span>
                      <div>
                        <p className="text-[14px] font-bold text-gray-900 dark:text-gray-100">{item.label}</p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">{item.sub}</p>
                      </div>
                    </div>
                    <span className="text-gray-300 group-hover:text-violet-500 group-hover:translate-x-1 transition-all">→</span>
                  </button>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Sidebar / Toggles */}
        <div className="space-y-6">
          <div className="bg-[#6c47ff] rounded-[32px] p-8 text-white shadow-xl shadow-violet-200 dark:shadow-none relative overflow-hidden">
            <h4 className="text-[15px] font-black mb-6 relative z-10">Quick Toggles</h4>
            
            <div className="space-y-6 relative z-10">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold opacity-90">Email Alerts</span>
                <button 
                  onClick={() => setNotifications(!notifications)}
                  className={`w-10 h-5 rounded-full transition-all relative ${notifications ? 'bg-white' : 'bg-white/30'}`}
                >
                  <motion.div 
                    animate={{ x: notifications ? 20 : 0 }}
                    className={`absolute top-1 left-1 w-3 h-3 rounded-full ${notifications ? 'bg-[#6c47ff]' : 'bg-white'}`} 
                  />
                </button>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold opacity-90">Daily Digest</span>
                <button 
                  onClick={() => setMarketing(!marketing)}
                  className={`w-10 h-5 rounded-full transition-all relative ${marketing ? 'bg-white' : 'bg-white/30'}`}
                >
                  <motion.div 
                    animate={{ x: marketing ? 30 : 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className={`absolute top-1 left-1 w-3 h-3 rounded-full ${marketing ? 'bg-[#6c47ff]' : 'bg-white'}`} 
                  />
                </button>
              </div>
            </div>

            <div className="absolute top-[-20px] right-[-20px] w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[32px] p-6 text-center shadow-lg shadow-gray-50">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Need Help?</p>
            <p className="text-xs text-gray-500 font-medium mb-4">Contact our support 24/7</p>
            <button 
              onClick={() => handleAction('Support')}
              className="w-full bg-gray-900 dark:bg-gray-800 text-white py-3 rounded-2xl text-[12px] font-black hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md"
            >
              Contact Support
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
