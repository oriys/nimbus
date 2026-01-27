// 工作流相关类型定义

// 工作流状态
export type WorkflowStatus = 'active' | 'inactive'

// 执行状态
export type ExecutionStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'timeout' | 'cancelled' | 'paused'

// 状态执行状态
export type StateExecutionStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'skipped'

// 状态类型
export type StateType = 'Task' | 'Choice' | 'Wait' | 'Parallel' | 'Pass' | 'Fail' | 'Succeed'

// 重试策略
export interface RetryPolicy {
  error_equals: string[]
  interval_seconds: number
  max_attempts: number
  backoff_rate: number
}

// 错误捕获配置
export interface CatchConfig {
  error_equals: string[]
  next: string
  result_path?: string
}

// Choice 规则
export interface ChoiceRule {
  variable: string
  string_equals?: string
  string_equals_path?: string
  string_greater_than?: string
  string_greater_than_path?: string
  string_greater_than_equals?: string
  string_greater_than_equals_path?: string
  string_less_than?: string
  string_less_than_path?: string
  string_less_than_equals?: string
  string_less_than_equals_path?: string
  string_matches?: string
  numeric_equals?: number
  numeric_equals_path?: string
  numeric_greater_than?: number
  numeric_greater_than_path?: string
  numeric_greater_than_equals?: number
  numeric_greater_than_equals_path?: string
  numeric_less_than?: number
  numeric_less_than_path?: string
  numeric_less_than_equals?: number
  numeric_less_than_equals_path?: string
  boolean_equals?: boolean
  boolean_equals_path?: string
  timestamp_equals?: string
  timestamp_equals_path?: string
  timestamp_greater_than?: string
  timestamp_greater_than_path?: string
  timestamp_greater_than_equals?: string
  timestamp_greater_than_equals_path?: string
  timestamp_less_than?: string
  timestamp_less_than_path?: string
  timestamp_less_than_equals?: string
  timestamp_less_than_equals_path?: string
  is_null?: boolean
  is_present?: boolean
  is_numeric?: boolean
  is_string?: boolean
  is_boolean?: boolean
  is_timestamp?: boolean
  and?: ChoiceRule[]
  or?: ChoiceRule[]
  not?: ChoiceRule
  next: string
}

// 分支 (Parallel 用)
export interface Branch {
  start_at: string
  states: Record<string, State>
}

// 状态定义
export interface State {
  type: StateType
  comment?: string
  next?: string
  end?: boolean
  // Task 字段
  function_id?: string
  timeout_sec?: number
  heartbeat_sec?: number
  retry?: RetryPolicy[]
  catch?: CatchConfig[]
  // Choice 字段
  choices?: ChoiceRule[]
  default?: string
  // Wait 字段
  seconds?: number
  timestamp?: string
  seconds_path?: string
  timestamp_path?: string
  // Parallel 字段
  branches?: Branch[]
  // Pass/Fail 字段
  result?: unknown
  result_path?: string
  // Fail 字段
  error?: string
  cause?: string
  // JSONPath 处理
  input_path?: string
  output_path?: string
  parameters?: unknown
  result_selector?: unknown
}

// 工作流定义
export interface WorkflowDefinition {
  start_at: string
  states: Record<string, State>
}

// 工作流
export interface Workflow {
  id: string
  name: string
  description?: string
  version: number
  status: WorkflowStatus
  definition: WorkflowDefinition
  timeout_sec: number
  created_at: string
  updated_at: string
}

// 工作流执行
export interface WorkflowExecution {
  id: string
  workflow_id: string
  workflow_name: string
  workflow_version?: number
  workflow_definition?: WorkflowDefinition
  status: ExecutionStatus
  input?: unknown
  output?: unknown
  error?: string
  current_state?: string
  started_at?: string
  completed_at?: string
  created_at: string
  // 暂停相关字段
  paused_at_state?: string
  paused_input?: unknown
  paused_at?: string
}

// 断点定义
export interface Breakpoint {
  id: string
  execution_id: string
  before_state: string
  enabled: boolean
  created_at: string
}

// 状态执行
export interface StateExecution {
  id: string
  execution_id: string
  state_name: string
  state_type: StateType
  status: StateExecutionStatus
  input?: unknown
  output?: unknown
  error?: string
  retry_count: number
  invocation_id?: string
  started_at?: string
  completed_at?: string
}

// 创建工作流请求
export interface CreateWorkflowRequest {
  name: string
  description?: string
  definition: WorkflowDefinition
  timeout_sec?: number
}

// 更新工作流请求
export interface UpdateWorkflowRequest {
  description?: string
  definition?: WorkflowDefinition
  timeout_sec?: number
  status?: WorkflowStatus
}

// 启动执行请求
export interface StartExecutionRequest {
  input?: unknown
}

// 工作流列表响应
export interface WorkflowListResponse {
  workflows: Workflow[]
  total: number
  offset: number
  limit: number
}

// 执行列表响应
export interface ExecutionListResponse {
  executions: WorkflowExecution[]
  total: number
  offset: number
  limit: number
}

// 执行详情响应（包含历史）
export interface ExecutionResponse {
  workflow_execution: WorkflowExecution
  history: StateExecution[]
}

// 状态类型颜色
export const STATE_TYPE_COLORS: Record<StateType, string> = {
  'Task': 'bg-blue-500',
  'Choice': 'bg-yellow-500',
  'Wait': 'bg-purple-500',
  'Parallel': 'bg-green-500',
  'Pass': 'bg-gray-500',
  'Fail': 'bg-red-500',
  'Succeed': 'bg-emerald-500',
}

// 状态类型标签
export const STATE_TYPE_LABELS: Record<StateType, string> = {
  'Task': '任务',
  'Choice': '条件',
  'Wait': '等待',
  'Parallel': '并行',
  'Pass': '透传',
  'Fail': '失败',
  'Succeed': '成功',
}

// 工作流状态颜色
export const WORKFLOW_STATUS_COLORS: Record<WorkflowStatus, string> = {
  'active': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  'inactive': 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
}

// 工作流状态标签
export const WORKFLOW_STATUS_LABELS: Record<WorkflowStatus, string> = {
  'active': '活跃',
  'inactive': '停用',
}

// 执行状态颜色
export const EXECUTION_STATUS_COLORS: Record<ExecutionStatus, string> = {
  'pending': 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  'running': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  'succeeded': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  'failed': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  'timeout': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  'cancelled': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  'paused': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
}

// 执行状态标签
export const EXECUTION_STATUS_LABELS: Record<ExecutionStatus, string> = {
  'pending': '等待中',
  'running': '运行中',
  'succeeded': '成功',
  'failed': '失败',
  'timeout': '超时',
  'cancelled': '已取消',
  'paused': '已暂停',
}

// 状态执行状态颜色
export const STATE_EXECUTION_STATUS_COLORS: Record<StateExecutionStatus, string> = {
  'pending': 'bg-gray-100 text-gray-800',
  'running': 'bg-blue-100 text-blue-800',
  'succeeded': 'bg-green-100 text-green-800',
  'failed': 'bg-red-100 text-red-800',
  'skipped': 'bg-yellow-100 text-yellow-800',
}

// 状态执行状态标签
export const STATE_EXECUTION_STATUS_LABELS: Record<StateExecutionStatus, string> = {
  'pending': '等待中',
  'running': '运行中',
  'succeeded': '成功',
  'failed': '失败',
  'skipped': '跳过',
}
