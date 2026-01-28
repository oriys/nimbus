import api from './api'

// Session 会话信息
export interface Session {
  function_id: string
  session_key: string
  vm_id: string
  created_at: string
  last_used_at: string
  invocation_count: number
  total_size?: number
  state_keys?: string[]
}

// StateKeyInfo 状态键信息
export interface StateKeyInfo {
  key: string
  size: number
  ttl: number
}

// SessionState 会话状态
export interface SessionState {
  session_key: string
  keys: StateKeyInfo[]
  total_size: number
}

// ListSessionsResponse 会话列表响应
export interface ListSessionsResponse {
  sessions: Session[]
  total: number
}

// SnapshotInfo 快照信息
export interface SnapshotInfo {
  id: string
  function_id: string
  version: number
  code_hash: string
  runtime: string
  memory_mb: number
  env_vars_hash: string
  snapshot_path: string
  mem_file_size: number
  state_file_size: number
  status: 'building' | 'ready' | 'failed' | 'expired'
  error_message?: string
  restore_count: number
  avg_restore_ms: number
  created_at: string
  last_used_at?: string
  expires_at?: string
}

// SnapshotStats 快照统计
export interface SnapshotStats {
  total_snapshots: number
  ready_snapshots: number
  building_snapshots: number
  failed_snapshots: number
  total_size_bytes: number
  avg_restore_ms: number
}

// 会话管理服务
export const sessionService = {
  // 列出函数的所有会话
  list: (functionId: string, limit = 20): Promise<ListSessionsResponse> => {
    return api.get(`/v1/functions/${functionId}/sessions`, { params: { limit } })
  },

  // 获取会话详情
  get: (functionId: string, sessionKey: string): Promise<Session> => {
    return api.get(`/v1/functions/${functionId}/sessions/${sessionKey}`)
  },

  // 删除会话
  delete: (functionId: string, sessionKey: string): Promise<void> => {
    return api.delete(`/v1/functions/${functionId}/sessions/${sessionKey}`)
  },

  // 获取会话状态
  getState: (functionId: string, sessionKey: string): Promise<SessionState> => {
    return api.get(`/v1/functions/${functionId}/state/${sessionKey}`)
  },

  // 删除会话状态
  deleteState: (functionId: string, sessionKey: string): Promise<void> => {
    return api.delete(`/v1/functions/${functionId}/state/${sessionKey}`)
  },

  // 删除指定状态键
  deleteStateKey: (functionId: string, sessionKey: string, key: string): Promise<void> => {
    return api.delete(`/v1/functions/${functionId}/state/${sessionKey}/${key}`)
  },
}

// 快照管理服务
export const snapshotService = {
  // 列出函数的所有快照
  list: (functionId: string): Promise<SnapshotInfo[]> => {
    return api.get(`/v1/functions/${functionId}/snapshots`)
  },

  // 获取快照统计
  getStats: (): Promise<SnapshotStats> => {
    return api.get('/v1/snapshots/stats')
  },

  // 构建快照
  build: (functionId: string, version: number): Promise<{ snapshot_id: string }> => {
    return api.post(`/v1/functions/${functionId}/snapshots`, { version })
  },

  // 删除快照
  delete: (functionId: string, snapshotId: string): Promise<void> => {
    return api.delete(`/v1/functions/${functionId}/snapshots/${snapshotId}`)
  },
}

export default { sessionService, snapshotService }
