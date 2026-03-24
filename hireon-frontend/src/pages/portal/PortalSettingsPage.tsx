import { motion } from 'framer-motion'
import { useState } from 'react'

export default function PortalSettingsPage() {
  const [emailAlerts, setEmailAlerts] = useState(true)
  const [smsAlerts, setSmsAlerts] = useState(false)

  const handleAction = (label: string) => {
    // In a real app, this would open a modal or navigate
    alert(`${label} coming soon!`)
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
      title: 'Privacy & Data',
      items: [
        { label: 'Profile Visibility', sub: 'Control who can view your resume', icon: '👁️' },
        { label: 'Data Export', sub: 'Download a copy of your application data', icon: '📥' },
        { label: 'Delete Account', sub: 'Permanently remove your account and data', icon: '🗑️' },
      ]
    }
  ]

  return (
    <div className="page active" id="page-settings">
      <div className="ph" style={{ marginBottom: 30 }}>
        <div className="pt">Settings ⚙️</div>
        <div className="ps">Manage your account preferences and security.</div>
      </div>

      <div className="grid lg:grid-cols-[1fr_300px] gap-8 px-8 max-w-5xl">
        <div className="space-y-8">
          {sections.map((section, idx) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm"
            >
              <div className="px-8 py-5 bg-gray-50/50 border-b border-gray-100">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">{section.title}</h3>
              </div>
              <div className="divide-y divide-gray-50">
                {section.items.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => handleAction(item.label)}
                    className="w-full text-left px-8 py-5 flex items-center justify-between hover:bg-violet-50/50 active:bg-violet-100/50 transition-all group"
                  >
                    <div className="flex items-center gap-5">
                      <span className="text-xl group-hover:scale-125 transition-transform duration-300">{item.icon}</span>
                      <div>
                        <p className="text-[14px] font-bold text-gray-900">{item.label}</p>
                        <p className="text-[11px] text-gray-500 font-medium">{item.sub}</p>
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
          <div className="bg-[#6c47ff] rounded-3xl p-8 text-white shadow-xl shadow-violet-200 relative overflow-hidden">
            <h4 className="text-[15px] font-black mb-6 relative z-10">Notification Preferences</h4>
            
            <div className="space-y-6 relative z-10">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold opacity-90">Email Alerts</span>
                <button 
                  onClick={() => setEmailAlerts(!emailAlerts)}
                  className={`w-10 h-5 rounded-full transition-all relative ${emailAlerts ? 'bg-white' : 'bg-white/30'}`}
                >
                  <motion.div 
                    animate={{ x: emailAlerts ? 20 : 0 }}
                    className={`absolute top-1 left-1 w-3 h-3 rounded-full ${emailAlerts ? 'bg-[#6c47ff]' : 'bg-white'}`} 
                  />
                </button>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold opacity-90">SMS Alerts</span>
                <button 
                  onClick={() => setSmsAlerts(!smsAlerts)}
                  className={`w-10 h-5 rounded-full transition-all relative ${smsAlerts ? 'bg-white' : 'bg-white/30'}`}
                >
                  <motion.div 
                    animate={{ x: smsAlerts ? 20 : 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className={`absolute top-1 left-1 w-3 h-3 rounded-full ${smsAlerts ? 'bg-[#6c47ff]' : 'bg-white'}`} 
                  />
                </button>
              </div>
            </div>

            <div className="absolute top-[-20px] right-[-20px] w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          </div>

          <div className="bg-white border border-gray-100 rounded-3xl p-6 text-center shadow-lg shadow-gray-50">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Need Help?</p>
            <p className="text-xs text-gray-500 font-medium mb-4">Contact our support 24/7</p>
            <button 
              onClick={() => handleAction('Support')}
              className="w-full bg-gray-900 text-white py-3 rounded-2xl text-[12px] font-black hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md"
            >
              Contact Support
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
