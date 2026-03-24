import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { FunnelData } from '@/types'

const COLORS = ['#94a3b8', '#60a5fa', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444']

export function FunnelChart({ data }: { data: FunnelData }) {
  const chartData = data.stages.map((s) => ({
    name: s.stage.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
    count: s.count,
    percentage: s.percentage,
  }))

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip
          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
          formatter={(value: number, name: string) => [value, 'Candidates']}
        />
        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
          {chartData.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
