import { Link } from 'react-router-dom'
import { useState } from 'react'
import MouseTrail from '@/components/common/MouseTrail'

// ─── Data ──────────────────────────────────────────────────────────────────────

const stats = [
  { value: '80%', label: 'Reduction in resume screening time' },
  { value: '90%', label: 'Interview scheduling fully automated' },
  { value: '60%', label: 'Faster overall time-to-hire' },
  { value: '30h', label: 'HR hours saved every single week' },
]

const features = [
  {
    emoji: '🤖',
    color: 'rgba(108,71,255,0.12)',
    title: 'AI Resume Parsing',
    description: 'Instantly extract skills, experience, and key signals from any resume with state-of-the-art language models.',
  },
  {
    emoji: '🎯',
    color: 'rgba(255,107,198,0.12)',
    title: 'Smart Candidate Matching',
    description: 'Our AI scores every candidate against your job requirements and surfaces the best fits automatically.',
  },
  {
    emoji: '📋',
    color: 'rgba(0,212,200,0.12)',
    title: 'Visual Kanban Pipeline',
    description: 'Drag-and-drop candidates through custom stages. See your entire hiring funnel at a glance.',
  },
  {
    emoji: '📅',
    color: 'rgba(251,191,36,0.12)',
    title: 'Interview Scheduling',
    description: 'Schedule interviews, assign panelists, send meeting links, and collect structured scorecards — all in one place.',
  },
  {
    emoji: '📨',
    color: 'rgba(16,185,129,0.12)',
    title: 'Automated Offer Letters',
    description: 'Generate professional offer letters, send them digitally, and track acceptance without leaving Hireon.',
  },
  {
    emoji: '📊',
    color: 'rgba(108,71,255,0.10)',
    title: 'Analytics & Insights',
    description: 'Track time-to-hire, funnel conversion rates, interviewer performance, and more with rich dashboards.',
  },
]

const howItWorks = [
  {
    phase: 'Phase 01 — Intake',
    emoji: '🧠',
    title: 'AI Resume Intelligence',
    desc: "The moment a candidate uploads their resume, Hireon's AI engine kicks in. It parses the document, extracts explicit skills like React, Node.js and TypeScript, and infers hidden skills from context clues. Experience years are calculated precisely and seniority level is determined automatically.",
    tags: [
      { label: 'Skill Extraction' },
      { label: 'Experience Calc' },
      { label: 'Seniority Detection' },
      { label: '~10 seconds', color: 'teal' as const },
    ],
  },
  {
    phase: 'Phase 02 — Scoring',
    emoji: '🎯',
    title: 'Smart Auto-Shortlisting',
    desc: "Hireon compares each candidate's profile against your requirements and generates a precise match score. If a candidate clears your threshold, they're instantly shortlisted, their status updated, your HR team notified, and the candidate gets an automated email — all without a single human action.",
    tags: [
      { label: 'Match Scoring' },
      { label: 'Auto-Shortlist' },
      { label: 'HR Notification', color: 'pink' as const },
      { label: 'Fully Automated', color: 'teal' as const },
    ],
  },
  {
    phase: 'Phase 03 — Scheduling',
    emoji: '📅',
    title: 'Conflict-Free Scheduling',
    desc: "One click. Hireon cross-references the candidate's availability, the interviewer's calendar, and checks for existing bookings. It selects the optimal slot, generates a Google Meet link, and dispatches calendar invites to everyone involved. What used to take 15 emails and 3 days now takes 30 seconds.",
    tags: [
      { label: 'Slot Matching' },
      { label: 'Conflict Detection' },
      { label: 'Meet Link', color: 'pink' as const },
      { label: '30 seconds', color: 'teal' as const },
    ],
  },
  {
    phase: 'Phase 04 — Decision',
    emoji: '📊',
    title: 'Interview Intelligence & Hiring',
    desc: "Post-interview, the interviewer submits structured feedback. Hireon's AI analyzes it, generates a summary, updates the hire probability score, and surfaces a hiring recommendation to HR. Every decision is data-backed. Every candidate is stored permanently in your searchable talent database for future roles.",
    tags: [
      { label: 'Feedback Analysis' },
      { label: 'Hire Probability' },
      { label: 'Talent Database', color: 'pink' as const },
      { label: 'AI Recommendation', color: 'teal' as const },
    ],
  },
]

