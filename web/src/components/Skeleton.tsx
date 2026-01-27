import { cn } from '../utils/format'

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded'
  width?: string | number
  height?: string | number
  animation?: 'pulse' | 'shimmer' | 'none'
}

export function Skeleton({
  className,
  variant = 'text',
  width,
  height,
  animation = 'shimmer',
}: SkeletonProps) {
  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    rounded: 'rounded-lg',
  }

  const animationClasses = {
    pulse: 'animate-pulse bg-muted',
    shimmer: 'skeleton',
    none: 'bg-muted',
  }

  return (
    <div
      className={cn(
        'bg-muted',
        variantClasses[variant],
        animationClasses[animation],
        className
      )}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
      }}
    />
  )
}

// 统计卡片骨架屏
export function StatsCardSkeleton() {
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center gap-3">
        <Skeleton variant="rounded" className="w-9 h-9" />
        <div className="flex-1">
          <Skeleton className="h-3 w-16 mb-2" />
          <Skeleton className="h-6 w-24" />
        </div>
        <Skeleton variant="rounded" className="h-6 w-16" />
      </div>
    </div>
  )
}

// 函数卡片骨架屏
export function FunctionCardSkeleton() {
  return (
    <div className="bg-card rounded-lg border border-border p-4">
      <div className="flex items-start justify-between mb-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton variant="rounded" className="h-5 w-14" />
      </div>
      <Skeleton className="h-3 w-48 mb-3" />

      <div className="grid grid-cols-3 gap-2 mb-3 py-2 border-t border-b border-border/50">
        {[1, 2, 3].map((i) => (
          <div key={i} className="text-center">
            <Skeleton className="h-3 w-8 mx-auto mb-1" />
            <Skeleton className="h-4 w-12 mx-auto" />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-24" />
        <div className="flex gap-1">
          <Skeleton variant="circular" className="w-7 h-7" />
          <Skeleton variant="circular" className="w-7 h-7" />
        </div>
      </div>
    </div>
  )
}

// 表格行骨架屏
export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <tr className="border-b border-border">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full max-w-[120px]" />
        </td>
      ))}
    </tr>
  )
}

// 列表项骨架屏
export function ListItemSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 border-b border-border">
      <Skeleton variant="circular" className="w-8 h-8" />
      <div className="flex-1">
        <Skeleton className="h-4 w-40 mb-1" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton variant="rounded" className="h-6 w-16" />
    </div>
  )
}

// Dashboard 骨架屏
export function DashboardSkeleton() {
  return (
    <div className="space-y-4 animate-fade-in">
      {/* 页头 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="h-7 w-20" />
          <Skeleton variant="rounded" className="h-6 w-32" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton variant="rounded" className="h-9 w-24" />
          <Skeleton variant="circular" className="w-9 h-9" />
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <StatsCardSkeleton key={i} />
        ))}
      </div>

      {/* 主体区域 */}
      <div className="grid grid-cols-12 gap-3">
        {/* 图表 */}
        <div className="col-span-6 bg-card rounded-xl border border-border p-4">
          <Skeleton className="h-4 w-24 mb-4" />
          <Skeleton variant="rounded" className="h-44 w-full" />
        </div>

        {/* 热门函数 */}
        <div className="col-span-3 bg-card rounded-xl border border-border p-4">
          <Skeleton className="h-4 w-20 mb-4" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <div className="flex-1">
                  <Skeleton className="h-3 w-full mb-1" />
                  <Skeleton className="h-1 w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 实例池 */}
        <div className="col-span-3 bg-card rounded-xl border border-border p-4">
          <Skeleton className="h-4 w-16 mb-4" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton variant="circular" className="w-14 h-14" />
                <div className="flex-1">
                  <Skeleton className="h-3 w-20 mb-1" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 最近调用 */}
      <div className="bg-card rounded-xl border border-border p-4">
        <Skeleton className="h-4 w-20 mb-4" />
        <div className="grid grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} variant="rounded" className="h-12 w-full" />
          ))}
        </div>
      </div>
    </div>
  )
}

// 函数列表骨架屏
export function FunctionListSkeleton({ viewMode = 'list' }: { viewMode?: 'list' | 'grouped' }) {
  if (viewMode === 'grouped') {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((group) => (
          <div key={group}>
            <div className="flex items-center gap-3 py-3 px-4 bg-card rounded-lg border border-border mb-2">
              <Skeleton variant="rounded" className="w-10 h-10" />
              <div className="flex-1">
                <Skeleton className="h-4 w-24 mb-1" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton variant="circular" className="w-4 h-4" />
            </div>
            <div className="grid grid-cols-3 gap-3 ml-4 pl-4 border-l border-border mb-4">
              {[1, 2, 3].map((i) => (
                <FunctionCardSkeleton key={i} />
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <table className="w-full">
        <thead className="bg-secondary/50 border-b border-border">
          <tr>
            {['名称', '运行时', '状态', '调用', '成功率', '延迟', '更新时间', '操作'].map((header) => (
              <th key={header} className="px-4 py-2 text-left">
                <Skeleton className="h-3 w-12" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[1, 2, 3, 4, 5].map((i) => (
            <TableRowSkeleton key={i} columns={8} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

// 调用列表骨架屏
export function InvocationListSkeleton() {
  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <table className="w-full">
        <thead className="bg-secondary/50 border-b border-border">
          <tr>
            {['函数', '状态', '延迟', '时间'].map((header) => (
              <th key={header} className="px-4 py-2 text-left">
                <Skeleton className="h-3 w-12" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <TableRowSkeleton key={i} columns={4} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
