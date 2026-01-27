import api from './api'
import type {
  Function,
  CreateFunctionRequest,
  UpdateFunctionRequest,
  FunctionVersion,
  FunctionAlias,
  CreateAliasRequest,
  UpdateAliasRequest,
  FunctionLayer,
  Layer,
  CreateLayerRequest,
  Environment,
  CreateEnvironmentRequest,
  FunctionEnvConfig,
  UpdateFunctionEnvConfigRequest,
  FunctionTask,
} from '../types/function'
import type { InvokeAsyncResponse, InvokeResponse } from '../types/invocation'

interface ListFunctionsResponse {
  functions: Function[]
  total: number
}

interface ListFunctionsParams {
  runtime?: string
  status?: string
  page?: number
  limit?: number
  search?: string
}

interface CompileRequest {
  runtime: string
  code: string
}

interface CompileResponse {
  binary: string
  success: boolean
  error?: string
  output?: string
}

// 创建/更新函数的异步响应
interface AsyncFunctionResponse {
  function: Function
  task_id: string
  message: string
}

// 任务状态响应
interface GetTaskResponse {
  task: FunctionTask
  function: Function
}

export const functionService = {
  // 获取函数列表
  list: async (params?: ListFunctionsParams): Promise<ListFunctionsResponse> => {
    // Convert page to offset for backend API
    const apiParams: Record<string, unknown> = { ...params }
    if (params?.page && params?.limit) {
      apiParams.offset = (params.page - 1) * params.limit
      delete apiParams.page
    }
    return api.get('/v1/functions', { params: apiParams })
  },

  // 获取单个函数
  get: async (id: string): Promise<Function> => {
    return api.get(`/v1/functions/${id}`)
  },

  // 创建函数（异步，返回 task_id）
  create: async (data: CreateFunctionRequest): Promise<AsyncFunctionResponse> => {
    return api.post('/v1/functions', data)
  },

  // 更新函数（可能异步，返回 task_id）
  update: async (id: string, data: UpdateFunctionRequest): Promise<Function | AsyncFunctionResponse> => {
    return api.put(`/v1/functions/${id}`, data)
  },

  // 删除函数
  delete: async (id: string): Promise<void> => {
    return api.delete(`/v1/functions/${id}`)
  },

  // 克隆函数
  clone: async (id: string, newName: string, description?: string): Promise<AsyncFunctionResponse & { cloned_from: string; cloned_from_id: string }> => {
    return api.post(`/v1/functions/${id}/clone`, { name: newName, description })
  },

  // 下线函数
  offline: async (id: string): Promise<Function> => {
    return api.post(`/v1/functions/${id}/offline`)
  },

  // 上线函数
  online: async (id: string): Promise<Function> => {
    return api.post(`/v1/functions/${id}/online`)
  },

  // 置顶/取消置顶函数
  pin: async (id: string): Promise<Function> => {
    return api.post(`/v1/functions/${id}/pin`)
  },

  // 导出函数配置
  export: async (id: string): Promise<unknown> => {
    return api.get(`/v1/functions/${id}/export`)
  },

  // 导入函数配置
  import: async (data: unknown): Promise<AsyncFunctionResponse> => {
    return api.post('/v1/functions/import', data)
  },

  // 同步调用函数
  invoke: async (id: string, payload: unknown): Promise<InvokeResponse> => {
    return api.post(`/v1/functions/${id}/invoke`, payload)
  },

  // 异步调用函数
  invokeAsync: async (id: string, payload: unknown): Promise<InvokeAsyncResponse> => {
    return api.post(`/v1/functions/${id}/async`, payload)
  },

  // 测试函数（控制台专用，带更详细的输出）
  test: async (id: string, payload: unknown): Promise<InvokeResponse & { logs?: string[] }> => {
    return api.post(`/console/functions/${id}/test`, payload)
  },

  // 编译源代码（Go/Rust）
  compile: async (data: CompileRequest): Promise<CompileResponse> => {
    return api.post('/v1/compile', data)
  },

  // ==================== 任务管理 ====================

  // 获取任务状态
  getTask: async (taskId: string): Promise<GetTaskResponse> => {
    return api.get(`/v1/tasks/${taskId}`)
  },

  // ==================== 版本管理 ====================

  // 获取函数版本列表
  listVersions: async (functionId: string): Promise<FunctionVersion[]> => {
    const resp: { versions: FunctionVersion[], total: number } = await api.get(`/v1/functions/${functionId}/versions`)
    return resp.versions || []
  },

  // 获取指定版本
  getVersion: async (functionId: string, version: number): Promise<FunctionVersion> => {
    return api.get(`/v1/functions/${functionId}/versions/${version}`)
  },

  // 回滚到指定版本
  rollback: async (functionId: string, version: number): Promise<Function> => {
    return api.post(`/v1/functions/${functionId}/versions/${version}/rollback`)
  },

  // ==================== 别名管理 ====================

  // 获取函数别名列表
  listAliases: async (functionId: string): Promise<FunctionAlias[]> => {
    const resp: { aliases: FunctionAlias[], total: number } = await api.get(`/v1/functions/${functionId}/aliases`)
    return resp.aliases || []
  },

  // 创建函数别名
  createAlias: async (functionId: string, data: CreateAliasRequest): Promise<FunctionAlias> => {
    return api.post(`/v1/functions/${functionId}/aliases`, data)
  },

  // 更新函数别名
  updateAlias: async (functionId: string, name: string, data: UpdateAliasRequest): Promise<FunctionAlias> => {
    return api.put(`/v1/functions/${functionId}/aliases/${name}`, data)
  },

  // 删除函数别名
  deleteAlias: async (functionId: string, name: string): Promise<void> => {
    return api.delete(`/v1/functions/${functionId}/aliases/${name}`)
  },

  // ==================== 函数层管理 ====================

  // 获取函数的层
  getFunctionLayers: async (functionId: string): Promise<FunctionLayer[]> => {
    const resp: { layers: FunctionLayer[], total: number } = await api.get(`/v1/functions/${functionId}/layers`)
    return resp.layers || []
  },

  // 设置函数的层
  setFunctionLayers: async (functionId: string, layers: Array<{layer_id: string, layer_version: number, order: number}>): Promise<void> => {
    return api.put(`/v1/functions/${functionId}/layers`, { layers })
  },

  // ==================== 环境配置管理 ====================

  // 获取函数环境配置列表
  getFunctionEnvConfigs: async (functionId: string): Promise<FunctionEnvConfig[]> => {
    const resp: { configs: FunctionEnvConfig[], total: number } = await api.get(`/v1/functions/${functionId}/environments`)
    return resp.configs || []
  },

  // 更新函数环境配置
  updateFunctionEnvConfig: async (functionId: string, envName: string, data: UpdateFunctionEnvConfigRequest): Promise<FunctionEnvConfig> => {
    return api.put(`/v1/functions/${functionId}/environments/${envName}`, data)
  },

  // ==================== Webhook 管理 ====================

  // 启用 Webhook
  enableWebhook: async (functionId: string): Promise<WebhookResponse> => {
    return api.post(`/v1/functions/${functionId}/webhook/enable`)
  },

  // 禁用 Webhook
  disableWebhook: async (functionId: string): Promise<{ id: string; webhook_enabled: boolean }> => {
    return api.post(`/v1/functions/${functionId}/webhook/disable`)
  },

  // 重新生成 Webhook 密钥
  regenerateWebhookKey: async (functionId: string): Promise<WebhookResponse> => {
    return api.post(`/v1/functions/${functionId}/webhook/regenerate`)
  },
}

