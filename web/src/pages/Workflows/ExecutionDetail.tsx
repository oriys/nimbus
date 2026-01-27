import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  RefreshCw,
  StopCircle,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  ChevronRight,
  PlayCircle,
  Pause,
  Trash2,
} from 'lucide-react'
import { workflowService } from '../../services/workflows'
import type { WorkflowExecution, StateExecution, Breakpoint } from '../../types/workflow'
import {
  EXECUTION_STATUS_COLORS,
  EXECUTION_STATUS_LABELS,
  STATE_EXECUTION_STATUS_COLORS,
  STATE_EXECUTION_STATUS_LABELS,
  STATE_TYPE_LABELS,
} from '../../types/workflow'
import { cn, formatDuration } from '../../utils/format'
import { Skeleton } from '../../components/Skeleton'
import { useToast } from '../../components/Toast'
import WorkflowViewer from './WorkflowViewer'

export default function ExecutionDetail() {
  const { id: workflowId, executionId } = useParams<{ id: string; executionId: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const [execution, setExecution] = useState<WorkflowExecution | null>(null)
  const [history, setHistory] = useState<StateExecution[]>([])
  const [breakpoints, setBreakpoints] = useState<Breakpoint[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedState, setSelectedState] = useState<StateExecution | null>(null)
  const [resumeInput, setResumeInput] = useState('')
  const [resuming, setResuming] = useState(false)

  const fetchExecution = useCallback(async (showRefreshing = false) => {
    if (!executionId) return
    if (showRefreshing) setRefreshing(true)
    try {
      // API 返回扁平格式，需要解析
      const response = await workflowService.getExecutionHistory(executionId) as any
      // 提取 history 数组
      const historyData = response.history || []
      // 构建 execution 对象（排除 history）
      const { history: _, ...executionData } = response
      setExecution(executionData as WorkflowExecution)
      setHistory(historyData)
      // If paused, set resume input to paused_input
      if (executionData.status === 'paused' && executionData.paused_input) {
        setResumeInput(JSON.stringify(executionData.paused_input, null, 2))
      }
    } catch (error) {
      console.error('Failed to fetch execution:', error)
      toast.error('获取执行详情失败')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [executionId, toast])

  const fetchBreakpoints = useCallback(async () => {
    if (!executionId) return
    try {
      const bps = await workflowService.listBreakpoints(executionId)
      setBreakpoints(bps)
    } catch (error) {
      console.error('Failed to fetch breakpoints:', error)
    }
  }, [executionId])

  useEffect(() => {
    fetchExecution()
    fetchBreakpoints()
  }, [executionId, fetchExecution, fetchBreakpoints])

  // Auto-refresh for running executions with exponential backoff
  const pollIntervalRef = useRef(5000)
  useEffect(() => {
    if (execution?.status === 'running' || execution?.status === 'pending') {
      pollIntervalRef.current = 5000 // Reset on status change
      const interval = setInterval(() => {
        fetchExecution()
        // Increase interval gradually up to 15s
        pollIntervalRef.current = Math.min(pollIntervalRef.current * 1.2, 15000)
      }, pollIntervalRef.current)
      return () => clearInterval(interval)
    }
  }, [execution?.status, fetchExecution])

  const handleStop = async () => {
    if (!executionId) return
    try {
      await workflowService.stopExecution(executionId)
      toast.success('执行已停止')
      fetchExecution()
    } catch (error) {
      console.error('Failed to stop execution:', error)
      toast.error('停止执行失败')
    }
  }

  const handleToggleBreakpoint = useCallback(async (stateName: string) => {
    if (!executionId) return
    const existingBp = breakpoints.find(bp => bp.before_state === stateName)
    try {
      if (existingBp) {
        await workflowService.deleteBreakpoint(executionId, stateName)
        toast.success(`已移除 ${stateName} 的断点`)
      } else {
        await workflowService.setBreakpoint(executionId, stateName)
        toast.success(`已在 ${stateName} 设置断点`)
      }
      fetchBreakpoints()
    } catch (error) {
      console.error('Failed to toggle breakpoint:', error)
      toast.error('操作断点失败')
    }
  }, [executionId, breakpoints, toast, fetchBreakpoints])

  const handleResume = async () => {
    if (!executionId) return
    setResuming(true)
    try {
      let input: unknown = undefined
      if (resumeInput.trim()) {
        try {
          input = JSON.parse(resumeInput)
        } catch (e) {
          toast.error('输入格式错误，请输入有效的 JSON')
          setResuming(false)
          return
        }
      }
      await workflowService.resumeExecution(executionId, input)
      toast.success('执行已恢复')
      fetchExecution()
    } catch (error) {
      console.error('Failed to resume execution:', error)
      toast.error('恢复执行失败')
    } finally {
      setResuming(false)
    }
  }

  const handleDeleteBreakpoint = async (stateName: string) => {
    if (!executionId) return
    try {
      await workflowService.deleteBreakpoint(executionId, stateName)
      toast.success(`已移除 ${stateName} 的断点`)
      fetchBreakpoints()
    } catch (error) {
      console.error('Failed to delete breakpoint:', error)
      toast.error('删除断点失败')
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'succeeded':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'running':
        return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
      case 'pending':
        return <Clock className="w-5 h-5 text-gray-400" />
      case 'timeout':
        return <AlertCircle className="w-5 h-5 text-orange-500" />
      case 'cancelled':
        return <StopCircle className="w-5 h-5 text-yellow-500" />
      case 'paused':
        return <Pause className="w-5 h-5 text-purple-500" />
      default:
        return <Clock className="w-5 h-5 text-gray-400" />
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (!execution) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/workflows/${workflowId}`)}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-display font-bold text-foreground">
                执行详情
              </h1>
              <span
                className={cn(
                  'px-2 py-0.5 text-xs font-medium rounded-full',
                  EXECUTION_STATUS_COLORS[execution.status]
                )}
              >
                {EXECUTION_STATUS_LABELS[execution.status]}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1 font-mono">
              {execution.id}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchExecution(true)}
            disabled={refreshing}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            title="刷新"
          >
            <RefreshCw className={cn('w-5 h-5', refreshing && 'animate-spin')} />
          </button>
          {(execution.status === 'running' || execution.status === 'pending') && (
            <button
              onClick={handleStop}
              className="inline-flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
            >
              <StopCircle className="w-4 h-4" />
              停止
            </button>
          )}
        </div>
      </div>

      {/* Execution Info */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="grid grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">工作流</p>
            <Link
              to={`/workflows/${workflowId}`}
              className="text-lg font-semibold text-accent hover:underline"
            >
              {execution.workflow_name}
            </Link>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">当前状态</p>
            <p className="text-lg font-semibold">
              {execution.current_state || '-'}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">开始时间</p>
            <p className="text-lg font-semibold">
              {execution.started_at
                ? new Date(execution.started_at).toLocaleString()
                : '-'}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">耗时</p>
            <p className="text-lg font-semibold">
              {execution.started_at && execution.completed_at
                ? formatDuration(
                    new Date(execution.completed_at).getTime() -
                      new Date(execution.started_at).getTime()
                  )
                : execution.started_at
                ? formatDuration(Date.now() - new Date(execution.started_at).getTime())
                : '-'}
            </p>
          </div>
        </div>
        {execution.error && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm font-medium text-red-800 dark:text-red-400">错误</p>
            <p className="text-sm text-red-600 dark:text-red-300 mt-1">{execution.error}</p>
          </div>
        )}
      </div>

      {/* Workflow Flow Diagram */}
      {execution.workflow_definition && (
        <div className="bg-card border border-border rounded-lg">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-lg font-semibold">工作流图</h2>
            <p className="text-xs text-muted-foreground mt-1">
              版本 {execution.workflow_version} · 执行时的工作流定义快照
            </p>
          </div>
          <WorkflowViewer
            definition={execution.workflow_definition}
            history={history}
            breakpoints={breakpoints}
            onNodeClick={handleToggleBreakpoint}
          />
          <p className="text-xs text-muted-foreground px-4 pb-2">
            点击节点可设置/移除断点
          </p>
        </div>
      )}

      {/* Debug Panel - Shown when paused or has breakpoints */}
      {(execution.status === 'paused' || breakpoints.length > 0) && (
        <div className="bg-card border border-border rounded-lg">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Pause className="w-5 h-5 text-purple-500" />
              <h2 className="text-lg font-semibold">调试控制</h2>
            </div>
            {execution.status === 'paused' && (
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                已暂停于 {execution.paused_at_state}
              </span>
            )}
          </div>
          <div className="p-4 space-y-4">
            {/* Breakpoints List */}
            {breakpoints.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-2">断点列表</h3>
                <div className="flex flex-wrap gap-2">
                  {breakpoints.map((bp) => (
                    <div
                      key={bp.id}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 rounded text-sm"
                    >
                      <span>{bp.before_state}</span>
                      <button
                        onClick={() => handleDeleteBreakpoint(bp.before_state)}
                        className="p-0.5 hover:bg-red-200 dark:hover:bg-red-800/50 rounded"
                        title="移除断点"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Resume Controls */}
            {execution.status === 'paused' && (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">恢复时的输入 (可选修改)</label>
                  <textarea
                    value={resumeInput}
                    onChange={(e) => setResumeInput(e.target.value)}
                    className="w-full h-32 px-3 py-2 text-sm font-mono bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                    placeholder='{"key": "value"}'
                  />
                </div>
                <button
                  onClick={handleResume}
                  disabled={resuming}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  <PlayCircle className="w-4 h-4" />
                  {resuming ? '恢复中...' : '恢复执行'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        {/* State Execution Timeline */}
        <div className="bg-card border border-border rounded-lg">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-lg font-semibold">执行历史</h2>
          </div>
          <div className="p-4">
            {history.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">暂无执行记录</p>
            ) : (
              <div className="space-y-1">
                {history.map((state) => (
                  <button
                    key={state.id}
                    onClick={() => setSelectedState(state)}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors',
                      selectedState?.id === state.id
                        ? 'bg-accent/10 border border-accent'
                        : 'hover:bg-muted/50'
                    )}
                  >
                    <div className="flex-shrink-0">
                      {getStatusIcon(state.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{state.state_name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({STATE_TYPE_LABELS[state.state_type]})
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span
                          className={cn(
                            'px-1.5 py-0.5 rounded',
                            STATE_EXECUTION_STATUS_COLORS[state.status]
                          )}
                        >
                          {STATE_EXECUTION_STATUS_LABELS[state.status]}
                        </span>
                        {state.started_at && state.completed_at && (
                          <span>
                            耗时 {formatDuration(
                              new Date(state.completed_at).getTime() -
                                new Date(state.started_at).getTime()
                            )}
                          </span>
                        )}
                        {state.retry_count > 0 && (
                          <span>重试 {state.retry_count} 次</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* State Detail */}
        <div className="bg-card border border-border rounded-lg">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-lg font-semibold">
              {selectedState ? `状态: ${selectedState.state_name}` : '状态详情'}
            </h2>
          </div>
          <div className="p-4">
            {selectedState ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">类型</p>
                    <p className="font-medium">{STATE_TYPE_LABELS[selectedState.state_type]}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">状态</p>
                    <span
                      className={cn(
                        'px-2 py-0.5 text-xs font-medium rounded',
                        STATE_EXECUTION_STATUS_COLORS[selectedState.status]
                      )}
                    >
                      {STATE_EXECUTION_STATUS_LABELS[selectedState.status]}
                    </span>
                  </div>
                  <div>
                    <p className="text-muted-foreground">开始时间</p>
                    <p className="font-medium">
                      {selectedState.started_at
                        ? new Date(selectedState.started_at).toLocaleString()
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">完成时间</p>
                    <p className="font-medium">
                      {selectedState.completed_at
                        ? new Date(selectedState.completed_at).toLocaleString()
                        : '-'}
                    </p>
                  </div>
                </div>

                {selectedState.invocation_id && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">函数调用 ID</p>
                    <Link
                      to={`/invocations/${selectedState.invocation_id}`}
                      className="text-sm text-accent hover:underline font-mono"
                    >
                      {selectedState.invocation_id}
                    </Link>
                  </div>
                )}

                {selectedState.input !== undefined && selectedState.input !== null && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">输入</p>
                    <pre className="text-xs font-mono bg-muted/50 rounded-lg p-3 overflow-auto max-h-32">
                      {JSON.stringify(selectedState.input, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedState.output !== undefined && selectedState.output !== null && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">输出</p>
                    <pre className="text-xs font-mono bg-muted/50 rounded-lg p-3 overflow-auto max-h-32">
                      {JSON.stringify(selectedState.output, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedState.error && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">错误</p>
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <p className="text-sm text-red-600 dark:text-red-300">
                        {selectedState.error}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                选择一个状态查看详情
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Input/Output */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-lg">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-lg font-semibold">执行输入</h2>
          </div>
          <div className="p-4">
            <pre className="text-sm font-mono bg-muted/50 rounded-lg p-4 overflow-auto max-h-48">
              {execution.input
                ? JSON.stringify(execution.input, null, 2)
                : '无输入'}
            </pre>
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-lg font-semibold">执行输出</h2>
          </div>
          <div className="p-4">
            <pre className="text-sm font-mono bg-muted/50 rounded-lg p-4 overflow-auto max-h-48">
              {execution.output
                ? JSON.stringify(execution.output, null, 2)
                : '无输出'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}
