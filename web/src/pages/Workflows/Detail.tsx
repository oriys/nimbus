import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Play,
  Edit2,
  Trash2,
  GitBranch,
  Clock,
  RefreshCw,
  Eye,
  StopCircle,
  X,
} from 'lucide-react'
import { workflowService } from '../../services/workflows'
import type { Workflow, WorkflowExecution } from '../../types/workflow'
import {
  WORKFLOW_STATUS_COLORS,
  WORKFLOW_STATUS_LABELS,
  EXECUTION_STATUS_COLORS,
  EXECUTION_STATUS_LABELS,
} from '../../types/workflow'
import { cn, formatDuration } from '../../utils/format'
import { Skeleton } from '../../components/Skeleton'
import { useToast } from '../../components/Toast'
import Pagination from '../../components/Pagination'
import EmptyState from '../../components/EmptyState'

export default function WorkflowDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const [workflow, setWorkflow] = useState<Workflow | null>(null)
  const [executions, setExecutions] = useState<WorkflowExecution[]>([])
  const [executionTotal, setExecutionTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [executionsLoading, setExecutionsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [startingExecution, setStartingExecution] = useState(false)
  const [showStartModal, setShowStartModal] = useState(false)
  const [executionInput, setExecutionInput] = useState('{}')
  const limit = 10

  const fetchWorkflow = async () => {
    if (!id) return
    try {
      const data = await workflowService.get(id)
      setWorkflow(data)
    } catch (error) {
      console.error('Failed to fetch workflow:', error)
      toast.error('获取工作流详情失败')
      navigate('/workflows')
    } finally {
      setLoading(false)
    }
  }

  const fetchExecutions = async () => {
    if (!id) return
    setExecutionsLoading(true)
    try {
      const response = await workflowService.listExecutions(id, {
        offset: (page - 1) * limit,
        limit,
      })
      setExecutions(response.executions || [])
      setExecutionTotal(response.total)
    } catch (error) {
      console.error('Failed to fetch executions:', error)
    } finally {
      setExecutionsLoading(false)
    }
  }

  useEffect(() => {
    fetchWorkflow()
  }, [id])

  useEffect(() => {
    fetchExecutions()
  }, [id, page])

  const handleDelete = async () => {
    if (!workflow) return
    if (!confirm(`确定要删除工作流 "${workflow.name}" 吗？此操作不可撤销。`)) {
      return
    }

    try {
      await workflowService.delete(workflow.id)
      toast.success('工作流已删除')
      navigate('/workflows')
    } catch (error) {
      console.error('Failed to delete workflow:', error)
      toast.error('删除工作流失败')
    }
  }

  const handleStartExecution = async () => {
    if (!workflow) return
    setStartingExecution(true)
    try {
      let input: unknown = undefined
      if (executionInput.trim() && executionInput.trim() !== '{}') {
        try {
          input = JSON.parse(executionInput)
        } catch (e) {
          toast.error('输入格式错误，请输入有效的 JSON')
          setStartingExecution(false)
          return
        }
      }
      const execution = await workflowService.startExecution(workflow.id, { input })
      toast.success('执行已启动')
      setShowStartModal(false)
      setExecutionInput('{}')
      navigate(`/workflows/${workflow.id}/executions/${execution.id}`)
    } catch (error) {
      console.error('Failed to start execution:', error)
      toast.error('启动执行失败')
    } finally {
      setStartingExecution(false)
    }
  }

  const handleStopExecution = async (executionId: string) => {
    try {
      await workflowService.stopExecution(executionId)
      toast.success('执行已停止')
      fetchExecutions()
    } catch (error) {
      console.error('Failed to stop execution:', error)
      toast.error('停止执行失败')
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

  if (!workflow) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/workflows')}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-display font-bold text-foreground">
                {workflow.name}
              </h1>
              <span
                className={cn(
                  'px-2 py-0.5 text-xs font-medium rounded-full',
                  WORKFLOW_STATUS_COLORS[workflow.status]
                )}
              >
                {WORKFLOW_STATUS_LABELS[workflow.status]}
              </span>
              <span className="text-sm text-muted-foreground">v{workflow.version}</span>
            </div>
            {workflow.description && (
              <p className="text-sm text-muted-foreground mt-1">{workflow.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowStartModal(true)}
            disabled={workflow.status !== 'active'}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
              workflow.status === 'active'
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            )}
          >
            <Play className="w-4 h-4" />
            启动执行
          </button>
          <Link
            to={`/workflows/${workflow.id}/edit`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            编辑
          </Link>
          <button
            onClick={handleDelete}
            className="inline-flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            删除
          </button>
        </div>
      </div>

      {/* Workflow Info */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="grid grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">状态数量</p>
            <p className="text-xl font-semibold flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-accent" />
              {Object.keys(workflow.definition.states).length}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">起始状态</p>
            <p className="text-xl font-semibold">{workflow.definition.start_at}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">超时时间</p>
            <p className="text-xl font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5 text-accent" />
              {workflow.timeout_sec}s
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">更新时间</p>
            <p className="text-lg font-semibold">
              {new Date(workflow.updated_at).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Workflow Definition Preview */}
      <div className="bg-card border border-border rounded-lg">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-lg font-semibold">工作流定义</h2>
          <Link
            to={`/workflows/${workflow.id}/edit`}
            className="text-sm text-accent hover:underline"
          >
            可视化编辑
          </Link>
        </div>
        <div className="p-4">
          <pre className="text-sm font-mono bg-muted/50 rounded-lg p-4 overflow-auto max-h-64">
            {JSON.stringify(workflow.definition, null, 2)}
          </pre>
        </div>
      </div>

      {/* Executions */}
      <div className="bg-card border border-border rounded-lg">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-lg font-semibold">执行历史</h2>
          <button
            onClick={fetchExecutions}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            title="刷新"
          >
            <RefreshCw className={cn('w-4 h-4', executionsLoading && 'animate-spin')} />
          </button>
        </div>
        <div className="p-4">
          {executionsLoading && executions.length === 0 ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : executions.length === 0 ? (
            <EmptyState
              type="invocations"
              title="暂无执行记录"
              description="点击「启动执行」运行此工作流"
            />
          ) : (
            <div className="space-y-2">
              {executions.map((execution) => (
                <div
                  key={execution.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span
                      className={cn(
                        'px-2 py-0.5 text-xs font-medium rounded-full',
                        EXECUTION_STATUS_COLORS[execution.status]
                      )}
                    >
                      {EXECUTION_STATUS_LABELS[execution.status]}
                    </span>
                    <div>
                      <p className="text-sm font-mono text-muted-foreground">
                        {execution.id.slice(0, 8)}...
                      </p>
                      {execution.current_state && (
                        <p className="text-xs text-muted-foreground">
                          当前状态: {execution.current_state}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right text-sm text-muted-foreground">
                      <p>
                        开始: {execution.started_at
                          ? new Date(execution.started_at).toLocaleString()
                          : '-'}
                      </p>
                      {execution.completed_at && (
                        <p>
                          耗时: {formatDuration(
                            new Date(execution.completed_at).getTime() -
                              new Date(execution.started_at!).getTime()
                          )}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {(execution.status === 'running' || execution.status === 'pending') && (
                        <button
                          onClick={() => handleStopExecution(execution.id)}
                          className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                          title="停止执行"
                        >
                          <StopCircle className="w-4 h-4" />
                        </button>
                      )}
                      <Link
                        to={`/workflows/${workflow.id}/executions/${execution.id}`}
                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                        title="查看详情"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {executionTotal > limit && (
            <div className="mt-4">
              <Pagination
                page={page}
                pageSize={limit}
                total={executionTotal}
                onChange={setPage}
              />
            </div>
          )}
        </div>
      </div>

      {/* Start Execution Modal */}
      {showStartModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowStartModal(false)}
          />
          <div className="relative bg-card border border-border rounded-lg shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="text-lg font-semibold">启动工作流执行</h3>
              <button
                onClick={() => setShowStartModal(false)}
                className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  执行输入 (JSON 格式)
                </label>
                <textarea
                  value={executionInput}
                  onChange={(e) => setExecutionInput(e.target.value)}
                  className="w-full h-48 px-3 py-2 text-sm font-mono bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                  placeholder='{"key": "value"}'
                />
                <p className="text-xs text-muted-foreground mt-1">
                  输入数据将作为工作流起始状态的输入
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowStartModal(false)}
                  className="px-4 py-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleStartExecution}
                  disabled={startingExecution}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Play className="w-4 h-4" />
                  {startingExecution ? '启动中...' : '启动执行'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
