// 指标相关类型定义

export interface DashboardStats {
  total_invocations: number
  success_rate: number
  p99_latency_ms: number
  cold_start_rate: number
  total_functions: number
  active_functions: number
  invocations_change: number
  success_rate_change: number
  latency_change: number
  cold_start_change: number
}

export interface TrendDataPoint {
  timestamp: string
  invocations: number
  errors: number
  avg_latency_ms: number
}

export interface PoolStats {
  runtime: string
  warm_vms: number
  busy_vms: number
  total_vms: number
  max_vms: number
}

export interface SystemStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  version: string
  uptime: string
  pool_stats: PoolStats[]
}

export interface TopFunction {
  function_id: string
  function_name: string
  invocations: number
  percentage: number
}

export interface RecentInvocation {
  id: string
  function_name: string
  status: string
  duration_ms: number
  created_at: string
}

// 函数级别统计
export interface FunctionStats {
  total_invocations: number
  success_count: number
  failed_count: number
  success_rate: number
  avg_latency_ms: number
  p50_latency_ms: number
  p95_latency_ms: number
  p99_latency_ms: number
  min_latency_ms: number
  max_latency_ms: number
  cold_start_count: number
  cold_start_rate: number
  avg_cold_start_ms: number
  total_duration_ms: number
  error_rate: number
  timeout_count: number
}

// 延迟分布
export interface LatencyDistribution {
  bucket: string
  count: number
}
