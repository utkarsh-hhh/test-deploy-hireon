import { clsx } from 'clsx'

interface SkeletonProps {
  className?: string
  count?: number
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={clsx('animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg', className)} />
  )
}

export function SkeletonCard() {
  return (
    <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-3/4" />
    </div>
  )
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 p-4">
      <Skeleton className="w-10 h-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-6 w-16 rounded-full" />
    </div>
  )
}
