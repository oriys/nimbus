// 调用相关类型定义

export type InvocationStatus = 'pending' | 'running' | 'success' | 'failed' | 'timeout' | 'cancelled'

export interface Invocation {
  id: string
  function_id: string
  function_name: string
  status: InvocationStatus
  input?: Record<string, unknown> | null
  output?: Record<string, unknown> | null
  error?: string
  duration_ms: number
  billed_time_ms: number
  cold_start: boolean
  started_at?: string
  completed_at?: string
  created_at: string
}

export interface InvokeRequest {
  payload: unknown
}

export interface InvokeResponse {
  request_id: string
  status_code: number
  body?: unknown
  error?: string
  duration_ms: number
  cold_start: boolean
  billed_time_ms: number
}

export interface InvokeAsyncResponse {
  request_id: string
  status: string
}

export const INVOCATION_STATUS_COLORS: Record<InvocationStatus, string> = {
  'pending': 'bg-gray-100 text-gray-800',
  'running': 'bg-blue-100 text-blue-800',
  'success': 'bg-green-100 text-green-800',
  'failed': 'bg-red-100 text-red-800',
  'timeout': 'bg-orange-100 text-orange-800',
  'cancelled': 'bg-gray-100 text-gray-800',
}
