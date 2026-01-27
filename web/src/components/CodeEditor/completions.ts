import type * as Monaco from 'monaco-editor'
import type { Runtime } from '../../types'

// 补全项定义（不包含 range，range 在运行时添加）
interface CompletionItemDef {
  label: string
  kind: Monaco.languages.CompletionItemKind
  insertText: string
  insertTextRules?: Monaco.languages.CompletionItemInsertTextRule
  documentation?: string
  detail?: string
}

// Python 自动补全
const pythonCompletionDefs: CompletionItemDef[] = [
  // 函数签名
  {
    label: 'def handler',
    kind: 15, // Snippet
    insertText: 'def handler(event, context):\n\t${1:pass}\n\treturn {"statusCode": 200, "body": ${2:"Hello World"}}',
    insertTextRules: 4, // InsertAsSnippet
    documentation: '创建一个标准的函数处理器',
    detail: 'Nimbus 函数处理器模板',
  },
  {
    label: 'async def handler',
    kind: 15,
    insertText: 'async def handler(event, context):\n\t${1:pass}\n\treturn {"statusCode": 200, "body": ${2:"Hello World"}}',
    insertTextRules: 4,
    documentation: '创建一个异步的函数处理器',
    detail: 'Nimbus 异步函数处理器模板',
  },
  // 常用导入
  {
    label: 'import json',
    kind: 15,
    insertText: 'import json',
    documentation: '导入 JSON 处理模块',
  },
  {
    label: 'import os',
    kind: 15,
    insertText: 'import os',
    documentation: '导入操作系统模块',
  },
  {
    label: 'import requests',
    kind: 15,
    insertText: 'import requests',
    documentation: '导入 HTTP 请求库',
  },
  // 事件对象访问
  {
    label: 'event.get',
    kind: 1, // Method
    insertText: 'event.get("${1:key}", ${2:default})',
    insertTextRules: 4,
    documentation: '安全获取事件参数',
  },
  {
    label: 'event["body"]',
    kind: 9, // Property
    insertText: 'event["body"]',
    documentation: '获取请求体',
  },
  {
    label: 'event["headers"]',
    kind: 9,
    insertText: 'event["headers"]',
    documentation: '获取请求头',
  },
  {
    label: 'event["queryStringParameters"]',
    kind: 9,
    insertText: 'event["queryStringParameters"]',
    documentation: '获取查询参数',
  },
  // 上下文对象
  {
    label: 'context.function_name',
    kind: 9,
    insertText: 'context.function_name',
    documentation: '获取函数名称',
  },
  {
    label: 'context.memory_limit_mb',
    kind: 9,
    insertText: 'context.memory_limit_mb',
    documentation: '获取内存限制',
  },
  {
    label: 'context.timeout_sec',
    kind: 9,
    insertText: 'context.timeout_sec',
    documentation: '获取超时时间',
  },
  // 环境变量
  {
    label: 'os.environ.get',
    kind: 1,
    insertText: 'os.environ.get("${1:ENV_VAR}", "${2:default}")',
    insertTextRules: 4,
    documentation: '安全获取环境变量',
  },
  // 返回响应
  {
    label: 'return response',
    kind: 15,
    insertText: 'return {\n\t"statusCode": ${1:200},\n\t"headers": {"Content-Type": "application/json"},\n\t"body": json.dumps(${2:data})\n}',
    insertTextRules: 4,
    documentation: '返回标准 HTTP 响应',
  },
  // 错误处理
  {
    label: 'try-except',
    kind: 15,
    insertText: 'try:\n\t${1:pass}\nexcept Exception as e:\n\treturn {"statusCode": 500, "body": str(e)}',
    insertTextRules: 4,
    documentation: '标准错误处理模板',
  },
]