const testimonials = [
  {
    quote: 'Hireon cut our screening time by 80%. We went from 2 weeks to 2 days for first-round shortlists.',
    name: 'Priya Sharma',
    role: 'Head of Talent @ Finlytic',
    initials: 'PS',
    gradient: 'linear-gradient(135deg, #ddd6fe, #a78bfa)',
  },
  {
    quote: "The AI match scores are eerily accurate. We haven't made a bad hire since switching to Hireon.",
    name: 'Marcus Chen',
    role: 'Engineering Manager @ Orbitalync',
    initials: 'MC',
    gradient: 'linear-gradient(135deg, #fce7f3, #f9a8d4)',
  },
  {
    quote: 'The pipeline view is a game-changer. My whole team knows exactly where every candidate stands.',
    name: 'Aisha Okonkwo',
    role: 'Talent Lead @ Nexlayer',
    initials: 'AO',
    gradient: 'linear-gradient(135deg, #d1fae5, #6ee7b7)',
  },
]

const pricing = [
  {
    name: 'Starter',
    price: '$0',
    period: 'Free forever',
    desc: 'Perfect for early-stage teams.',
    features: ['Up to 5 active jobs', '50 candidate profiles', 'AI resume parsing', 'Basic pipeline', 'Email support'],
    cta: 'Get Started Free',
    featured: false,
  },
  {
    name: 'Growth',
    price: '$79',
    period: 'per month',
    desc: 'For growing recruitment teams.',
    features: ['Unlimited jobs', 'Unlimited candidates', 'Advanced AI matching', 'Kanban pipeline', 'Interview scheduling', 'Offer letters', 'Analytics dashboard'],
    cta: 'Start Free Trial',
    featured: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: 'Contact us',
    desc: 'For large organisations.',
    features: ['Everything in Growth', 'Custom AI models', 'SSO / SAML', 'SLA & uptime guarantee', 'Dedicated success manager', 'Custom integrations'],
    cta: 'Talk to Sales',
    featured: false,
  },
]

const faqs = [
  {
    q: 'How accurate is the AI matching?',
    a: 'Our AI achieves ~90% precision on role-specific matching across 500+ job categories. It continuously improves as your team rates candidates.',
  },
  {
    q: 'Can I import existing candidates?',
    a: 'Yes. Upload a CSV or paste LinkedIn profiles — Hireon parses and enriches them automatically.',
  },
  {
    q: 'Is my data secure?',
    a: 'All data is encrypted at rest (AES-256) and in transit (TLS 1.3). We are SOC 2 Type II compliant.',
  },
  {
    q: 'Does Hireon integrate with our ATS?',
    a: 'We offer native integrations with Greenhouse, Lever, and Workday — plus a REST API for custom connections.',
  },
  {
    q: 'Can I try it before paying?',
    a: 'Absolutely. The Starter plan is free forever. Growth and Enterprise come with a 14-day free trial, no credit card required.',
  },
]

