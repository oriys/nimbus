import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Clock, Zap, AlertCircle, CheckCircle2, XCircle, Timer, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { invocationService } from '../../services/invocations'
import type { Invocation, InvocationStatus } from '../../types/invocation'
import { cn } from '../../utils'

const STATUS_CONFIG: Record<InvocationStatus, { icon: React.ElementType; className: string; label: string }> = {
  pending: { icon: Clock, className: 'text-muted-foreground bg-secondary', label: '等待中' },
  running: { icon: Loader2, className: 'text-blue-400 bg-blue-400/10', label: '运行中' },
  success: { icon: CheckCircle2, className: 'text-green-400 bg-green-400/10', label: '成功' },
  failed: { icon: XCircle, className: 'text-red-400 bg-red-400/10', label: '失败' },
  timeout: { icon: Timer, className: 'text-orange-400 bg-orange-400/10', label: '超时' },
  cancelled: { icon: XCircle, className: 'text-muted-foreground bg-secondary', label: '已取消' },
}

export default function InvocationDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [invocation, setInvocation] = useState<Invocation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return

    const fetchInvocation = async () => {
      try {
        setLoading(true)
        const data = await invocationService.get(id)
        setInvocation(data)
      } catch (err) {
        setError('加载调用详情失败')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchInvocation()
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    )
  }

  if (error || !invocation) {
    return (
      <div className="space-y-6">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/invocations')}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg mr-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-foreground">调用详情</h1>
        </div>
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-center text-destructive py-8">
            <AlertCircle className="w-5 h-5 mr-2" />
            <span>{error || '调用不存在'}</span>
          </div>
        </div>
      </div>
    )
  }

  const statusConfig = STATUS_CONFIG[invocation.status]
  const StatusIcon = statusConfig.icon

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/invocations')}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg mr-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">调用详情</h1>
            <p className="text-muted-foreground mt-1 font-mono text-sm">{invocation.id}</p>
          </div>
        </div>
        <div className={cn('flex items-center px-3 py-1.5 rounded-full', statusConfig.className)}>
          <StatusIcon className={cn('w-4 h-4 mr-1.5', invocation.status === 'running' && 'animate-spin')} />
          <span className="text-sm font-medium">{statusConfig.label}</span>
        </div>
      </div>

      {/* 基本信息卡片 */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">基本信息</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-muted-foreground">函数名称</p>
            <Link
              to={`/functions/${invocation.function_id}`}
              className="text-accent hover:text-accent/80 font-medium transition-colors"
            >
              {invocation.function_name}
            </Link>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">执行时间</p>
            <p className="font-medium text-foreground flex items-center">
              <Clock className="w-4 h-4 mr-1 text-muted-foreground" />
              {invocation.duration_ms} ms
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">计费时间</p>
            <p className="font-medium text-foreground">{invocation.billed_time_ms} ms</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">冷启动</p>
            <p className="font-medium flex items-center">
              {invocation.cold_start ? (
                <>
                  <Zap className="w-4 h-4 mr-1 text-orange-400" />
                  <span className="text-orange-400">是</span>
                </>
              ) : (
                <span className="text-green-400">否</span>
              )}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mt-6 pt-6 border-t border-border">
          <div>
            <p className="text-sm text-muted-foreground">创建时间</p>
            <p className="font-medium text-foreground">{new Date(invocation.created_at).toLocaleString()}</p>
          </div>
          {invocation.started_at && (
            <div>
              <p className="text-sm text-muted-foreground">开始时间</p>
              <p className="font-medium text-foreground">{new Date(invocation.started_at).toLocaleString()}</p>
            </div>
          )}
          {invocation.completed_at && (
            <div>
              <p className="text-sm text-muted-foreground">完成时间</p>
              <p className="font-medium text-foreground">{new Date(invocation.completed_at).toLocaleString()}</p>
            </div>
          )}
        </div>
      </div>

      {/* 输入参数 */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">输入参数</h2>
        <pre className="bg-secondary p-4 rounded-lg overflow-x-auto text-sm text-foreground font-mono">
          {invocation.input ? JSON.stringify(invocation.input, null, 2) : '(无)'}
        </pre>
      </div>

      {/* 输出结果 / 错误信息 */}
      {invocation.status === 'success' && invocation.output && (
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">输出结果</h2>
          <pre className="bg-secondary p-4 rounded-lg overflow-x-auto text-sm text-foreground font-mono">
            {JSON.stringify(invocation.output, null, 2)}
          </pre>
        </div>
      )}

      {invocation.status === 'failed' && invocation.error && (
        <div className="bg-card rounded-xl border border-border p-6 border-l-4 border-l-destructive">
          <h2 className="text-lg font-semibold text-destructive mb-4 flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            错误信息
          </h2>
          <pre className="bg-destructive/10 text-destructive p-4 rounded-lg overflow-x-auto text-sm whitespace-pre-wrap font-mono">
            {invocation.error}
          </pre>
        </div>
      )}
    </div>
  )
}