// Node.js 自动补全
const nodejsCompletionDefs: CompletionItemDef[] = [
  // 函数签名
  {
    label: 'exports.handler',
    kind: 15,
    insertText: 'exports.handler = async (event, context) => {\n\t${1}\n\treturn {\n\t\tstatusCode: 200,\n\t\tbody: JSON.stringify({ message: ${2:"Hello World"} })\n\t};\n};',
    insertTextRules: 4,
    documentation: '创建一个标准的函数处理器',
    detail: 'Nimbus 函数处理器模板',
  },
  {
    label: 'module.exports.handler',
    kind: 15,
    insertText: 'module.exports.handler = async (event, context) => {\n\t${1}\n\treturn {\n\t\tstatusCode: 200,\n\t\tbody: JSON.stringify({ message: ${2:"Hello World"} })\n\t};\n};',
    insertTextRules: 4,
    documentation: '创建一个标准的函数处理器 (module.exports 形式)',
  },
  // 事件对象
  {
    label: 'event.body',
    kind: 9,
    insertText: 'event.body',
    documentation: '获取请求体',
  },
  {
    label: 'event.headers',
    kind: 9,
    insertText: 'event.headers',
    documentation: '获取请求头',
  },
  {
    label: 'event.queryStringParameters',
    kind: 9,
    insertText: 'event.queryStringParameters',
    documentation: '获取查询参数',
  },
  {
    label: 'JSON.parse(event.body)',
    kind: 1,
    insertText: 'JSON.parse(event.body || "{}")',
    documentation: '解析请求体 JSON',
  },
  // 上下文
  {
    label: 'context.functionName',
    kind: 9,
    insertText: 'context.functionName',
    documentation: '获取函数名称',
  },
  {
    label: 'context.memoryLimitMB',
    kind: 9,
    insertText: 'context.memoryLimitMB',
    documentation: '获取内存限制',
  },
  // 环境变量
  {
    label: 'process.env',
    kind: 9,
    insertText: 'process.env.${1:ENV_VAR}',
    insertTextRules: 4,
    documentation: '访问环境变量',
  },
  // 返回响应
  {
    label: 'return response',
    kind: 15,
    insertText: 'return {\n\tstatusCode: ${1:200},\n\theaders: { "Content-Type": "application/json" },\n\tbody: JSON.stringify(${2:data})\n};',
    insertTextRules: 4,
    documentation: '返回标准 HTTP 响应',
  },
  // 错误处理
  {
    label: 'try-catch',
    kind: 15,
    insertText: 'try {\n\t${1}\n} catch (error) {\n\treturn {\n\t\tstatusCode: 500,\n\t\tbody: JSON.stringify({ error: error.message })\n\t};\n}',
    insertTextRules: 4,
    documentation: '标准错误处理模板',
  },
  // 异步操作
  {
    label: 'await fetch',
    kind: 15,
    insertText: 'const response = await fetch("${1:url}");\nconst data = await response.json();',
    insertTextRules: 4,
    documentation: 'Fetch API 调用',
  },
]

// Go 自动补全
const goCompletionDefs: CompletionItemDef[] = [
  // 函数签名
  {
    label: 'func Handler',
    kind: 15,
    insertText: 'func Handler(event map[string]interface{}, context *Context) (map[string]interface{}, error) {\n\t${1}\n\treturn map[string]interface{}{\n\t\t"statusCode": 200,\n\t\t"body":       ${2:"Hello World"},\n\t}, nil\n}',
    insertTextRules: 4,
    documentation: '创建一个标准的函数处理器',
    detail: 'Nimbus Go 函数处理器模板',
  },
  // 包声明
  {
    label: 'package main',
    kind: 15,
    insertText: 'package main\n\n${1}',
    insertTextRules: 4,
    documentation: '主包声明',
  },
  // 导入
  {
    label: 'import fmt',
    kind: 15,
    insertText: 'import "fmt"',
    documentation: '导入格式化输出包',
  },
  {
    label: 'import json',
    kind: 15,
    insertText: 'import "encoding/json"',
    documentation: '导入 JSON 编码包',
  },
  {
    label: 'import os',
    kind: 15,
    insertText: 'import "os"',
    documentation: '导入操作系统包',
  },
  // 环境变量
  {
    label: 'os.Getenv',
    kind: 1,
    insertText: 'os.Getenv("${1:ENV_VAR}")',
    insertTextRules: 4,
    documentation: '获取环境变量',
  },
  // JSON 处理
  {
    label: 'json.Marshal',
    kind: 1,
    insertText: 'json.Marshal(${1:data})',
    insertTextRules: 4,
    documentation: '序列化为 JSON',
  },
  {
    label: 'json.Unmarshal',
    kind: 1,
    insertText: 'json.Unmarshal(${1:data}, &${2:target})',
    insertTextRules: 4,
    documentation: '反序列化 JSON',
  },
  // 错误处理
  {
    label: 'if err != nil',
    kind: 15,
    insertText: 'if err != nil {\n\treturn nil, err\n}',
    documentation: '标准错误检查',
  },
]

