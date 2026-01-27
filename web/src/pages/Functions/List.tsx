import { useState, useEffect, useMemo, useCallback, memo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Plus,
  Search,
  RefreshCw,
  Play,
  Edit,
  Trash2,
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  LayoutGrid,
  List,
  ChevronDown,
  ChevronRight,
  PauseCircle,
  Copy,
  X,
  Square,
  CheckSquare,
  MinusSquare,
  Power,
  PowerOff,
  Star,
  Download,
  Upload,
} from 'lucide-react'
import { functionService } from '../../services'
import type { Function, Runtime, FunctionStatus } from '../../types'
import { RUNTIME_LABELS } from '../../types'
import { formatDate, cn } from '../../utils'
import Pagination from '../../components/Pagination'
import EmptyState from '../../components/EmptyState'
import { FunctionListSkeleton } from '../../components/Skeleton'
import { useToast } from '../../components/Toast'

const RUNTIME_BADGE_COLORS: Record<Runtime, string> = {
  'python3.11': 'text-blue-400 bg-blue-400/10',
  'nodejs20': 'text-green-400 bg-green-400/10',
  'go1.24': 'text-cyan-400 bg-cyan-400/10',
  'wasm': 'text-purple-400 bg-purple-400/10',
  'rust1.75': 'text-orange-400 bg-orange-400/10',
}

const RUNTIME_ICONS: Record<string, { icon: string; color: string; bgColor: string }> = {
  'python3.11': { icon: 'Py', color: 'text-blue-400', bgColor: 'bg-blue-500/15' },
  'nodejs20': { icon: 'JS', color: 'text-green-400', bgColor: 'bg-green-500/15' },
  'go1.24': { icon: 'Go', color: 'text-cyan-400', bgColor: 'bg-cyan-500/15' },
  'wasm': { icon: 'Wa', color: 'text-purple-400', bgColor: 'bg-purple-500/15' },
  'rust1.75': { icon: 'Rs', color: 'text-orange-400', bgColor: 'bg-orange-500/15' },
}

// 状态徽章组件 - 纯展示组件，使用 memo 优化
const StatusBadge = memo(function StatusBadge({ status }: { status: FunctionStatus }) {
  const config: Record<FunctionStatus, { icon: typeof CheckCircle2; className: string; label: string }> = {
    creating: { icon: Loader2, className: 'text-blue-400 bg-blue-400/10', label: '创建中' },
    active: { icon: CheckCircle2, className: 'text-green-400 bg-green-400/10', label: '运行中' },
    updating: { icon: Loader2, className: 'text-blue-400 bg-blue-400/10', label: '更新中' },
    offline: { icon: PauseCircle, className: 'text-gray-400 bg-gray-400/10', label: '已下线' },
    inactive: { icon: Clock, className: 'text-yellow-400 bg-yellow-400/10', label: '未激活' },
    building: { icon: Loader2, className: 'text-blue-400 bg-blue-400/10', label: '构建中' },
    failed: { icon: AlertCircle, className: 'text-red-400 bg-red-400/10', label: '失败' },
  }
  const { icon: Icon, className, label } = config[status] || config.inactive
  const isAnimating = status === 'creating' || status === 'updating' || status === 'building'
  return (
    <div className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', className)}>
      <Icon className={cn('h-3 w-3', isAnimating && 'animate-spin')} />
      <span>{label}</span>
    </div>
  )
})

