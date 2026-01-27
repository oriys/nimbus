import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  Timer,
  Loader2,
  List,
  LayoutGrid,
  ChevronDown,
  ChevronRight,
  Code2,
} from 'lucide-react'
import { invocationService } from '../../services'
import type { Invocation, InvocationStatus } from '../../types'
import { formatDate, formatDuration, cn } from '../../utils'
import Pagination from '../../components/Pagination'

function StatusBadge({ status }: { status: InvocationStatus }) {
  const config: Record<InvocationStatus, { icon: typeof CheckCircle2; className: string; label: string }> = {
    pending: { icon: Clock, className: 'text-muted-foreground bg-secondary', label: '等待中' },
    running: { icon: Loader2, className: 'text-blue-400 bg-blue-400/10', label: '运行中' },
    success: { icon: CheckCircle2, className: 'text-green-400 bg-green-400/10', label: '成功' },
    failed: { icon: XCircle, className: 'text-red-400 bg-red-400/10', label: '失败' },
    timeout: { icon: Timer, className: 'text-orange-400 bg-orange-400/10', label: '超时' },
    cancelled: { icon: XCircle, className: 'text-muted-foreground bg-secondary', label: '已取消' },
  }
  const { icon: Icon, className, label } = config[status] || config.pending
  return (
    <div className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', className)}>
      <Icon className={cn('h-3 w-3', status === 'running' && 'animate-spin')} />
      <span>{label}</span>
    </div>
  )
}

// 调用卡片组件（用于分组视图）
function InvocationCard({ inv }: { inv: Invocation }) {
  return (
    <Link
      to={`/invocations/${inv.id}`}
      className="bg-secondary/30 rounded-lg p-3 hover:bg-secondary/50 transition-all group card-hover"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono text-muted-foreground group-hover:text-foreground transition-colors">
          {inv.id.slice(0, 8)}
        </span>
        <StatusBadge status={inv.status as InvocationStatus} />
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{formatDate(inv.created_at)}</span>
        <div className="flex items-center gap-2">
          {inv.cold_start && (
            <span className="flex items-center text-orange-400">
              <Zap className="w-3 h-3 mr-0.5" />
            </span>
          )}
          <span className="text-foreground font-mono">{formatDuration(inv.duration_ms)}</span>
        </div>
      </div>
    </Link>
  )
}