// 按运行时获取补全定义
export function getCompletionDefs(runtime: Runtime): CompletionItemDef[] {
  switch (runtime) {
    case 'python3.11':
      return pythonCompletionDefs
    case 'nodejs20':
      return nodejsCompletionDefs
    case 'go1.24':
      return goCompletionDefs
    default:
      return []
  }
}

// 代码片段定义
export interface CodeSnippet {
  label: string
  prefix: string
  body: string
  description: string
}

// Python 代码片段
export const pythonSnippets: CodeSnippet[] = [
  {
    label: 'handler',
    prefix: 'handler',
    body: 'def handler(event, context):\n    $1\n    return {"statusCode": 200}',
    description: '创建标准函数处理器',
  },
  {
    label: 'async-handler',
    prefix: 'ahandler',
    body: 'async def handler(event, context):\n    $1\n    return {"statusCode": 200}',
    description: '创建异步函数处理器',
  },
  {
    label: 'try-except',
    prefix: 'try',
    body: 'try:\n    $1\nexcept Exception as e:\n    return {"statusCode": 500, "body": str(e)}',
    description: '错误处理模板',
  },
  {
    label: 'json-response',
    prefix: 'response',
    body: 'return {\n    "statusCode": $1,\n    "headers": {"Content-Type": "application/json"},\n    "body": json.dumps($2)\n}',
    description: 'JSON 响应模板',
  },
]

// Node.js 代码片段
export const nodejsSnippets: CodeSnippet[] = [
  {
    label: 'handler',
    prefix: 'handler',
    body: 'exports.handler = async (event, context) => {\n    $1\n    return { statusCode: 200 };\n};',
    description: '创建标准函数处理器',
  },
  {
    label: 'try-catch',
    prefix: 'try',
    body: 'try {\n    $1\n} catch (error) {\n    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };\n}',
    description: '错误处理模板',
  },
  {
    label: 'json-response',
    prefix: 'response',
    body: 'return {\n    statusCode: $1,\n    headers: { "Content-Type": "application/json" },\n    body: JSON.stringify($2)\n};',
    description: 'JSON 响应模板',
  },
]

// Go 代码片段
export const goSnippets: CodeSnippet[] = [
  {
    label: 'handler',
    prefix: 'handler',
    body: 'func Handler(event map[string]interface{}, context *Context) (map[string]interface{}, error) {\n    $1\n    return map[string]interface{}{"statusCode": 200}, nil\n}',
    description: '创建标准函数处理器',
  },
  {
    label: 'error-check',
    prefix: 'iferr',
    body: 'if err != nil {\n    return nil, err\n}',
    description: '错误检查模板',
  },
]

// 按运行时获取代码片段
export function getSnippets(runtime: Runtime): CodeSnippet[] {
  switch (runtime) {
    case 'python3.11':
      return pythonSnippets
    case 'nodejs20':
      return nodejsSnippets
    case 'go1.24':
      return goSnippets
    default:
      return []
  }
}

// 注册补全提供者
export function registerCompletionProvider(
  monaco: typeof Monaco,
  runtime: Runtime
): Monaco.IDisposable {
  const languageMap: Record<Runtime, string> = {
    'python3.11': 'python',
    'nodejs20': 'javascript',
    'go1.24': 'go',
    'wasm': 'rust',
    'rust1.75': 'rust',
  }

  const language = languageMap[runtime]
  const completionDefs = getCompletionDefs(runtime)

  return monaco.languages.registerCompletionItemProvider(language, {
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position)
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      }

      return {
        suggestions: completionDefs.map((item) => ({
          label: item.label,
          kind: item.kind,
          insertText: item.insertText,
          insertTextRules: item.insertTextRules,
          documentation: item.documentation,
          detail: item.detail,
          range,
        })),
      }
    },
  })
}