// 格式化工具函数 - 移到组件外避免每次渲染重建
const formatLatencyValue = (ms?: number) => {
  if (!ms || ms < 1) return '-'
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

const formatPercentValue = (value?: number) => {
  if (value === undefined || value === null) return '-'
  return `${(value * 100).toFixed(1)}%`
}

// 函数卡片组件（用于分组视图）- 使用 memo 优化
const FunctionCard = memo(function FunctionCard({
  fn,
  onInvoke,
  onDelete,
  onClone,
  onPin,
  onExport,
}: {
  fn: Function
  onInvoke: (id: string) => void
  onDelete: (id: string, name: string) => void
  onClone: (fn: Function) => void
  onPin: (fn: Function) => void
  onExport: (fn: Function) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  // 使用 useCallback 缓存事件处理器
  const handleInvoke = useCallback(() => onInvoke(fn.id), [onInvoke, fn.id])
  const handleMenuToggle = useCallback(() => setMenuOpen(prev => !prev), [])
  const handleMenuClose = useCallback(() => setMenuOpen(false), [])
  const handlePin = useCallback(() => {
    onPin(fn)
    setMenuOpen(false)
  }, [onPin, fn])
  const handleClone = useCallback(() => {
    onClone(fn)
    setMenuOpen(false)
  }, [onClone, fn])
  const handleExport = useCallback(() => {
    onExport(fn)
    setMenuOpen(false)
  }, [onExport, fn])
  const handleDelete = useCallback(() => {
    onDelete(fn.id, fn.name)
    setMenuOpen(false)
  }, [onDelete, fn.id, fn.name])

  return (
    <div className="bg-card rounded-lg border border-border p-4 card-hover group">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-1.5">
          {fn.pinned && <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />}
          <Link
            to={`/functions/${fn.id}`}
            className="text-sm font-medium text-foreground hover:text-accent transition-colors"
          >
            {fn.name}
          </Link>
        </div>
        <StatusBadge status={fn.status as FunctionStatus} />
      </div>
      <p className="text-xs text-muted-foreground font-mono mb-2 truncate">{fn.handler}</p>

      {/* 标签区域 */}
      {fn.tags && fn.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {fn.tags.slice(0, 3).map(tag => (
            <span key={tag} className="inline-flex items-center px-1.5 py-0.5 text-[10px] rounded bg-secondary text-muted-foreground">
              {tag}
            </span>
          ))}
          {fn.tags.length > 3 && (
            <span className="text-[10px] text-muted-foreground">+{fn.tags.length - 3}</span>
          )}
        </div>
      )}

      {/* 指标区域 */}
      <div className="grid grid-cols-3 gap-2 mb-3 py-2 border-t border-b border-border/50">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">调用</p>
          <p className="text-sm font-display font-semibold text-foreground">
            {fn.invocations ?? 0}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">成功率</p>
          <p className={cn(
            'text-sm font-display font-semibold',
            fn.success_rate !== undefined && fn.success_rate >= 0.95 ? 'text-emerald-500' :
            fn.success_rate !== undefined && fn.success_rate >= 0.80 ? 'text-amber-500' :
            fn.success_rate !== undefined ? 'text-rose-500' : 'text-foreground'
          )}>
            {formatPercentValue(fn.success_rate)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">延迟</p>
          <p className="text-sm font-display font-semibold text-foreground">
            {formatLatencyValue(fn.avg_latency_ms)}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{formatDate(fn.updated_at)}</span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleInvoke}
            className="p-1.5 text-muted-foreground hover:text-accent hover:bg-accent/10 rounded transition-colors"
            title="调用"
          >
            <Play className="w-3.5 h-3.5" />
          </button>
          <Link
            to={`/functions/${fn.id}`}
            className="p-1.5 text-muted-foreground hover:text-accent hover:bg-accent/10 rounded transition-colors"
            title="编辑"
          >
            <Edit className="w-3.5 h-3.5" />
          </Link>
          <div className="relative">
            <button
              onClick={handleMenuToggle}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded transition-colors"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={handleMenuClose} />
                <div className="absolute right-0 mt-1 w-32 bg-popover rounded-lg shadow-lg border border-border py-1 z-50 animate-scale-in">
                  <button
                    onClick={handlePin}
                    className="w-full flex items-center px-3 py-1.5 text-xs text-foreground hover:bg-secondary transition-colors"
                  >
                    <Star className={cn("w-3.5 h-3.5 mr-2", fn.pinned && "fill-amber-400 text-amber-400")} />
                    {fn.pinned ? '取消置顶' : '置顶'}
                  </button>
                  <button
                    onClick={handleClone}
                    className="w-full flex items-center px-3 py-1.5 text-xs text-foreground hover:bg-secondary transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5 mr-2" />
                    克隆
                  </button>
                  <button
                    onClick={handleExport}
                    className="w-full flex items-center px-3 py-1.5 text-xs text-foreground hover:bg-secondary transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 mr-2" />
                    导出
                  </button>
                  <button
                    onClick={handleDelete}
                    className="w-full flex items-center px-3 py-1.5 text-xs text-destructive hover:bg-secondary transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-2" />
                    删除
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
})

// 语言分组组件
function RuntimeGroup({
  runtime,
  functions,
  onInvoke,
  onDelete,
  onClone,
  onPin,
  onExport,
  defaultExpanded = true,
}: {
  runtime: string
  functions: Function[]
  onInvoke: (id: string) => void
  onDelete: (id: string, name: string) => void
  onClone: (fn: Function) => void
  onPin: (fn: Function) => void
  onExport: (fn: Function) => void
  defaultExpanded?: boolean
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const runtimeConfig = RUNTIME_ICONS[runtime] || { icon: '??', color: 'text-muted-foreground', bgColor: 'bg-secondary' }

  return (
    <div className="animate-fade-in">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 py-3 px-4 bg-card rounded-lg border border-border hover:border-accent/30 transition-all mb-2 group"
      >
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg font-display font-semibold text-sm', runtimeConfig.bgColor, runtimeConfig.color)}>
          {runtimeConfig.icon}
        </div>
        <div className="flex-1 text-left">
          <h3 className="text-sm font-display font-medium text-foreground">{RUNTIME_LABELS[runtime as Runtime] || runtime}</h3>
          <p className="text-xs text-muted-foreground">{functions.length} 个函数</p>
        </div>
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-accent transition-colors" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-accent transition-colors" />
        )}
      </button>
      {expanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 ml-4 pl-4 border-l border-border mb-4 animate-fade-in-up">
          {functions.map((fn) => (
            <FunctionCard key={fn.id} fn={fn} onInvoke={onInvoke} onDelete={onDelete} onClone={onClone} onPin={onPin} onExport={onExport} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function FunctionList() {
  const navigate = useNavigate()
  const toast = useToast()
  const [functions, setFunctions] = useState<Function[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [runtimeFilter, setRuntimeFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [tagFilter, setTagFilter] = useState<string>('')
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [total, setTotal] = useState(0)
  const [viewMode, setViewMode] = useState<'list' | 'grouped'>('list')

  // 克隆模态框状态
  const [cloneModalOpen, setCloneModalOpen] = useState(false)
  const [cloneSource, setCloneSource] = useState<Function | null>(null)
  const [cloneName, setCloneName] = useState('')
  const [cloning, setCloning] = useState(false)

  // 批量操作状态
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [batchOperating, setBatchOperating] = useState(false)

  // 导入模态框状态
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importData, setImportData] = useState('')
  const [importing, setImporting] = useState(false)

  const loadFunctions = async () => {
    try {
      setLoading(true)
      const response = await functionService.list({
        search,
        runtime: runtimeFilter || undefined,
        status: statusFilter || undefined,
        page,
        limit: viewMode === 'grouped' ? 100 : pageSize, // 分组视图加载更多
      })
      setFunctions(response.functions || [])
      setTotal(response.total || 0)
    } catch (error) {
      console.error('Failed to load functions:', error)
      toast.error('加载失败', '无法获取函数列表')
      setFunctions([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFunctions()
  }, [search, runtimeFilter, statusFilter, page, pageSize, viewMode])

  useEffect(() => {
    setPage(1)
  }, [search, runtimeFilter, statusFilter, tagFilter, viewMode])

  // 提取所有唯一标签
  const allTags = useMemo(() => {
    const tags = new Set<string>()
    functions.forEach(fn => {
      fn.tags?.forEach(tag => tags.add(tag))
    })
    return Array.from(tags).sort()
  }, [functions])

  // 根据标签过滤函数
  const filteredFunctions = useMemo(() => {
    if (!tagFilter) return functions
    return functions.filter(fn => fn.tags?.includes(tagFilter))
  }, [functions, tagFilter])

  // 按运行时分组
  const groupedFunctions = useMemo(() => {
    const groups: Record<string, Function[]> = {}
    filteredFunctions.forEach((fn) => {
      const runtime = fn.runtime || 'unknown'
      if (!groups[runtime]) {
        groups[runtime] = []
      }
      groups[runtime].push(fn)
    })
    // 排序：按函数数量降序
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length)
  }, [filteredFunctions])

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确定要删除函数 "${name}" 吗？`)) return
    try {
      await functionService.delete(id)
      toast.success('删除成功', `函数 "${name}" 已删除`)
      loadFunctions()
    } catch (error) {
      console.error('Failed to delete function:', error)
      toast.error('删除失败', '请稍后重试')
    }
    setMenuOpen(null)
  }

  const handleInvoke = (id: string) => {
    navigate(`/functions/${id}?tab=test`)
  }

  const handlePageSizeChange = (size: number) => {
    setPageSize(size)
    setPage(1)
  }

  const handleClone = (fn: Function) => {
    setCloneSource(fn)
    setCloneName(fn.name + '-copy')
    setCloneModalOpen(true)
  }

  const handleCloneSubmit = async () => {
    if (!cloneSource || !cloneName.trim()) return
    try {
      setCloning(true)
      const result = await functionService.clone(cloneSource.id, cloneName.trim())
      toast.success('克隆成功', `函数 "${cloneName}" 已创建`)
      setCloneModalOpen(false)
      setCloneSource(null)
      setCloneName('')
      // 跳转到新函数
      navigate(`/functions/${result.function.id}`)
    } catch (error) {
      console.error('Failed to clone function:', error)
      toast.error('克隆失败', '请稍后重试')
    } finally {
      setCloning(false)
    }
  }

  // 批量操作相关
  const handleSelectAll = () => {
    if (selectedIds.size === filteredFunctions.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredFunctions.map(fn => fn.id)))
    }
  }

  const handleSelectOne = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return
    const count = selectedIds.size
    if (!confirm(`确定要删除选中的 ${count} 个函数吗？此操作不可恢复。`)) return

    try {
      setBatchOperating(true)
      let success = 0
      let failed = 0
      for (const id of selectedIds) {
        try {
          await functionService.delete(id)
          success++
        } catch {
          failed++
        }
      }
      setSelectedIds(new Set())
      loadFunctions()
      if (failed === 0) {
        toast.success('批量删除成功', `已删除 ${success} 个函数`)
      } else {
        toast.warning('部分删除成功', `成功 ${success} 个，失败 ${failed} 个`)
      }
    } finally {
      setBatchOperating(false)
    }
  }

  const handleBatchOffline = async () => {
    if (selectedIds.size === 0) return

    try {
      setBatchOperating(true)
      let success = 0
      let failed = 0
      for (const id of selectedIds) {
        try {
          await functionService.offline(id)
          success++
        } catch {
          failed++
        }
      }
      setSelectedIds(new Set())
      loadFunctions()
      if (failed === 0) {
        toast.success('批量下线成功', `已下线 ${success} 个函数`)
      } else {
        toast.warning('部分下线成功', `成功 ${success} 个，失败 ${failed} 个`)
      }
    } finally {
      setBatchOperating(false)
    }
  }

  const handleBatchOnline = async () => {
    if (selectedIds.size === 0) return

    try {
      setBatchOperating(true)
      let success = 0
      let failed = 0
      for (const id of selectedIds) {
        try {
          await functionService.online(id)
          success++
        } catch {
          failed++
        }
      }
      setSelectedIds(new Set())
      loadFunctions()
      if (failed === 0) {
        toast.success('批量上线成功', `已上线 ${success} 个函数`)
      } else {
        toast.warning('部分上线成功', `成功 ${success} 个，失败 ${failed} 个`)
      }
    } finally {
      setBatchOperating(false)
    }
  }

  const handlePin = async (fn: Function) => {
    try {
      await functionService.pin(fn.id)
      const action = fn.pinned ? '取消置顶' : '置顶'
      toast.success(`${action}成功`, `函数 "${fn.name}" 已${action}`)
      loadFunctions()
    } catch (error) {
      console.error('Failed to pin function:', error)
      toast.error('操作失败', '请稍后重试')
    }
  }

  const handleExport = async (fn: Function) => {
    try {
      const data = await functionService.export(fn.id)
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${fn.name}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('导出成功', `函数 "${fn.name}" 配置已下载`)
    } catch (error) {
      console.error('Failed to export function:', error)
      toast.error('导出失败', '请稍后重试')
    }
  }

  const handleImportSubmit = async () => {
    if (!importData.trim()) return
    try {
      setImporting(true)
      const data = JSON.parse(importData)
      const result = await functionService.import(data)
      toast.success('导入成功', `函数 "${result.function.name}" 已创建`)
      setImportModalOpen(false)
      setImportData('')
      navigate(`/functions/${result.function.id}`)
    } catch (error) {
      console.error('Failed to import function:', error)
      if (error instanceof SyntaxError) {
        toast.error('导入失败', 'JSON 格式无效')
      } else {
        toast.error('导入失败', '请检查配置内容')
      }
    } finally {
      setImporting(false)
    }
  }

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      setImportData(content)
    }
    reader.readAsText(file)
    event.target.value = '' // Reset input
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* 页头 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-display font-bold text-accent">函数管理</h1>
          <p className="text-sm text-muted-foreground">管理您的 Serverless 函数</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setImportModalOpen(true)}
            className="flex items-center px-3 py-2 text-sm border border-border text-foreground rounded-lg hover:bg-secondary transition-all font-medium"
          >
            <Upload className="w-4 h-4 mr-1.5" />
            导入
          </button>
          <Link
            to="/functions/create"
            className="flex items-center px-4 py-2 text-sm bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-all btn-glow font-medium"
          >
          <Plus className="w-4 h-4 mr-1.5" />
          创建函数
        </Link>
        </div>
      </div>

      {/* 过滤器 */}
      <div className="bg-card rounded-lg border border-border p-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[180px]">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="搜索函数..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all"
              />
            </div>
          </div>
          <select
            value={runtimeFilter}
            onChange={(e) => setRuntimeFilter(e.target.value)}
            className="px-3 py-1.5 text-sm bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all"
          >
            <option value="">所有运行时</option>
            <option value="python3.11">Python 3.11</option>
            <option value="nodejs20">Node.js 20</option>
            <option value="go1.24">Go 1.24</option>
            <option value="rust1.75">Rust 1.75</option>
            <option value="wasm">WebAssembly</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-sm bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all"
          >
            <option value="">所有状态</option>
            <option value="active">活跃</option>
            <option value="inactive">未激活</option>
            <option value="building">构建中</option>
            <option value="failed">失败</option>
          </select>

          {/* 标签筛选 */}
          {allTags.length > 0 && (
            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="px-3 py-1.5 text-sm bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all"
            >
              <option value="">所有标签</option>
              {allTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          )}

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
              title="按语言分组"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={loadFunctions}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* 批量操作栏 */}
      {selectedIds.size > 0 && (
        <div className="bg-accent/10 border border-accent/30 rounded-lg px-4 py-3 flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-accent">
              已选择 {selectedIds.size} 个函数
            </span>
            <button
              onClick={clearSelection}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              取消选择
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBatchOnline}
              disabled={batchOperating}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
            >
              <Power className="w-3.5 h-3.5" />
              批量上线
            </button>
            <button
              onClick={handleBatchOffline}
              disabled={batchOperating}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-amber-500/10 text-amber-500 rounded-lg hover:bg-amber-500/20 transition-colors disabled:opacity-50"
            >
              <PowerOff className="w-3.5 h-3.5" />
              批量下线
            </button>
            <button
              onClick={handleBatchDelete}
              disabled={batchOperating}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors disabled:opacity-50"
            >
              {batchOperating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              批量删除
            </button>
          </div>
        </div>
      )}

      {/* 函数列表 */}
      {viewMode === 'grouped' ? (
        // 分组视图
        <div className="space-y-2">
          {loading ? (
            <FunctionListSkeleton viewMode="grouped" />
          ) : groupedFunctions.length === 0 ? (
            <EmptyState type="functions" />
          ) : (
            groupedFunctions.map(([runtime, fns]) => (
              <RuntimeGroup
                key={runtime}
                runtime={runtime}
                functions={fns}
                onInvoke={handleInvoke}
                onDelete={handleDelete}
                onClone={handleClone}
                onPin={handlePin}
                onExport={handleExport}
              />
            ))
          )}
        </div>
      ) : (
        // 列表视图
        loading ? (
          <FunctionListSkeleton viewMode="list" />
        ) : filteredFunctions.length === 0 ? (
          <EmptyState type="functions" />
        ) : (
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <table className="w-full">
            <thead className="bg-secondary/50 border-b border-border">
              <tr>
                <th className="w-10 px-3 py-2">
                  <button
                    onClick={handleSelectAll}
                    className="p-1 rounded hover:bg-secondary transition-colors"
                    title={selectedIds.size === filteredFunctions.length ? '取消全选' : '全选'}
                  >
                    {selectedIds.size === 0 ? (
                      <Square className="w-4 h-4 text-muted-foreground" />
                    ) : selectedIds.size === filteredFunctions.length ? (
                      <CheckSquare className="w-4 h-4 text-accent" />
                    ) : (
                      <MinusSquare className="w-4 h-4 text-accent" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">名称</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">运行时</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">标签</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">状态</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-muted-foreground uppercase">调用</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-muted-foreground uppercase">成功率</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-muted-foreground uppercase">延迟</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">更新时间</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredFunctions.map((fn) => {
                  const formatLatency = (ms?: number) => {
                    if (!ms || ms < 1) return '-'
                    if (ms < 1000) return `${Math.round(ms)}ms`
                    return `${(ms / 1000).toFixed(1)}s`
                  }
                  const formatPercent = (value?: number) => {
                    if (value === undefined || value === null) return '-'
                    return `${(value * 100).toFixed(1)}%`
                  }
                  return (
                  <tr key={fn.id} className={cn(
                    "hover:bg-secondary/30 transition-colors table-row-hover",
                    selectedIds.has(fn.id) && "bg-accent/5"
                  )}>
                    <td className="w-10 px-3 py-2.5">
                      <button
                        onClick={() => handleSelectOne(fn.id)}
                        className="p-1 rounded hover:bg-secondary transition-colors"
                      >
                        {selectedIds.has(fn.id) ? (
                          <CheckSquare className="w-4 h-4 text-accent" />
                        ) : (
                          <Square className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        {fn.pinned && <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />}
                        <Link
                          to={`/functions/${fn.id}`}
                          className="text-sm text-accent hover:text-accent/80 font-medium transition-colors"
                        >
                          {fn.name}
                        </Link>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">{fn.handler}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                        RUNTIME_BADGE_COLORS[fn.runtime as Runtime]
                      )}>
                        {RUNTIME_LABELS[fn.runtime as Runtime] || fn.runtime}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      {fn.tags && fn.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {fn.tags.slice(0, 2).map(tag => (
                            <span key={tag} className="inline-flex items-center px-1.5 py-0.5 text-[10px] rounded bg-secondary text-muted-foreground">
                              {tag}
                            </span>
                          ))}
                          {fn.tags.length > 2 && (
                            <span className="text-[10px] text-muted-foreground">+{fn.tags.length - 2}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={fn.status as FunctionStatus} />
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="text-sm font-medium text-foreground">{fn.invocations ?? 0}</span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={cn(
                        'text-sm font-medium',
                        fn.success_rate !== undefined && fn.success_rate >= 0.95 ? 'text-emerald-500' :
                        fn.success_rate !== undefined && fn.success_rate >= 0.80 ? 'text-amber-500' :
                        fn.success_rate !== undefined ? 'text-rose-500' : 'text-muted-foreground'
                      )}>
                        {formatPercent(fn.success_rate)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="text-sm font-medium text-foreground">{formatLatency(fn.avg_latency_ms)}</span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono">
                      {formatDate(fn.updated_at)}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => handleInvoke(fn.id)}
                          className="p-1.5 text-muted-foreground hover:text-accent hover:bg-accent/10 rounded transition-colors"
                          title="调用"
                        >
                          <Play className="w-3.5 h-3.5" />
                        </button>
                        <Link
                          to={`/functions/${fn.id}`}
                          className="p-1.5 text-muted-foreground hover:text-accent hover:bg-accent/10 rounded transition-colors"
                          title="编辑"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Link>
                        <div className="relative">
                          <button
                            onClick={() => setMenuOpen(menuOpen === fn.id ? null : fn.id)}
                            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded transition-colors"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>
                          {menuOpen === fn.id && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(null)} />
                              <div className="absolute right-0 mt-1 w-32 bg-popover rounded-lg shadow-lg border border-border py-1 z-50 animate-scale-in">
                                <button
                                  onClick={() => {
                                    handlePin(fn)
                                    setMenuOpen(null)
                                  }}
                                  className="w-full flex items-center px-3 py-1.5 text-xs text-foreground hover:bg-secondary transition-colors"
                                >
                                  <Star className={cn("w-3.5 h-3.5 mr-2", fn.pinned && "fill-amber-400 text-amber-400")} />
                                  {fn.pinned ? '取消置顶' : '置顶'}
                                </button>
                                <button
                                  onClick={() => {
                                    handleClone(fn)
                                    setMenuOpen(null)
                                  }}
                                  className="w-full flex items-center px-3 py-1.5 text-xs text-foreground hover:bg-secondary transition-colors"
                                >
                                  <Copy className="w-3.5 h-3.5 mr-2" />
                                  克隆
                                </button>
                                <button
                                  onClick={() => {
                                    handleExport(fn)
                                    setMenuOpen(null)
                                  }}
                                  className="w-full flex items-center px-3 py-1.5 text-xs text-foreground hover:bg-secondary transition-colors"
                                >
                                  <Download className="w-3.5 h-3.5 mr-2" />
                                  导出
                                </button>
                                <button
                                  onClick={() => handleDelete(fn.id, fn.name)}
                                  className="w-full flex items-center px-3 py-1.5 text-xs text-destructive hover:bg-secondary transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5 mr-2" />
                                  删除
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )
              })}
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
        )
      )}

      {/* 克隆模态框 */}
      {cloneModalOpen && cloneSource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-scale-in">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground flex items-center">
                <Copy className="w-5 h-5 mr-2 text-accent" />
                克隆函数
              </h3>
              <button
                onClick={() => {
                  setCloneModalOpen(false)
                  setCloneSource(null)
                  setCloneName('')
                }}
                className="p-1 hover:bg-secondary rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  将克隆函数 <span className="text-foreground font-medium">{cloneSource.name}</span> 的所有配置和代码
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">新函数名称 *</label>
                <input
                  type="text"
                  value={cloneName}
                  onChange={(e) => setCloneName(e.target.value)}
                  placeholder="输入新函数名称"
                  className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && cloneName.trim()) handleCloneSubmit()
                    if (e.key === 'Escape') {
                      setCloneModalOpen(false)
                      setCloneSource(null)
                      setCloneName('')
                    }
                  }}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  函数名称只能包含小写字母、数字和连字符
                </p>
              </div>
            </div>
            <div className="px-6 py-4 bg-secondary/30 flex justify-end gap-3">
              <button
                onClick={() => {
                  setCloneModalOpen(false)
                  setCloneSource(null)
                  setCloneName('')
                }}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleCloneSubmit}
                disabled={cloning || !cloneName.trim()}
                className="px-4 py-2 text-sm bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50 flex items-center"
              >
                {cloning && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {cloning ? '克隆中...' : '克隆'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 导入模态框 */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-xl overflow-hidden animate-scale-in">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground flex items-center">
                <Upload className="w-5 h-5 mr-2 text-accent" />
                导入函数
              </h3>
              <button
                onClick={() => {
                  setImportModalOpen(false)
                  setImportData('')
                }}
                className="p-1 hover:bg-secondary rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">从文件导入</label>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileImport}
                  className="w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-secondary file:text-foreground hover:file:bg-secondary/80"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">或粘贴 JSON 配置</label>
                <textarea
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                  placeholder='{"name": "my-function", "runtime": "python3.11", ...}'
                  rows={10}
                  className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground font-mono text-xs focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>
            </div>
            <div className="px-6 py-4 bg-secondary/30 flex justify-end gap-3">
              <button
                onClick={() => {
                  setImportModalOpen(false)
                  setImportData('')
                }}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleImportSubmit}
                disabled={importing || !importData.trim()}
                className="px-4 py-2 text-sm bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50 flex items-center"
              >
                {importing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {importing ? '导入中...' : '导入'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
