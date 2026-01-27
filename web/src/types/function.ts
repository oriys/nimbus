// 函数相关类型定义

export type Runtime = 'python3.11' | 'nodejs20' | 'go1.24' | 'wasm' | 'rust1.75'

export type FunctionStatus = 'creating' | 'active' | 'updating' | 'offline' | 'inactive' | 'building' | 'failed'

export type FunctionTaskType = 'create' | 'update'
export type FunctionTaskStatus = 'pending' | 'running' | 'completed' | 'failed'

export interface FunctionTask {
  id: string
  function_id: string
  type: FunctionTaskType
  status: FunctionTaskStatus
  input?: unknown
  output?: unknown
  error?: string
  created_at: string
  started_at?: string
  completed_at?: string
}

export interface Function {
  id: string
  name: string
  description?: string
  tags?: string[]  // 函数标签
  pinned: boolean  // 是否置顶
  runtime: Runtime
  handler: string
  code: string
  binary?: string  // 编译后的二进制 (base64)
  memory_mb: number
  timeout_sec: number
  max_concurrency?: number  // 最大并发数 (0 表示无限制)
  env_vars?: Record<string, string>
  status: FunctionStatus
  status_message?: string
  task_id?: string
  version: number
  cron_expression?: string
  http_path?: string
  http_methods?: string[]
  webhook_enabled: boolean  // Webhook 是否启用
  webhook_key?: string  // Webhook 密钥
  last_deployed_at?: string
  // 统计指标（可选，在列表中返回）
  invocations?: number
  success_rate?: number
  avg_latency_ms?: number
  error_count?: number
  created_at: string
  updated_at: string
}

export interface CreateFunctionRequest {
  name: string
  tags?: string[]  // 函数标签
  runtime: Runtime
  handler: string
  code: string
  binary?: string  // 编译后的二进制 (base64)，用于 Go/Rust
  memory_mb?: number
  timeout_sec?: number
  max_concurrency?: number  // 最大并发数 (0 表示无限制)
  env_vars?: Record<string, string>
  cron_expression?: string
  http_path?: string
  http_methods?: string[]
}

export interface UpdateFunctionRequest {
  handler?: string
  tags?: string[]  // 函数标签
  code?: string
  memory_mb?: number
  timeout_sec?: number
  max_concurrency?: number  // 最大并发数 (0 表示无限制)
  env_vars?: Record<string, string>
  cron_expression?: string
  http_path?: string
  http_methods?: string[]
}

export const RUNTIME_LABELS: Record<Runtime, string> = {
  'python3.11': 'Python 3.11',
  'nodejs20': 'Node.js 20',
  'go1.24': 'Go 1.24',
  'wasm': 'WebAssembly',
  'rust1.75': 'Rust 1.75',
}

export const RUNTIME_COLORS: Record<Runtime, string> = {
  'python3.11': 'bg-yellow-100 text-yellow-800',
  'nodejs20': 'bg-green-100 text-green-800',
  'go1.24': 'bg-blue-100 text-blue-800',
  'wasm': 'bg-purple-100 text-purple-800',
  'rust1.75': 'bg-orange-100 text-orange-800',
}

export const STATUS_COLORS: Record<FunctionStatus, string> = {
  'creating': 'bg-blue-100 text-blue-800',
  'active': 'bg-green-100 text-green-800',
  'updating': 'bg-blue-100 text-blue-800',
  'offline': 'bg-gray-100 text-gray-800',
  'inactive': 'bg-gray-100 text-gray-800',
  'building': 'bg-yellow-100 text-yellow-800',
  'failed': 'bg-red-100 text-red-800',
}

export const STATUS_LABELS: Record<FunctionStatus, string> = {
  'creating': '创建中',
  'active': '运行中',
  'updating': '更新中',
  'offline': '已下线',
  'inactive': '未激活',
  'building': '构建中',
  'failed': '失败',
}

export const TASK_STATUS_COLORS: Record<FunctionTaskStatus, string> = {
  'pending': 'bg-gray-100 text-gray-800',
  'running': 'bg-blue-100 text-blue-800',
  'completed': 'bg-green-100 text-green-800',
  'failed': 'bg-red-100 text-red-800',
}

export const TASK_STATUS_LABELS: Record<FunctionTaskStatus, string> = {
  'pending': '等待中',
  'running': '执行中',
  'completed': '已完成',
  'failed': '失败',
}

