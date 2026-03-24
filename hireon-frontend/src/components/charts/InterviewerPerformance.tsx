import type { InterviewerPerformance } from '@/types'
import { Avatar } from '@/components/ui/Avatar'

export function InterviewerPerformanceTable({ data }: { data: InterviewerPerformance[] }) {
  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-800">
      {data.map((row) => (
        <div key={row.interviewer_id} className="flex items-center gap-3 py-3">
          <Avatar name={row.interviewer_name} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {row.interviewer_name}
            </p>
          </div>
          <div className="text-right space-y-0.5">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {row.interviews_conducted} interviews
            </p>
            <p className="text-xs text-gray-400">
              Avg rating: {row.avg_rating_given != null ? row.avg_rating_given.toFixed(1) : '—'}/5
            </p>
          </div>
        </div>
      ))}
      {data.length === 0 && (
        <p className="text-sm text-gray-400 py-6 text-center">No data yet</p>
      )}
    </div>
  )
}