// ─── FAQ Item ──────────────────────────────────────────────────────────────────
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div
      className="rounded-[16px] overflow-hidden transition-all duration-200"
      style={{
        background: 'rgba(255,255,255,0.72)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.95)',
        boxShadow: '0 4px 20px rgba(108,71,255,0.06)',
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
      >
        <span className="text-[15px] font-600 text-text-dark">{q}</span>
        <span
          className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white text-lg font-bold transition-transform duration-200"
          style={{
            background: 'linear-gradient(135deg, #6c47ff, #8b6bff)',
            transform: open ? 'rotate(45deg)' : 'rotate(0deg)',
          }}
        >
          +
        </span>
      </button>
      {open && (
        <div className="px-6 pb-5 text-[14px] leading-relaxed" style={{ color: 'var(--text-mid)' }}>
          {a}
        </div>
      )}
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="min-h-screen relative" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <MouseTrail />
      {/* Background blobs */}
      <div className="blob-bg">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
        <div className="blob blob-4" />
      </div>

      {/* ── NAV ── */}
      <nav
        className="fixed z-[200] flex items-center justify-between gap-6"
        style={{
          top: '18px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'calc(100% - 64px)',
          maxWidth: '1200px',
          padding: '14px 24px',
          background: 'rgba(255,255,255,0.75)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          border: '1px solid rgba(255,255,255,0.95)',
          borderRadius: '20px',
          boxShadow: '0 8px 40px rgba(108,71,255,0.10), 0 1px 0 rgba(255,255,255,0.8) inset',
        }}
      >
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 no-underline">
          <div className="relative w-[38px] h-[38px] flex items-center justify-center">
            <span
              className="absolute inset-[-7px] rounded-full border border-dashed"
              style={{
                borderColor: 'rgba(108,71,255,0.4)',
                animation: 'orbit-spin 5s linear infinite',
              }}
            >
              <span
                className="absolute top-[-4px] left-1/2 -translate-x-1/2 w-[7px] h-[7px] rounded-full"
                style={{ background: '#00d4c8', boxShadow: '0 0 8px rgba(0,212,200,0.9), 0 0 16px rgba(0,212,200,0.5)' }}
              />
            </span>
            <span
              className="relative w-[38px] h-[38px] rounded-[11px] flex items-center justify-center overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #6c47ff, #ff6bc6)', boxShadow: '0 4px 14px rgba(108,71,255,0.35)' }}
            >
              <span className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.2), transparent 60%)' }} />
              {/* Hireon 'H' mark logo — matches HTML demo */}
              <svg className="relative z-10" width="22" height="22" viewBox="0 0 22 22" fill="none">
                <rect x="2" y="3" width="4" height="16" rx="2" fill="white" opacity="0.95" />
                <rect x="16" y="3" width="4" height="16" rx="2" fill="white" opacity="0.95" />
                <rect x="2" y="9" width="18" height="4" rx="2" fill="white" opacity="0.95" />
              </svg>
            </span>
          </div>
          <span
            className="text-[20px] font-extrabold"
            style={{
              background: 'linear-gradient(135deg, #6c47ff, #ff6bc6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Hireon
          </span>
        </Link>

        {/* Nav links */}
        <ul className="hidden md:flex items-center gap-1 list-none m-0 p-0">
          {['Features', 'How it works', 'Pricing', 'FAQ'].map((item) => (
            <li key={item}>
              <a
                href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                className="block px-4 py-2 text-[14px] font-medium rounded-[10px] no-underline transition-all duration-200 hover:bg-[rgba(108,71,255,0.07)]"
                style={{ color: 'var(--text-mid)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#6c47ff')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-mid)')}
              >
                {item}
              </a>
            </li>
          ))}
        </ul>

        {/* CTA buttons */}
        <div className="flex items-center gap-2">
          <Link to="/login">
            <button
              className="px-[18px] py-[9px] bg-transparent border rounded-[10px] text-[14px] font-semibold cursor-pointer transition-all duration-200 hover:bg-[rgba(108,71,255,0.06)]"
              style={{ borderColor: 'rgba(108,71,255,0.25)', color: '#6c47ff', fontFamily: "'Sora', sans-serif" }}
            >
              Sign In
            </button>
          </Link>
          <Link to="/register">
            <button
              className="px-[22px] py-[9px] border-0 rounded-[10px] text-[14px] font-semibold text-white cursor-pointer transition-all duration-200 hover:-translate-y-[1px]"
              style={{
                background: 'linear-gradient(135deg, #6c47ff, #8b6bff)',
                boxShadow: '0 4px 16px rgba(108,71,255,0.35)',
                fontFamily: "'Sora', sans-serif",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 24px rgba(108,71,255,0.45)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(108,71,255,0.35)' }}
            >
              Get Started Free
            </button>
          </Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section
        className="relative z-10 min-h-screen flex flex-col items-center justify-center text-center"
        style={{ padding: '150px 48px 100px' }}
      >
        {/* Badge */}
        <div
          className="inline-flex items-center gap-2 mb-8 px-5 py-2 rounded-full text-[12px] font-semibold"
          style={{
            background: 'rgba(255,255,255,0.72)',
            border: '1px solid rgba(255,255,255,0.95)',
            backdropFilter: 'blur(12px)',
            color: '#6c47ff',
            boxShadow: '0 4px 16px rgba(108,71,255,0.08)',
            animation: 'fadeUp 0.6s ease both',
          }}
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{
              background: 'linear-gradient(135deg, #6c47ff, #ff6bc6)',
              boxShadow: '0 0 0 3px rgba(108,71,255,0.2)',
              animation: 'pulse-glow 2s infinite',
            }}
          />
          AI-Powered Recruiting Platform
        </div>

        {/* Headline */}
        <h1
          className="font-black leading-[1.0] mb-7 max-w-[1000px]"
          style={{
            fontFamily: "'Fraunces', serif",
            fontSize: 'clamp(48px, 7.5vw, 108px)',
            letterSpacing: '-2px',
            animation: 'fadeUp 0.6s 0.1s ease both',
            color: 'var(--text)',
          }}
        >
          Hire on{' '}
          <span
            style={{
              background: 'linear-gradient(135deg, #6c47ff 0%, #ff6bc6 50%, #00d4c8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Autopilot
          </span>
          .
        </h1>

        {/* Subheadline */}
        <p
          className="text-[18px] leading-[1.75] max-w-[600px] mb-14"
          style={{
            color: 'var(--text-mid)',
            animation: 'fadeUp 0.6s 0.2s ease both',
          }}
        >
          Hireon uses AI to parse resumes, score candidates, manage your pipeline, and close the best talent — in a fraction of the time.
        </p>

        {/* CTA buttons */}
        <div
          className="flex gap-3.5 justify-center mb-8"
          style={{ animation: 'fadeUp 0.6s 0.3s ease both' }}
        >
          <Link to="/register">
            <button
              className="px-10 py-4 border-0 rounded-[10px] text-[15px] font-semibold text-white cursor-pointer transition-all duration-300 relative overflow-hidden hover:-translate-y-[3px]"
              style={{
                background: 'linear-gradient(135deg, #6c47ff, #8b6bff)',
                boxShadow: '0 8px 28px rgba(108,71,255,0.38)',
                fontFamily: "'Sora', sans-serif",
              }}
            >
              Start for Free →
            </button>
          </Link>
          <Link to="/login">
            <button
              className="px-10 py-4 rounded-[10px] text-[15px] font-semibold cursor-pointer transition-all duration-300 hover:bg-white hover:-translate-y-[2px]"
              style={{
                background: 'rgba(255,255,255,0.72)',
                border: '1px solid rgba(255,255,255,0.6)',
                backdropFilter: 'blur(12px)',
                color: 'var(--text)',
                fontFamily: "'Sora', sans-serif",
              }}
            >
              Sign In
            </button>
          </Link>
        </div>

        {/* Trust row */}
        <div
          className="flex items-center gap-3 text-[13px]"
          style={{ color: 'var(--text-light)', animation: 'fadeUp 0.6s 0.4s ease both' }}
        >
          <div className="flex">
            {[
              'linear-gradient(135deg, #a78bfa, #6c47ff)',
              'linear-gradient(135deg, #f9a8d4, #ff6bc6)',
              'linear-gradient(135deg, #5eead4, #00d4c8)',
              'linear-gradient(135deg, #fde68a, #fbbf24)',
            ].map((bg, i) => (
              <span
                key={i}
                className="w-[30px] h-[30px] rounded-full border-2 border-white flex items-center justify-center text-[11px] text-white font-bold"
                style={{ background: bg, marginLeft: i === 0 ? 0 : '-8px', boxShadow: '0 2px 8px rgba(108,71,255,0.2)' }}
              >
                {['A', 'B', 'C', 'D'][i]}
              </span>
            ))}
          </div>
          <span>Trusted by 500+ recruiting teams worldwide</span>
        </div>

        {/* Dashboard preview mockup */}
        <div className="mt-20 w-full max-w-[1000px] relative" style={{ animation: 'fadeUp 0.8s 0.5s ease both' }}>
          {/* Glow */}
          <div className="absolute pointer-events-none" style={{ inset: '-60px', background: 'radial-gradient(ellipse at 50% 40%, rgba(108,71,255,0.18), transparent 65%)' }} />
          {/* Dashboard card */}
          <div
            className="relative z-10 rounded-[24px] overflow-hidden"
            style={{
              background: 'rgba(255,255,255,0.88)',
              backdropFilter: 'blur(24px) saturate(180%)',
              border: '1px solid rgba(255,255,255,0.95)',
              boxShadow: '0 40px 100px rgba(108,71,255,0.14), 0 1px 0 rgba(255,255,255,0.9) inset',
            }}
          >
            {/* Top bar */}
            <div className="flex items-center gap-2.5 px-5 py-3.5" style={{ background: 'rgba(248,245,255,0.9)', borderBottom: '1px solid rgba(108,71,255,0.07)' }}>
              <div className="flex gap-1.5">
                <span className="w-[11px] h-[11px] rounded-full bg-[#ff5f57]" />
                <span className="w-[11px] h-[11px] rounded-full bg-[#febc2e]" />
                <span className="w-[11px] h-[11px] rounded-full bg-[#28c840]" />
              </div>
              <div className="flex gap-0.5 ml-5">
                {['Dashboard', 'Candidates', 'Analytics'].map((tab, i) => (
                  <div
                    key={tab}
                    className="px-3.5 py-1.5 rounded-[8px] text-[12px] font-medium cursor-pointer"
                    style={{
                      background: i === 0 ? 'rgba(255,255,255,0.72)' : 'transparent',
                      color: i === 0 ? '#6c47ff' : 'var(--text-light)',
                      boxShadow: i === 0 ? '0 2px 8px rgba(108,71,255,0.1)' : 'none',
                    }}
                  >{tab}</div>
                ))}
              </div>
              <div className="flex-1 mx-4 rounded-[8px] px-3.5 py-1.5 text-[12px] text-center" style={{ background: 'rgba(108,71,255,0.05)', color: 'var(--text-light)' }}>
                app.hireon.ai/dashboard
              </div>
            </div>

            {/* Body */}
            <div className="flex" style={{ minHeight: '460px' }}>
              {/* Sidebar */}
              <div className="w-[220px] flex-shrink-0 p-3 flex flex-col" style={{ background: 'rgba(248,245,255,0.7)', borderRight: '1px solid rgba(108,71,255,0.07)' }}>
                <p className="text-[10px] font-bold tracking-[1.5px] uppercase px-3 pt-3 pb-1" style={{ color: 'var(--text-light)' }}>Main</p>
                {[{ icon: '🏠', label: 'Dashboard', active: true }, { icon: '👥', label: 'Candidates' }, { icon: '📋', label: 'Job Roles' }, { icon: '📅', label: 'Interviews' }].map((item) => (
                  <div key={item.label} className="flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-[13px] cursor-pointer" style={{ background: item.active ? 'rgba(108,71,255,0.10)' : 'transparent', color: item.active ? '#6c47ff' : 'var(--text-mid)', fontWeight: item.active ? 600 : 500 }}>
                    <span className="text-[16px] w-6 text-center">{item.icon}</span>{item.label}
                  </div>
                ))}
                <p className="text-[10px] font-bold tracking-[1.5px] uppercase px-3 pt-3 pb-1" style={{ color: 'var(--text-light)' }}>Intelligence</p>
                {[{ icon: '📊', label: 'Analytics' }, { icon: '🧠', label: 'AI Insights' }, { icon: '💾', label: 'Talent DB' }].map((item) => (
                  <div key={item.label} className="flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-[13px] cursor-pointer" style={{ color: 'var(--text-mid)', fontWeight: 500 }}>
                    <span className="text-[16px] w-6 text-center">{item.icon}</span>{item.label}
                  </div>
                ))}
                <p className="text-[10px] font-bold tracking-[1.5px] uppercase px-3 pt-3 pb-1" style={{ color: 'var(--text-light)' }}>Settings</p>
                {[{ icon: '⚙️', label: 'Settings' }, { icon: '👤', label: 'Team' }].map((item) => (
                  <div key={item.label} className="flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-[13px] cursor-pointer" style={{ color: 'var(--text-mid)', fontWeight: 500 }}>
                    <span className="text-[16px] w-6 text-center">{item.icon}</span>{item.label}
                  </div>
                ))}
              </div>

              {/* Main content */}
              <div className="flex-1 p-6 overflow-hidden">
                {/* Stat cards row */}
                <div className="grid grid-cols-4 gap-3.5 mb-5">
                  {[
                    { icon: '📥', num: '1,247', label: 'Resumes Processed' },
                    { icon: '✅', num: '342', label: 'Auto-Shortlisted' },
                    { icon: '📅', num: '89', label: 'Interviews Booked' },
                    { icon: '🎉', num: '24', label: 'Hires Made' },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-[16px] p-4 transition-all duration-300 hover:-translate-y-0.5" style={{ background: 'white', border: '1px solid rgba(108,71,255,0.07)', boxShadow: '0 2px 8px rgba(108,71,255,0.05)' }}>
                      <span className="text-[20px] block mb-2">{stat.icon}</span>
                      <span className="block text-[26px] font-bold leading-none" style={{ color: 'var(--text)' }}>{stat.num}</span>
                      <div className="text-[11px] mt-1 font-medium" style={{ color: 'var(--text-light)' }}>{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* Mid row: funnel + candidates */}
                <div className="grid grid-cols-2 gap-3.5 mb-5">
                  {/* Hiring Funnel */}
                  <div className="rounded-[16px] p-5" style={{ background: 'white', border: '1px solid rgba(108,71,255,0.07)' }}>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>Hiring Funnel</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(108,71,255,0.08)', color: '#6c47ff' }}>This Month</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      {[
                        { label: 'Applied', width: '100%', val: '1,247', bg: 'linear-gradient(90deg,#6c47ff,#8b6bff)' },
                        { label: 'Shortlisted', width: '27%', val: '342', bg: 'linear-gradient(90deg,#8b6bff,#ff6bc6)' },
                        { label: 'Interviewed', width: '7%', val: '89', bg: 'linear-gradient(90deg,#ff6bc6,#ff9dd7)' },
                        { label: 'Hired', width: '2%', val: '24', bg: 'linear-gradient(90deg,#00d4c8,#5eead4)' },
                      ].map((row) => (
                        <div key={row.label} className="flex items-center gap-2.5">
                          <span className="text-[11px] w-[80px] text-right flex-shrink-0" style={{ color: 'var(--text-mid)' }}>{row.label}</span>
                          <div className="flex-1 h-[10px] rounded-full overflow-hidden" style={{ background: 'rgba(108,71,255,0.06)' }}>
                            <div className="h-full rounded-full" style={{ width: row.width, background: row.bg }} />
                          </div>
                          <span className="text-[11px] font-semibold w-10 flex-shrink-0" style={{ color: 'var(--text)' }}>{row.val}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recent Candidates */}
                  <div className="rounded-[16px] p-5" style={{ background: 'white', border: '1px solid rgba(108,71,255,0.07)' }}>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>Recent Candidates</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(108,71,255,0.08)', color: '#6c47ff' }}>Live</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      {[
                        { av: '👩‍💻', avBg: 'linear-gradient(135deg,#ddd6fe,#a78bfa)', name: 'Sarah Chen', role: 'Senior React Dev · 6.5y', score: '87%', scoreBg: '#d1fae5', scoreColor: '#065f46' },
                        { av: '👨‍💼', avBg: 'linear-gradient(135deg,#fce7f3,#f9a8d4)', name: 'Marcus Reid', role: 'React Dev · 5.2y', score: '81%', scoreBg: '#d1fae5', scoreColor: '#065f46' },
                        { av: '🧑‍💻', avBg: 'linear-gradient(135deg,#d1fae5,#6ee7b7)', name: 'Priya Nair', role: 'Frontend Eng · 4y', score: 'New', scoreBg: 'rgba(108,71,255,0.10)', scoreColor: '#6c47ff' },
                      ].map((c) => (
                        <div key={c.name} className="flex items-center gap-3 p-2 rounded-[10px] cursor-pointer transition-all hover:bg-[rgba(108,71,255,0.04)]">
                          <div className="w-[34px] h-[34px] rounded-full flex-shrink-0 flex items-center justify-center text-[15px]" style={{ background: c.avBg }}>{c.av}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>{c.name}</p>
                            <p className="text-[11px]" style={{ color: 'var(--text-light)' }}>{c.role}</p>
                          </div>
                          <span className="text-[12px] font-bold px-2.5 py-0.5 rounded-full flex-shrink-0" style={{ background: c.scoreBg, color: c.scoreColor }}>{c.score}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Score rings */}
                <div className="rounded-[16px] p-5" style={{ background: 'white', border: '1px solid rgba(108,71,255,0.07)' }}>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>Average AI Scores</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(108,71,255,0.08)', color: '#6c47ff' }}>All Roles</span>
                  </div>
                  <div className="flex items-center justify-center gap-6">
                    {[
                      { pct: '87%', offset: 34, g1: '#6c47ff', g2: '#8b6bff', label: 'Match Score' },
                      { pct: '82%', offset: 47, g1: '#ff6bc6', g2: '#ff9dd7', label: 'Hire Probability' },
                      { pct: '90%', offset: 26, g1: '#00d4c8', g2: '#5eead4', label: 'Skills Accuracy' },
                      { pct: '40%', offset: 158, g1: '#fbbf24', g2: '#fde68a', label: 'Offer Rate' },
                    ].map((ring, i) => (
                      <div key={ring.label} className="text-center">
                        <svg width="80" height="80" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                          <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(108,71,255,0.08)" strokeWidth="8" />
                          <circle cx="50" cy="50" r="42" fill="none" stroke={`url(#rg${i})`} strokeWidth="8" strokeLinecap="round" strokeDasharray="263.9" strokeDashoffset={ring.offset} />
                          <defs>
                            <linearGradient id={`rg${i}`} x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor={ring.g1} />
                              <stop offset="100%" stopColor={ring.g2} />
                            </linearGradient>
                          </defs>
                          <text x="50" y="56" textAnchor="middle" fill="var(--text)" fontFamily="'Sora',sans-serif" fontWeight="700" fontSize="16" transform="rotate(90 50 50)">{ring.pct}</text>
                        </svg>
                        <p className="text-[11px] mt-1.5" style={{ color: 'var(--text-light)' }}>{ring.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="relative z-10 py-20 px-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {stats.map((s) => (
            <div
              key={s.label}
              className="group relative rounded-[24px] p-10 text-center overflow-hidden transition-all duration-300 hover:-translate-y-[6px]"
              style={{
                background: 'rgba(255,255,255,0.72)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.95)',
                boxShadow: '0 8px 40px rgba(108,71,255,0.10)',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = '0 20px 60px rgba(108,71,255,0.18)'; (e.currentTarget as HTMLElement).style.background = 'white' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 40px rgba(108,71,255,0.10)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.72)' }}
            >
              {/* Top border slide-in */}
              <div
                className="absolute top-0 left-0 right-0 h-[3px] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-[400ms]"
                style={{ background: 'linear-gradient(90deg, #6c47ff, #ff6bc6)' }}
              />
              <span
                className="block font-black leading-none mb-3"
                style={{
                  fontFamily: "'Fraunces', serif",
                  fontSize: '60px',
                  background: 'linear-gradient(135deg, #6c47ff, #ff6bc6)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {s.value}
              </span>
              <p className="text-[14px] font-medium" style={{ color: 'var(--text-mid)', lineHeight: 1.5 }}>{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="relative z-10 py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-20">
            <p className="text-[12px] font-bold tracking-[2px] uppercase mb-4" style={{ color: 'var(--violet)' }}>How It Works</p>
            <h2
              className="font-black leading-tight mb-5"
              style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(36px,5vw,60px)', color: 'var(--text)', letterSpacing: '-1px' }}
            >
              From application to offer,<br />
              <span style={{ background: 'linear-gradient(135deg, #6c47ff, #ff6bc6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                all automated.
              </span>
            </h2>
            <p className="text-[17px] max-w-[560px] mx-auto" style={{ color: 'var(--text-mid)', lineHeight: 1.7 }}>
              Four intelligent phases that take a candidate from resume submission to hiring decision — with AI doing the heavy lifting at every step.
            </p>
          </div>

          {/* Timeline */}
          <div className="relative">
            {/* Center line */}
            <div
              className="absolute left-1/2 top-0 bottom-0 w-[2px] -translate-x-1/2 rounded-sm hidden md:block"
              style={{ background: 'linear-gradient(180deg, #6c47ff, #ff6bc6, #00d4c8)' }}
            />

            {howItWorks.map((step, i) => (
              <div
                key={step.phase}
                className={`relative flex gap-0 md:gap-[60px] mb-[60px] items-start ${i % 2 === 1 ? 'md:flex-row-reverse' : ''}`}
              >
                {/* Content card */}
                <div
                  className="flex-1 rounded-[24px] p-9 transition-all duration-300 hover:-translate-y-1"
                  style={{
                    background: 'rgba(255,255,255,0.72)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255,255,255,0.95)',
                    boxShadow: '0 8px 40px rgba(108,71,255,0.10)',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = '0 20px 60px rgba(108,71,255,0.18)'; (e.currentTarget as HTMLElement).style.background = 'white' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 40px rgba(108,71,255,0.10)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.72)' }}
                >
                  <p className="text-[11px] font-bold tracking-[2px] uppercase mb-3" style={{ color: 'var(--violet)' }}>{step.phase}</p>
                  <h3 className="text-[20px] font-bold mb-3" style={{ color: 'var(--text)' }}>{step.title}</h3>
                  <p className="text-[14px] leading-[1.7] mb-5" style={{ color: 'var(--text-mid)' }}>{step.desc}</p>
                  <div className="flex flex-wrap gap-2">
                    {step.tags.map((tag) => (
                      <span
                        key={tag.label}
                        className="px-3 py-1 rounded-full text-[11px] font-semibold"
                        style={
                          tag.color === 'pink'
                            ? { background: 'rgba(255,107,198,0.10)', color: '#ff6bc6' }
                            : tag.color === 'teal'
                            ? { background: 'rgba(0,212,200,0.10)', color: '#00d4c8' }
                            : { background: 'rgba(108,71,255,0.08)', color: 'var(--violet)' }
                        }
                      >
                        {tag.label}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Spacer (desktop only) */}
                <div className="flex-1 hidden md:block" />

                {/* Center dot */}
                <div
                  className="absolute left-1/2 -translate-x-1/2 top-6 w-[52px] h-[52px] rounded-full flex items-center justify-center text-[22px] z-10 hidden md:flex"
                  style={{
                    background: 'linear-gradient(135deg, #6c47ff, #ff6bc6)',
                    boxShadow: '0 0 0 6px var(--bg), 0 4px 16px rgba(108,71,255,0.35)',
                  }}
                >
                  {step.emoji}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="relative z-10 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[12px] font-bold tracking-[2px] uppercase mb-4" style={{ color: 'var(--violet)' }}>CAPABILITIES</p>
            <h2
              className="font-black leading-tight mb-4"
              style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(36px,5vw,56px)', color: 'var(--text)', letterSpacing: '-1px' }}
            >
              Everything you need to build great teams
            </h2>
            <p className="text-[17px] max-w-xl mx-auto" style={{ color: 'var(--text-mid)' }}>
              From sourcing to onboarding, Hireon handles the entire recruitment lifecycle.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-[20px] p-7 transition-all duration-300 hover:-translate-y-1"
                style={{
                  background: 'rgba(255,255,255,0.72)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255,255,255,0.95)',
                  boxShadow: '0 4px 24px rgba(108,71,255,0.06)',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = '0 16px 48px rgba(108,71,255,0.14)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 24px rgba(108,71,255,0.06)' }}
              >
                <span
                  className="text-3xl w-14 h-14 rounded-[14px] flex items-center justify-center mb-5"
                  style={{ background: f.color }}
                >
                  {f.emoji}
                </span>
                <h3 className="text-[16px] font-bold mb-2" style={{ color: 'var(--text)' }}>{f.title}</h3>
                <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-mid)' }}>{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div
            className="rounded-[32px] p-16 text-center relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #6c47ff 0%, #ff6bc6 60%, #00d4c8 100%)' }}
          >
            {/* Glow overlay */}
            <div
              className="absolute inset-0 opacity-30"
              style={{ background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.3), transparent 70%)' }}
            />
            <div className="relative z-10">
              <h2
                className="font-black leading-tight text-white mb-4"
                style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(32px,5vw,52px)', letterSpacing: '-1px' }}
              >
                Ready to hire on autopilot?
              </h2>
              <p className="text-[17px] mb-10 max-w-lg mx-auto" style={{ color: 'rgba(255,255,255,0.85)' }}>
                Join 500+ companies that use Hireon to find and hire exceptional talent faster than ever before.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/register">
                  <button
                    className="px-10 py-4 rounded-[10px] text-[15px] font-semibold text-violet-600 bg-white cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-lg"
                    style={{ fontFamily: "'Sora', sans-serif" }}
                  >
                    Create Free Account
                  </button>
                </Link>
                <Link to="/login">
                  <button
                    className="px-10 py-4 rounded-[10px] text-[15px] font-semibold text-white cursor-pointer transition-all hover:-translate-y-0.5"
                    style={{ border: '1.5px solid rgba(255,255,255,0.4)', background: 'transparent', fontFamily: "'Sora', sans-serif" }}
                  >
                    Sign In
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer
        className="relative z-10 py-16 px-6"
        style={{ borderTop: '1px solid rgba(108,71,255,0.10)' }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-3 mb-4">
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
                <span className="logo-wordmark lwl" style={{ fontSize: '18px' }}>Hireon</span>
              </div>
              <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-mid)' }}>
                AI-powered recruiting platform that helps teams hire faster and smarter.
              </p>
            </div>

            {/* Links */}
            {[
              { heading: 'Product', links: ['Features', 'Pricing', 'Changelog', 'Roadmap'] },
              { heading: 'Company', links: ['About', 'Blog', 'Careers', 'Press'] },
              { heading: 'Legal', links: ['Privacy', 'Terms', 'Security', 'Cookies'] },
            ].map((col) => (
              <div key={col.heading}>
                <h4 className="text-[12px] font-bold uppercase tracking-[1.5px] mb-4" style={{ color: 'var(--text-light)' }}>
                  {col.heading}
                </h4>
                <ul className="space-y-2">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a
                        href="#"
                        className="text-[13px] no-underline transition-colors hover:text-violet-600"
                        style={{ color: 'var(--text-mid)' }}
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div
            className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 text-[12px]"
            style={{ borderTop: '1px solid rgba(108,71,255,0.08)', color: 'var(--text-light)' }}
          >
            <span>&copy; {new Date().getFullYear()} Hireon. All rights reserved.</span>
            <span>Powered by AI &mdash; Built with ❤️</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
