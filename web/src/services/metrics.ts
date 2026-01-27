import api from './api'
import type {
  DashboardStats,
  TrendDataPoint,
  SystemStatus,
  TopFunction,
  RecentInvocation,
  FunctionStats,
  LatencyDistribution,
} from '../types/metrics'

export const metricsService = {
  // 获取仪表板统计数据
  getDashboardStats: async (period: string = '24h'): Promise<DashboardStats> => {
    return api.get('/console/dashboard/stats', { params: { period } })
  },

  // 获取调用趋势数据
  getInvocationTrends: async (
    period: string = '24h',
    granularity: string = '1h'
  ): Promise<TrendDataPoint[]> => {
    const response = await api.get('/console/dashboard/trends', {
      params: { period, granularity },
    })
    return response.data || response
  },

  // 获取系统状态
  getSystemStatus: async (): Promise<SystemStatus> => {
    return api.get('/console/system/status')
  },

  // 获取热门函数
  getTopFunctions: async (period: string = '24h', limit: number = 5): Promise<TopFunction[]> => {
    const response = await api.get('/console/dashboard/top-functions', {
      params: { period, limit },
    })
    return response.data || response
  },

  // 获取最近调用
  getRecentInvocations: async (limit: number = 10): Promise<RecentInvocation[]> => {
    const response = await api.get('/console/dashboard/recent-invocations', {
      params: { limit },
    })
    return response.data || response
  },

  // 获取函数统计数据
  getFunctionStats: async (functionId: string, period: string = '24h'): Promise<FunctionStats> => {
    return api.get(`/console/functions/${functionId}/stats`, { params: { period } })
  },

  // 获取函数趋势数据
  getFunctionTrends: async (functionId: string, period: string = '24h'): Promise<TrendDataPoint[]> => {
    const response = await api.get(`/console/functions/${functionId}/trends`, {
      params: { period },
    })
    return response.data || response
  },

  // 获取函数延迟分布
  getFunctionLatencyDistribution: async (functionId: string, period: string = '24h'): Promise<LatencyDistribution[]> => {
    const response = await api.get(`/console/functions/${functionId}/latency-distribution`, {
      params: { period },
    })
    return response.data || response
  },
}