// 代码模板
export const CODE_TEMPLATES: Record<Runtime, string> = {
  'python3.11': `def handler(event, context):
    """
    Function handler

    Args:
        event: Input event data
        context: Runtime context

    Returns:
        Response object
    """
    name = event.get('name', 'World')
    return {
        'statusCode': 200,
        'body': f'Hello, {name}!'
    }
`,
  'nodejs20': `exports.handler = async (event, context) => {
    // Function handler
    const name = event.name || 'World';
    return {
        statusCode: 200,
        body: \`Hello, \${name}!\`
    };
};
`,
  'go1.24': `package main

import (
	"encoding/json"
	"fmt"
	"os"
)

type Event struct {
	Name string \`json:"name"\`
}

type Response struct {
	StatusCode int    \`json:"statusCode"\`
	Body       string \`json:"body"\`
}

func main() {
	// 读取输入
	var event Event
	if err := json.NewDecoder(os.Stdin).Decode(&event); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\\n", err)
		os.Exit(1)
	}

	// 处理请求
	name := event.Name
	if name == "" {
		name = "World"
	}

	// 输出响应
	response := Response{
		StatusCode: 200,
		Body:       "Hello, " + name + "!",
	}
	json.NewEncoder(os.Stdout).Encode(response)
}
`,
  'wasm': `// Rust -> WebAssembly (wasm32-unknown-unknown)
//
// WASM runtime 约定：必须导出 alloc/handle 两个函数。
// - alloc(size) -> ptr: 分配 size 字节内存供宿主写入输入 JSON
// - handle(ptr, len) -> u64: 返回 (out_ptr << 32) | out_len，宿主再读取输出 JSON
//
// 说明：这里不依赖 Cargo/serde，仅按字节处理 JSON。
#[no_mangle]
pub extern "C" fn alloc(size: usize) -> *mut u8 {
    let mut buf = Vec::<u8>::with_capacity(size);
    let ptr = buf.as_mut_ptr();
    std::mem::forget(buf);
    ptr
}

#[no_mangle]
pub extern "C" fn handle(ptr: u32, len: u32) -> u64 {
    let input = unsafe { std::slice::from_raw_parts(ptr as *const u8, len as usize) };

    let mut out = Vec::new();
    out.extend_from_slice(br#"{"hello":"wasm","event":"#);
    if input.is_empty() {
        out.extend_from_slice(b"{}");
    } else {
        out.extend_from_slice(input);
    }
    out.extend_from_slice(b"}");

    let out_ptr = out.as_ptr() as u32;
    let out_len = out.len() as u32;
    std::mem::forget(out);
    ((out_ptr as u64) << 32) | (out_len as u64)
}
`,
  'rust1.75': `// Rust Native Binary
// 使用标准输入输出进行通信

use std::io::{self, Read, Write};

fn main() -> io::Result<()> {
    // 读取输入
    let mut input = String::new();
    io::stdin().read_to_string(&mut input)?;

    // 解析输入 (简单 JSON 解析)
    let name = if let Some(start) = input.find("\"name\"") {
        let rest = &input[start + 7..];
        if let Some(colon) = rest.find(':') {
            let value_part = rest[colon + 1..].trim();
            if value_part.starts_with('"') {
                if let Some(end) = value_part[1..].find('"') {
                    value_part[1..end + 1].to_string()
                } else {
                    "World".to_string()
                }
            } else {
                "World".to_string()
            }
        } else {
            "World".to_string()
        }
    } else {
        "World".to_string()
    };

    // 输出响应
    let response = format!(
        r#"{{"statusCode":200,"body":"Hello, {}!"}}"#,
        name
    );
    io::stdout().write_all(response.as_bytes())?;

    Ok(())
}
`,
}

// ==================== 版本管理类型 ====================

export interface FunctionVersion {
  id: string
  function_id: string
  version: number
  handler: string
  code?: string
  binary?: string
  code_hash: string
  description?: string
  created_at: string
}

// ==================== 别名与流量分配类型 ====================

export interface VersionWeight {
  version: number
  weight: number  // 百分比 (0-100)
}

export interface RoutingConfig {
  weights: VersionWeight[]
}

export interface FunctionAlias {
  id: string
  function_id: string
  name: string
  description?: string
  routing_config: RoutingConfig
  created_at: string
  updated_at: string
}

export interface CreateAliasRequest {
  name: string
  description?: string
  routing_config: RoutingConfig
}

export interface UpdateAliasRequest {
  description?: string
  routing_config?: RoutingConfig
}

// ==================== 函数层类型 ====================

export interface Layer {
  id: string
  name: string
  description?: string
  compatible_runtimes: string[]
  latest_version: number
  created_at: string
  updated_at: string
}

export interface LayerVersion {
  id: string
  layer_id: string
  version: number
  content_hash: string
  size_bytes: number
  created_at: string
}

export interface FunctionLayer {
  layer_id: string
  layer_name: string
  layer_version: number
  order: number
}

export interface CreateLayerRequest {
  name: string
  description?: string
  compatible_runtimes: string[]
}

// ==================== 环境管理类型 ====================

export interface Environment {
  id: string
  name: string
  description?: string
  is_default: boolean
  created_at: string
}

export interface FunctionEnvConfig {
  function_id: string
  environment_id: string
  environment_name?: string
  env_vars?: Record<string, string>
  memory_mb?: number
  timeout_sec?: number
  active_alias?: string
  created_at: string
  updated_at: string
}

export interface CreateEnvironmentRequest {
  name: string
  description?: string
  is_default?: boolean
}

export interface UpdateFunctionEnvConfigRequest {
  env_vars?: Record<string, string>
  memory_mb?: number
  timeout_sec?: number
  active_alias?: string
}

// ==================== 死信队列 (DLQ) 类型 ====================

export type DLQStatus = 'pending' | 'retrying' | 'resolved' | 'discarded'

export interface DeadLetterMessage {
  id: string
  function_id: string
  function_name?: string
  original_request_id: string
  payload: unknown
  error: string
  retry_count: number
  status: DLQStatus
  created_at: string
  last_retry_at?: string
  resolved_at?: string
}

export const DLQ_STATUS_COLORS: Record<DLQStatus, string> = {
  'pending': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  'retrying': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  'resolved': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  'discarded': 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
}

export const DLQ_STATUS_LABELS: Record<DLQStatus, string> = {
  'pending': '待处理',
  'retrying': '重试中',
  'resolved': '已解决',
  'discarded': '已丢弃',
}
