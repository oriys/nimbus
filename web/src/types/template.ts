// 模板相关类型定义

import type { Runtime } from './function'

// 模板分类
export type TemplateCategory = 'web-api' | 'data-processing' | 'scheduled' | 'webhook' | 'starter'

// 模板变量类型
export type TemplateVariableType = 'string' | 'number' | 'boolean'

// 模板变量定义
export interface TemplateVariable {
  name: string          // 变量名 (如 "TABLE_NAME")
  label: string         // 显示标签
  description?: string  // 变量描述
  type: TemplateVariableType
  required: boolean
  default?: string      // 默认值
}

// 模板实体
export interface Template {
  id: string
  name: string            // 唯一标识名称
  display_name: string    // 显示名称
  description?: string
  category: TemplateCategory
  runtime: Runtime
  handler: string
  code: string
  variables?: TemplateVariable[]
  default_memory: number
  default_timeout: number
  tags?: string[]
  icon?: string           // 图标名称
  popular: boolean        // 是否热门
  created_at: string
  updated_at: string
}

// 创建模板请求
export interface CreateTemplateRequest {
  name: string
  display_name: string
  description?: string
  category: TemplateCategory
  runtime: Runtime
  handler: string
  code: string
  variables?: TemplateVariable[]
  default_memory?: number
  default_timeout?: number
  tags?: string[]
  icon?: string
  popular?: boolean
}

// 更新模板请求
export interface UpdateTemplateRequest {
  display_name?: string
  description?: string
  category?: TemplateCategory
  handler?: string
  code?: string
  variables?: TemplateVariable[]
  default_memory?: number
  default_timeout?: number
  tags?: string[]
  icon?: string
  popular?: boolean
}

// 从模板创建函数请求
export interface CreateFunctionFromTemplateRequest {
  template_id: string
  function_name: string
  description?: string
  variables?: Record<string, string>  // 模板变量值映射
  env_vars?: Record<string, string>
  memory_mb?: number
  timeout_sec?: number
}

// 模板列表响应
export interface TemplateListResponse {
  templates: Template[]
  total: number
  offset: number
  limit: number
}

// 分类显示名称
export const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  'web-api': 'Web API',
  'data-processing': '数据处理',
  'scheduled': '定时任务',
  'webhook': 'Webhook',
  'starter': '入门示例',
}

// 分类图标（Lucide 图标名称）
export const CATEGORY_ICONS: Record<TemplateCategory, string> = {
  'web-api': 'Globe',
  'data-processing': 'BarChart3',
  'scheduled': 'Clock',
  'webhook': 'Link',
  'starter': 'Rocket',
}

// 分类颜色
export const CATEGORY_COLORS: Record<TemplateCategory, string> = {
  'web-api': 'text-blue-500 bg-blue-500/10 border-blue-500/30',
  'data-processing': 'text-purple-500 bg-purple-500/10 border-purple-500/30',
  'scheduled': 'text-amber-500 bg-amber-500/10 border-amber-500/30',
  'webhook': 'text-green-500 bg-green-500/10 border-green-500/30',
  'starter': 'text-cyan-500 bg-cyan-500/10 border-cyan-500/30',
}
