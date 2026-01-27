import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { cn } from '../utils'

interface PaginationProps {
  page: number
  pageSize: number
  total: number
  onChange: (page: number) => void
  onPageSizeChange?: (size: number) => void
  pageSizeOptions?: number[]
}

export default function Pagination({
  page,
  pageSize,
  total,
  onChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
}: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize)
  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  if (total === 0) return null

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-border">
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>
          显示 {start}-{end} / 共 {total} 条
        </span>
        {onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span>每页</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="px-2 py-1 bg-input border border-border rounded text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
            <span>条</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(1)}
          disabled={page === 1}
          className={cn(
            'p-1.5 rounded transition-colors',
            page === 1
              ? 'text-muted-foreground/50 cursor-not-allowed'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
          )}
          title="首页"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className={cn(
            'p-1.5 rounded transition-colors',
            page === 1
              ? 'text-muted-foreground/50 cursor-not-allowed'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
          )}
          title="上一页"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="px-3 text-sm text-foreground">
          {page} / {totalPages}
        </span>
        <button
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
          className={cn(
            'p-1.5 rounded transition-colors',
            page >= totalPages
              ? 'text-muted-foreground/50 cursor-not-allowed'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
          )}
          title="下一页"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => onChange(totalPages)}
          disabled={page >= totalPages}
          className={cn(
            'p-1.5 rounded transition-colors',
            page >= totalPages
              ? 'text-muted-foreground/50 cursor-not-allowed'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
          )}
          title="末页"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
