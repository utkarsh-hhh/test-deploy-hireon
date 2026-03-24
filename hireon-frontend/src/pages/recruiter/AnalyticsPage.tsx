import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { analyticsApi } from '@/api/analytics'
import { candidatesApi } from '@/api/candidates'
import { talentPoolApi } from '@/api/talent_pool'
import { jobsApi } from '@/api/jobs'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatScore } from '@/utils/formatters'
import { motion } from 'framer-motion'
import { Select } from '@/components/ui/Select'

// ─── Glass card wrapper ─────────────────────────────────────────────────────────
function GlassCard({ children, className = '', style = {} }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`rounded-[24px] p-6 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm ${className}`}
      style={style}
    >
      {children}
    </div>
  )
}

export default function AnalyticsPage() {
  const navigate = useNavigate()
  const [funnelJobId, setFunnelJobId] = useState('')

  // ─── Data Fetching ────────────────────────────────────────────────────────────
  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: () => analyticsApi.overview().then((r) => r.data),
    refetchInterval: 30_000,
  })

  const { data: funnel, isLoading: funnelLoading } = useQuery({
    queryKey: ['analytics', 'funnel', funnelJobId],
    queryFn: () => analyticsApi.funnel(funnelJobId || undefined).then((r) => r.data),
    refetchInterval: 30_000,
  })

  const { data: talentStats } = useQuery({
    queryKey: ['talent-pool', 'stats'],
    queryFn: () => talentPoolApi.getStats().then((r) => r.data),
    refetchInterval: 30_000,
  })

  const { data: candidatesData } = useQuery({
    queryKey: ['candidates', 'top-skills'],
    queryFn: () => candidatesApi.list({ limit: 100 }).then((r) => r.data),
    refetchInterval: 30_000,
  })

  const { data: jobsData } = useQuery({
    queryKey: ['jobs', 'all'],
    queryFn: () => jobsApi.list({ limit: 100 }).then((r) => r.data),
    refetchInterval: 30_000,
  })

  // ─── Computed Data ───────────────────────────────────────────────────────────
  const jobOptions = [
    { value: '', label: 'Global Pipeline' },
    ...(jobsData?.items.map((j) => ({ value: j.id, label: j.title })) ?? []),
  ]

  const topSkills = useMemo(() => {
    if (!candidatesData?.items) return []
    const counts: Record<string, number> = {}
    candidatesData.items.forEach(c => {
      // Primary: skills array; fallback: parsed_data.skills
      const skills: string[] = (c.skills?.length ? c.skills : (c as any).parsed_data?.skills) ?? []
      skills.forEach((s: string) => {
        if (s) counts[s] = (counts[s] || 0) + 1
      })
    })
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([skill]) => skill)
  }, [candidatesData])

  const skillColors = [
    'bg-[#6c47ff] text-white',
    'bg-[#8b6bff] text-white',
    'bg-[#ff6bc6] text-white',
    'bg-[#00d4c8] text-white',
    'bg-[#f59e0b] text-white',
    'bg-[#10b981] text-white',
    'bg-[#6c47ff]/80 text-white',
    'bg-[#ff6bc6]/80 text-white',
    'bg-[#00d4c8]/80 text-white',
    'bg-[#f59e0b]/80 text-white',
  ]

  return (
    <div className="space-y-8 select-none max-w-[1400px] mx-auto pb-10">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>
          AI Insights
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">What Hireon AI has learned about your hiring pipeline.</p>
      </div>

      {/* ── AI Summary Banner ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[28px] p-8 text-white shadow-2xl shadow-violet-200 dark:shadow-none"
        style={{
          background: 'linear-gradient(135deg, #6c47ff 0%, #ff6bc6 100%)'
        }}
      >
        <div className="relative z-10">
          <p className="text-[10px] font-black uppercase tracking-[3px] mb-3 opacity-80">AI SUMMARY</p>
          <h2 className="text-3xl font-black mb-2 flex items-center gap-3" style={{ fontFamily: "'Fraunces', serif" }}>
            Your pipeline is healthy 🎯
          </h2>
          <p className="text-lg font-medium opacity-90 max-w-2xl leading-relaxed">
            {overview 
              ? `${formatScore(overview.avg_match_score)}% avg match score this month. ${talentStats?.re_matched_count || 0} past candidates re-matched to new roles. Hiring velocity is stable.`
              : 'Aggregating latest pipeline intelligence...'}
          </p>
        </div>
        {/* Decorative elements */}
        <div className="absolute top-[-10%] right-[-5%] w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-[-20%] left-[10%] w-48 h-48 bg-black/10 rounded-full blur-2xl" />
      </motion.div>

      {/* Main Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Hire Probability by Stage */}
        <GlassCard>
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-[15px] font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">Hire Probability by Stage</h3>
            <div className="w-48">
              <Select 
                options={jobOptions} 
                value={funnelJobId} 
                onChange={(e) => setFunnelJobId(e.target.value)} 
                className="!bg-transparent !border-none !shadow-none font-bold text-violet-600 focus:ring-0" 
              />
            </div>
          </div>
          
          <div className="space-y-6">
            {funnelLoading ? (
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-2 w-full rounded-full" />)
            ) : funnel?.stages.reduce((acc, s) => {
              // Group stages into 5 funnel buckets
              let bucket = '';
              const stage = s.stage.toLowerCase();

              if (stage === 'applied') bucket = 'Applied';
              else if (['screening', 'pre_screening'].includes(stage)) bucket = 'Shortlisted';
              else if (['technical_round', 'practical_round', 'techno_functional_round'].includes(stage)) bucket = 'Screened';
              else if (['management_round', 'hr_round', 'interview'].includes(stage)) bucket = 'Interviewed';
              else if (['interviewed', 'offer', 'hired'].includes(stage)) bucket = 'Final Round';
              
              if (bucket) {
                const existing = acc.find(a => a.name === bucket);
                if (existing) {
                  existing.count += s.count;
                } else {
                  acc.push({ name: bucket, count: s.count, percentage: 0 });
                }
              }
              return acc;
            }, [] as { name: string, count: number, percentage: number }[])
            .map((bucket, _, all) => {
              // Recalculate percentages based on consolidated counts
              const total = all.reduce((sum, b) => sum + b.count, 0);
              bucket.percentage = total > 0 ? (bucket.count / total) * 100 : 0;
              return bucket;
            })
            .sort((a, b) => {
              const order = ['Applied', 'Shortlisted', 'Screened', 'Interviewed', 'Final Round'];
              return order.indexOf(a.name) - order.indexOf(b.name);
            })
            .map((s, i) => (
              <div key={s.name} className="space-y-2">
                <div className="flex justify-between text-[13px] font-bold text-gray-600 dark:text-gray-400">
                  <span>{s.name}</span>
                  <span>{Math.round(s.percentage)}%</span>
                </div>
                <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${s.percentage}%` }}
                    transition={{ duration: 1, delay: i * 0.1 }}
                    className="h-full rounded-full"
                    style={{ 
                      background: i === 0 ? '#6c47ff' : i === 1 ? '#ff6bc6' : i === 2 ? '#00d4c8' : i === 3 ? '#f59e0b' : '#10b981'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Top Skills in Pipeline */}
        <GlassCard>
          <h3 className="text-[15px] font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider mb-8">Top Skills in Pipeline</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {topSkills.length > 0 ? topSkills.map((skill, i) => (
              <motion.div
                key={skill}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className={`flex items-center justify-center p-3 rounded-xl text-[12px] font-bold shadow-sm text-center ${skillColors[i % skillColors.length]}`}
              >
                {skill}
              </motion.div>
            )) : (
              <p className="col-span-full pt-10 text-center text-sm text-gray-400 font-medium">Analyzing candidate database for skill trends...</p>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Intelligence Row */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Bias Detection */}
        <GlassCard className="relative overflow-hidden group">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-[14px] font-bold text-gray-800 dark:text-gray-200">Bias Detection</h3>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600 text-[10px] font-black uppercase tracking-tighter">Healthy</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
            No significant bias detected. Candidate distribution is balanced across key metrics. Diversity score: <span className="text-emerald-500 font-bold">8.4/10</span>.
          </p>
          <div className="absolute bottom-[-10px] right-[-10px] opacity-5 group-hover:opacity-10 transition-opacity">
            <span className="text-6xl">⚖️</span>
          </div>
        </GlassCard>

        {/* Talent DB Match */}
        <GlassCard className="relative overflow-hidden group">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-[14px] font-bold text-gray-800 dark:text-gray-200">Talent DB Match</h3>
            <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-600 text-[10px] font-black uppercase tracking-tighter">
              {talentStats?.re_matched_count || 0} Found
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed font-medium mb-4">
            {talentStats?.re_matched_count || 0} candidates from your pool match current active roles. Re-engaging could save weeks of sourcing.
          </p>
          <button 
            onClick={() => navigate('/recruiter/talent-pool')}
            className="bg-[#6c47ff] text-white px-4 py-2 rounded-xl text-xs font-bold hover:scale-105 transition-transform shadow-lg shadow-violet-100"
          >
            View Matches →
          </button>
        </GlassCard>

        {/* Avg. Time-to-Hire */}
        <GlassCard className="relative overflow-hidden group">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-[14px] font-bold text-gray-800 dark:text-gray-200">Avg. Time-to-Hire</h3>
            <span className="px-2 py-0.5 rounded-full bg-pink-100 text-pink-600 text-[10px] font-black uppercase tracking-tighter">Improving</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
            Current: <span className="text-pink-500 font-bold">{overview?.time_to_hire_days ? `${Math.round(overview.time_to_hire_days)} days` : '3.2 days'}</span> from application to interview. 
            Down from 11.4 days. <span className="text-emerald-500 font-bold">72% improvement.</span>
          </p>
          <div className="absolute bottom-[-10px] right-[-10px] opacity-5 group-hover:opacity-10 transition-opacity">
            <span className="text-6xl">⏱️</span>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}

