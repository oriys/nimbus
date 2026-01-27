import api from './api'
import type {
  Template,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  CreateFunctionFromTemplateRequest,
  TemplateListResponse,
  TemplateCategory,
} from '../types'
import type { Runtime, Function, FunctionTask } from '../types'

// 模板列表查询参数
interface ListTemplatesParams {
  page?: number
  limit?: number
  category?: TemplateCategory
  runtime?: Runtime
}

// 从模板创建函数的响应
interface CreateFunctionFromTemplateResponse {
  function: Function
  task_id: string
  message: string
}

// 模板服务
export const templateService = {
  // 获取模板列表
  list: async (params: ListTemplatesParams = {}): Promise<TemplateListResponse> => {
    const { page = 1, limit = 20, category, runtime } = params
    const offset = (page - 1) * limit
    const queryParams = new URLSearchParams()
    queryParams.append('offset', String(offset))
    queryParams.append('limit', String(limit))
    if (category) queryParams.append('category', category)
    if (runtime) queryParams.append('runtime', runtime)
    return api.get(`/v1/templates?${queryParams.toString()}`)
  },

  // 获取单个模板
  get: async (id: string): Promise<Template> => {
    return api.get(`/v1/templates/${id}`)
  },

  // 创建模板
  create: async (data: CreateTemplateRequest): Promise<Template> => {
    return api.post('/v1/templates', data)
  },

  // 更新模板
  update: async (id: string, data: UpdateTemplateRequest): Promise<Template> => {
    return api.put(`/v1/templates/${id}`, data)
  },

  // 删除模板
  delete: async (id: string): Promise<void> => {
    return api.delete(`/v1/templates/${id}`)
  },

  // 从模板创建函数
  createFunction: async (
    data: CreateFunctionFromTemplateRequest
  ): Promise<CreateFunctionFromTemplateResponse> => {
    return api.post('/v1/functions/from-template', data)
  },

  // 按分类获取模板列表
  listByCategory: async (category: TemplateCategory): Promise<Template[]> => {
    const response = await templateService.list({ category, limit: 100 })
    return response.templates
  },

  // 按运行时获取模板列表
  listByRuntime: async (runtime: Runtime): Promise<Template[]> => {
    const response = await templateService.list({ runtime, limit: 100 })
    return response.templates
  },

  // 获取热门模板
  getPopular: async (): Promise<Template[]> => {
    const response = await templateService.list({ limit: 100 })
    return response.templates.filter((t) => t.popular)
  },

  // 获取任务状态（从模板创建函数时使用）
  getTask: async (taskId: string): Promise<{ task: FunctionTask; function: Function }> => {
    return api.get(`/v1/tasks/${taskId}`)
  },
}

export default templateService
