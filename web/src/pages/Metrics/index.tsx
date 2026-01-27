import { useState, useEffect } from 'react'
import ReactECharts from 'echarts-for-react'
import { RefreshCw, AlertCircle, Activity, Server, Clock } from 'lucide-react'
import { metricsService } from '../../services'
import type { SystemStatus, PoolStats } from '../../types'
import { cn } from '../../utils'

export default function Metrics() {
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadStatus = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await metricsService.getSystemStatus()
      setStatus(data)
    } catch (err) {
      console.error('Failed to load status:', err)
      setError('加载系统状态失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStatus()
    const interval = setInterval(loadStatus, 10000)
    return () => clearInterval(interval)
  }, [])

  const getPoolChartOption = (pool: PoolStats) => ({
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)',
      backgroundColor: 'oklch(0.12 0 0)',
      borderColor: 'oklch(0.22 0 0)',
      textStyle: { color: 'oklch(0.98 0 0)' },
    },
    series: [
      {
        type: 'pie',
        radius: ['60%', '80%'],
        avoidLabelOverlap: false,
        label: { show: false },
        data: [
          { value: pool.warm_vms, name: '预热', itemStyle: { color: 'oklch(0.696 0.17 162.48)' } },
          { value: pool.busy_vms, name: '忙碌', itemStyle: { color: 'oklch(0.828 0.189 84.429)' } },
          { value: pool.max_vms - pool.total_vms, name: '可用', itemStyle: { color: 'oklch(0.22 0 0)' } },
        ],
      },
    ],
  })

  return (
    <div className="space-y-6">
      {/* 页头 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">系统监控</h1>
          <p className="text-muted-foreground mt-1">查看系统运行状态和资源使用情况</p>
        </div>
        <button
          onClick={loadStatus}
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
        >
          <RefreshCw className={cn('w-5 h-5', loading && 'animate-spin')} />
        </button>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 flex items-center text-destructive">
          <AlertCircle className="w-5 h-5 mr-2" />
          <span className="text-sm">{error}</span>
          <button
            onClick={loadStatus}
            className="ml-auto text-sm text-destructive hover:text-destructive/80 underline transition-colors"
          >
            重试
          </button>
        </div>
      )}

      {/* 系统状态 */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">系统状态</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-center gap-4">
            <div className={cn(
              'flex h-12 w-12 items-center justify-center rounded-lg',
              status?.status === 'healthy' ? 'bg-green-400/10' :
              status?.status === 'degraded' ? 'bg-yellow-400/10' : 'bg-red-400/10'
            )}>
              <Activity className={cn(
                'w-6 h-6',
                status?.status === 'healthy' ? 'text-green-400' :
                status?.status === 'degraded' ? 'text-yellow-400' : 'text-red-400'
              )} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">状态</p>
              <p className="text-lg font-medium text-foreground flex items-center">
                <span className={cn(
                  'w-2 h-2 rounded-full mr-2',
                  status?.status === 'healthy' ? 'bg-green-400' :
                  status?.status === 'degraded' ? 'bg-yellow-400' : 'bg-red-400'
                )} />
                {status?.status === 'healthy' ? '健康' :
                 status?.status === 'degraded' ? '降级' : '异常'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-400/10">
              <Server className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">版本</p>
              <p className="text-lg font-medium text-foreground">{status?.version || '-'}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-400/10">
              <Clock className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">运行时间</p>
              <p className="text-lg font-medium text-foreground">{status?.uptime || '-'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 虚拟机池状态 */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">虚拟机池</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {status?.pool_stats?.map((pool) => (
            <div key={pool.runtime} className="border border-border rounded-lg p-4 bg-secondary/30">
              <h3 className="font-medium text-foreground mb-4">{pool.runtime}</h3>
              <div className="flex items-center">
                <div className="w-24 h-24">
                  <ReactECharts
                    option={getPoolChartOption(pool)}
                    style={{ height: '100%', width: '100%' }}
                    opts={{ renderer: 'svg' }}
                  />
                </div>
                <div className="ml-4 space-y-2 text-sm">
                  <div className="flex items-center">
                    <span className="w-3 h-3 rounded-full bg-green-400 mr-2" />
                    <span className="text-muted-foreground">预热: {pool.warm_vms}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-3 h-3 rounded-full bg-yellow-400 mr-2" />
                    <span className="text-muted-foreground">忙碌: {pool.busy_vms}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-3 h-3 rounded-full bg-secondary mr-2" />
                    <span className="text-muted-foreground">总计: {pool.total_vms}/{pool.max_vms}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Prometheus 指标链接 */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">更多指标</h2>
        <p className="text-muted-foreground mb-4">
          查看完整的 Prometheus 指标和 Grafana 仪表板
        </p>
        <div className="flex gap-4">
          <a
            href="/metrics"
            target="_blank"
            className="px-4 py-2 border border-border rounded-lg text-foreground hover:bg-secondary transition-colors"
          >
            Prometheus 指标
          </a>
          <a
            href="http://localhost:3001"
            target="_blank"
            className="px-4 py-2 border border-border rounded-lg text-foreground hover:bg-secondary transition-colors"
          >
            Grafana 仪表板
          </a>
        </div>
      </div>
    </div>
  )
}