// Webhook 响应类型
interface WebhookResponse {
  id: string
  webhook_enabled: boolean
  webhook_key: string
  webhook_url: string
}

// ==================== 层服务 ====================

interface ListLayersResponse {
  layers: Layer[]
  total: number
}

export const layerService = {
  // 获取层列表
  list: async (): Promise<ListLayersResponse> => {
    return api.get('/v1/layers')
  },

  // 获取层详情
  get: async (id: string): Promise<Layer> => {
    return api.get(`/v1/layers/${id}`)
  },

  // 创建层
  create: async (data: CreateLayerRequest): Promise<Layer> => {
    return api.post('/v1/layers', data)
  },

  // 删除层
  delete: async (id: string): Promise<void> => {
    return api.delete(`/v1/layers/${id}`)
  },

  // 上传层版本内容
  uploadVersion: async (layerId: string, file: File): Promise<{version: number}> => {
    const formData = new FormData()
    formData.append('content', file)
    return api.post(`/v1/layers/${layerId}/versions`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },
}

// ==================== 环境服务 ====================

interface ListEnvironmentsResponse {
  environments: Environment[]
}

export const environmentService = {
  // 获取环境列表
  list: async (): Promise<ListEnvironmentsResponse> => {
    return api.get('/v1/environments')
  },

  // 创建环境
  create: async (data: CreateEnvironmentRequest): Promise<Environment> => {
    return api.post('/v1/environments', data)
  },

  // 删除环境
  delete: async (id: string): Promise<void> => {
    return api.delete(`/v1/environments/${id}`)
  },
}

// ==================== 死信队列服务 ====================

import type { DeadLetterMessage } from '../types/function'

interface ListDLQResponse {
  messages: DeadLetterMessage[]
  total: number
}

interface DLQStatsResponse {
  total: number
  function_id?: string
}

interface RetryDLQResponse {
  success: boolean
  message: DeadLetterMessage
  response?: unknown
  retry_error?: string
}

export const dlqService = {
  // 获取死信消息列表
  list: async (params?: { function_id?: string; status?: string; offset?: number; limit?: number }): Promise<ListDLQResponse> => {
    return api.get('/v1/dlq', { params })
  },

  // 获取死信消息详情
  get: async (id: string): Promise<DeadLetterMessage> => {
    return api.get(`/v1/dlq/${id}`)
  },

  // 获取死信队列统计
  stats: async (functionId?: string): Promise<DLQStatsResponse> => {
    return api.get('/v1/dlq/stats', { params: { function_id: functionId } })
  },

  // 重试死信消息
  retry: async (id: string): Promise<RetryDLQResponse> => {
    return api.post(`/v1/dlq/${id}/retry`)
  },

  // 丢弃死信消息
  discard: async (id: string): Promise<DeadLetterMessage> => {
    return api.post(`/v1/dlq/${id}/discard`)
  },

  // 删除死信消息
  delete: async (id: string): Promise<void> => {
    return api.delete(`/v1/dlq/${id}`)
  },

  // 清空死信队列
  purge: async (functionId?: string): Promise<{ deleted: number }> => {
    return api.delete('/v1/dlq', { params: { function_id: functionId } })
  },
}
