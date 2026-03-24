import { Button } from './Button'

interface PaginationProps {
  page: number
  pages: number
  total: number
  limit: number
  onPage: (p: number) => void
}

export function Pagination({ page, pages, total, limit, onPage }: PaginationProps) {
  if (pages <= 1) return null
  const from = (page - 1) * limit + 1
  const to = Math.min(page * limit, total)

  return (
    <div className="flex items-center justify-between px-1 py-3">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Showing <span className="font-medium">{from}–{to}</span> of{' '}
        <span className="font-medium">{total}</span> results
      </p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page === 1} onClick={() => onPage(page - 1)}>
          Previous
        </Button>
        <Button variant="outline" size="sm" disabled={page === pages} onClick={() => onPage(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  )
}
