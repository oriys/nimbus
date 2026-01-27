import api from './api'

export interface LogEntry {
  timestamp: string
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | string
  function_id: string
  function_name: string
  message: string
  request_id?: string
  input?: unknown
  output?: unknown
  error?: string
  duration_ms?: number
}

export interface ListLogsParams {
  limit?: number
  offset?: number
  function_id?: string
  function_name?: string
  request_id?: string
  level?: string
  before?: string
  after?: string
}

export interface ListLogsResponse {
  data: LogEntry[]
}

export const logsService = {
  list: async (params?: ListLogsParams): Promise<ListLogsResponse> => {
    return api.get('/console/logs', { params })
  },
}

