import api from './api'
import type {
  Workflow,
  WorkflowExecution,
  CreateWorkflowRequest,
  UpdateWorkflowRequest,
  StartExecutionRequest,
  WorkflowListResponse,
  ExecutionListResponse,
  ExecutionResponse,
  Breakpoint,
} from '../types/workflow'

interface ListWorkflowsParams {
  offset?: number
  limit?: number
}

interface ListExecutionsParams {
  offset?: number
  limit?: number
}

export const workflowService = {
  // ==================== 工作流管理 ====================

  // 创建工作流
  create: async (data: CreateWorkflowRequest): Promise<Workflow> => {
    return api.post('/v1/workflows', data)
  },

  // 获取工作流列表
  list: async (params?: ListWorkflowsParams): Promise<WorkflowListResponse> => {
    return api.get('/v1/workflows', { params })
  },

  // 获取工作流详情
  get: async (id: string): Promise<Workflow> => {
    return api.get(`/v1/workflows/${id}`)
  },

  // 更新工作流
  update: async (id: string, data: UpdateWorkflowRequest): Promise<Workflow> => {
    return api.put(`/v1/workflows/${id}`, data)
  },

  // 删除工作流
  delete: async (id: string): Promise<void> => {
    return api.delete(`/v1/workflows/${id}`)
  },

  // ==================== 执行管理 ====================

  // 启动工作流执行
  startExecution: async (workflowId: string, data?: StartExecutionRequest): Promise<WorkflowExecution> => {
    return api.post(`/v1/workflows/${workflowId}/executions`, data || {})
  },

  // 获取工作流的执行列表
  listExecutions: async (workflowId: string, params?: ListExecutionsParams): Promise<ExecutionListResponse> => {
    return api.get(`/v1/workflows/${workflowId}/executions`, { params })
  },

  // 获取所有执行列表
  listAllExecutions: async (params?: ListExecutionsParams): Promise<ExecutionListResponse> => {
    return api.get('/v1/executions', { params })
  },

  // 获取执行详情
  getExecution: async (id: string): Promise<WorkflowExecution> => {
    return api.get(`/v1/executions/${id}`)
  },

  // 停止执行
  stopExecution: async (id: string): Promise<WorkflowExecution> => {
    return api.post(`/v1/executions/${id}/stop`)
  },

  // 获取执行历史
  getExecutionHistory: async (id: string): Promise<ExecutionResponse> => {
    return api.get(`/v1/executions/${id}/history`)
  },

  // ==================== 断点管理 ====================

  // 设置断点
  setBreakpoint: async (executionId: string, beforeState: string): Promise<Breakpoint> => {
    return api.post(`/v1/executions/${executionId}/breakpoints`, { before_state: beforeState })
  },

  // 列出断点
  listBreakpoints: async (executionId: string): Promise<Breakpoint[]> => {
    return api.get(`/v1/executions/${executionId}/breakpoints`)
  },

  // 删除断点
  deleteBreakpoint: async (executionId: string, beforeState: string): Promise<void> => {
    return api.delete(`/v1/executions/${executionId}/breakpoints/${encodeURIComponent(beforeState)}`)
  },

  // 恢复执行
  resumeExecution: async (executionId: string, input?: unknown): Promise<WorkflowExecution> => {
    return api.post(`/v1/executions/${executionId}/resume`, input !== undefined ? { input } : {})
  },
}
