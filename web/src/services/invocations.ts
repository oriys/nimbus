import api from './api'
import type { Invocation } from '../types/invocation'

interface ListInvocationsResponse {
  invocations: Invocation[]
  total: number
}

interface ListInvocationsParams {
  function_id?: string
  status?: string
  page?: number
  limit?: number
}

export const invocationService = {
  // 获取调用列表
  list: async (params?: ListInvocationsParams): Promise<ListInvocationsResponse> => {
    // Convert page to offset for backend API
    const apiParams: Record<string, unknown> = { ...params }
    if (params?.page && params?.limit) {
      apiParams.offset = (params.page - 1) * params.limit
      delete apiParams.page
    }
    return api.get('/v1/invocations', { params: apiParams })
  },

  // 获取函数的调用列表
  listByFunction: async (functionId: string, params?: Omit<ListInvocationsParams, 'function_id'>): Promise<ListInvocationsResponse> => {
    // Convert page to offset for backend API
    const apiParams: Record<string, unknown> = { ...params }
    if (params?.page && params?.limit) {
      apiParams.offset = (params.page - 1) * params.limit
      delete apiParams.page
    }
    return api.get(`/v1/functions/${functionId}/invocations`, { params: apiParams })
  },

  // 获取单个调用详情
  get: async (id: string): Promise<Invocation> => {
    return api.get(`/v1/invocations/${id}`)
  },

  // 重放调用
  replay: async (id: string): Promise<{
    request_id: string
    original_invocation: string
    status_code: number
    body: unknown
    duration_ms: number
    cold_start: boolean
    billed_time_ms: number
  }> => {
    return api.post(`/v1/invocations/${id}/replay`)
  },
}