// 函数分组组件
function FunctionGroup({
  functionId,
  functionName,
  invocations,
  defaultExpanded = true,
}: {
  functionId: string
  functionName: string
  invocations: Invocation[]
  defaultExpanded?: boolean
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  // 计算统计
  const stats = useMemo(() => {
    const success = invocations.filter(i => i.status === 'success').length
    const failed = invocations.filter(i => i.status === 'failed' || i.status === 'timeout').length
    const avgDuration = invocations.length > 0
      ? invocations.reduce((sum, i) => sum + (i.duration_ms || 0), 0) / invocations.length
      : 0
    return { success, failed, avgDuration }
  }, [invocations])

  return (
    <div className="animate-fade-in">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 py-3 px-4 bg-card rounded-lg border border-border hover:border-accent/30 transition-all mb-2 group"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/15 text-accent">
          <Code2 className="w-5 h-5" />
        </div>
        <div className="flex-1 text-left">
          <Link
            to={`/functions/${functionId}`}
            onClick={(e) => e.stopPropagation()}
            className="text-sm font-display font-medium text-foreground hover:text-accent transition-colors"
          >
            {functionName}
          </Link>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
            <span>{invocations.length} 次调用</span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {stats.success}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              {stats.failed}
            </span>
            <span className="font-mono">avg {formatDuration(stats.avgDuration)}</span>
          </div>
        </div>
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-accent transition-colors" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-accent transition-colors" />
        )}
      </button>
      {expanded && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 ml-4 pl-4 border-l border-border mb-4 animate-fade-in">
          {invocations.map((inv) => (
            <InvocationCard key={inv.id} inv={inv} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function InvocationList() {
  const [invocations, setInvocations] = useState<Invocation[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [viewMode, setViewMode] = useState<'list' | 'grouped'>('list')

  const loadInvocations = async () => {
    try {
      setLoading(true)
      const response = await invocationService.list({
        status: statusFilter || undefined,
        page,
        limit: viewMode === 'grouped' ? 100 : pageSize,
      })
      setInvocations(response.invocations || [])
      setTotal(response.total || 0)
    } catch (error) {
      console.error('Failed to load invocations:', error)
      setInvocations([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInvocations()
  }, [statusFilter, page, pageSize, viewMode])

  useEffect(() => {
    setPage(1)
  }, [statusFilter, viewMode])

  // 按函数分组
  const groupedInvocations = useMemo(() => {
    const groups: Record<string, { functionId: string; functionName: string; invocations: Invocation[] }> = {}
    invocations.forEach((inv) => {
      const key = inv.function_id
      if (!groups[key]) {
        groups[key] = {
          functionId: inv.function_id,
          functionName: inv.function_name,
          invocations: [],
        }
      }
      groups[key].invocations.push(inv)
    })
    // 按调用数量降序排序
    return Object.values(groups).sort((a, b) => b.invocations.length - a.invocations.length)
  }, [invocations])

  const handlePageSizeChange = (size: number) => {
    setPageSize(size)
    setPage(1)
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* 页头 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-display font-bold text-accent">调用记录</h1>
          <p className="text-sm text-muted-foreground">查看函数调用历史</p>
        </div>
      </div>

      {/* 过滤器 */}
      <div className="bg-card rounded-lg border border-border p-3">
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-sm bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all"
          >
            <option value="">所有状态</option>
            <option value="success">成功</option>
            <option value="failed">失败</option>
            <option value="timeout">超时</option>
            <option value="running">执行中</option>
          </select>

          {/* 视图切换 */}
          <div className="flex items-center bg-secondary rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-1.5 rounded-md transition-all',
                viewMode === 'list' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
              title="列表视图"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grouped')}
              className={cn(
                'p-1.5 rounded-md transition-all',
                viewMode === 'grouped' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
              title="按函数分组"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={loadInvocations}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* 内容区域 */}
      {viewMode === 'grouped' ? (
        // 分组视图
        <div className="space-y-2">
          {loading ? (
            <div className="bg-card rounded-lg border border-border p-8 text-center">
              <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin text-accent" />
              <span className="text-sm text-muted-foreground">加载中...</span>
            </div>
          ) : groupedInvocations.length === 0 ? (
            <div className="bg-card rounded-lg border border-border p-8 text-center text-muted-foreground text-sm">
              暂无调用记录
            </div>
          ) : (
            groupedInvocations.map((group) => (
              <FunctionGroup
                key={group.functionId}
                functionId={group.functionId}
                functionName={group.functionName}
                invocations={group.invocations}
              />
            ))
          )}
        </div>
      ) : (
        // 列表视图
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <table className="w-full">
            <thead className="bg-secondary/50 border-b border-border">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">调用 ID</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">函数</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">状态</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">耗时</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">冷启动</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">时间</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin text-accent" />
                    加载中...
                  </td>
                </tr>
              ) : invocations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-sm">
                    暂无调用记录
                  </td>
                </tr>
              ) : (
                invocations.map((inv) => (
                  <tr key={inv.id} className="hover:bg-secondary/30 transition-colors table-row-hover">
                    <td className="px-4 py-2">
                      <span className="text-xs font-mono text-muted-foreground">{inv.id.slice(0, 8)}...</span>
                    </td>
                    <td className="px-4 py-2">
                      <Link
                        to={`/functions/${inv.function_id}`}
                        className="text-sm text-accent hover:text-accent/80 transition-colors"
                      >
                        {inv.function_name}
                      </Link>
                    </td>
                    <td className="px-4 py-2">
                      <StatusBadge status={inv.status as InvocationStatus} />
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground font-mono">
                      {formatDuration(inv.duration_ms)}
                    </td>
                    <td className="px-4 py-2">
                      {inv.cold_start ? (
                        <span className="inline-flex items-center text-orange-400 text-xs">
                          <Zap className="w-3 h-3 mr-0.5" />
                          是
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">否</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground font-mono">
                      {formatDate(inv.created_at)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Link
                        to={`/invocations/${inv.id}`}
                        className="p-1.5 text-muted-foreground hover:text-accent hover:bg-accent/10 rounded inline-flex transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {viewMode === 'list' && (
            <Pagination
              page={page}
              pageSize={pageSize}
              total={total}
              onChange={setPage}
              onPageSizeChange={handlePageSizeChange}
            />
          )}
        </div>
      )}
    </div>
  )
}
