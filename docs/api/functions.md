---
---

# Functions

本页描述函数（Function）的创建、查询、更新、删除，以及同步/异步调用接口。

## Function 对象

返回字段（常见）：

- `id`：函数 ID（UUID）
- `name`：函数名（全局唯一）
- `description`：描述（可选）
- `runtime`：`python3.11` / `nodejs20` / `go1.24` / `wasm`
- `handler`：入口（不同 runtime 语义不同，但创建时必填）
- `code`：函数代码（不同 runtime 语义不同）
- `code_hash`：代码哈希（服务端计算）
- `memory_mb`：内存（创建默认 `256`，建议范围 `128`~`3072`）
- `timeout_sec`：超时秒数（创建默认 `30`，建议范围 `1`~`300`）
- `env_vars`：环境变量 map（可选）
- `status`：`active` 等
- `version`：版本号（更新时自增）

## 创建函数

`POST /api/v1/functions`

请求体（CreateFunctionRequest）：

```json
{
  "name": "hello",
  "runtime": "python3.11",
  "handler": "handler",
  "code": "def handler(event):\\n  return {\"ok\":true,\"event\":event}\\n",
  "memory_mb": 256,
  "timeout_sec": 30,
  "env_vars": {"DEBUG":"true"}
}
```

响应：`201 Created`，返回 Function 对象。

常见错误：

- `400`：参数非法（runtime/handler/code/name 等）
- `409`：同名函数已存在

## 列出函数

`GET /api/v1/functions?offset=0&limit=20`

响应：

```json
{
  "functions": [],
  "total": 0,
  "offset": 0,
  "limit": 20
}
```

## 获取函数

`GET /api/v1/functions/{id}`

`{id}` 支持函数 UUID 或 name。

## 更新函数

`PUT /api/v1/functions/{id}`

请求体（UpdateFunctionRequest，字段可选）：

```json
{
  "description": "new desc",
  "code": "....",
  "handler": "handler",
  "memory_mb": 256,
  "timeout_sec": 30,
  "env_vars": {"KEY":"VALUE"}
}
```

响应：`200 OK`，返回更新后的 Function 对象。

## 删除函数

`DELETE /api/v1/functions/{id}`

响应：`204 No Content`。

## 同步调用

`POST /api/v1/functions/{id}/invoke`

请求体：任意 JSON（会原样作为 payload 传入运行时）。

示例：

```bash
curl -sS -X POST http://localhost:8080/api/v1/functions/hello/invoke \\
  -H 'Content-Type: application/json' \\
  -d '{\"name\":\"codex\"}'
```

响应（InvokeResponse）示例：

```json
{
  "request_id": "....",
  "status_code": 200,
  "body": {"hello":"world"},
  "duration_ms": 123,
  "cold_start": true,
  "billed_time_ms": 200
}
```

说明：

- HTTP 状态码会与响应体中的 `status_code` 一致（例如超时会返回 `504`）。
- 运行时异常时 `error` 字段会包含错误信息。

## 异步调用

`POST /api/v1/functions/{id}/async`

响应：`202 Accepted`

```json
{
  "request_id": "....",
  "status": "accepted"
}
```

异步结果可通过调用记录查询（见：`api/invocations.md`）。

## 列出函数调用记录

`GET /api/v1/functions/{id}/invocations?offset=0&limit=20`

响应：

```json
{
  "invocations": [],
  "total": 0,
  "offset": 0,
  "limit": 20
}
```

## Runtime 说明（code/handler 语义）

### python3.11

- `code`：Python 源码字符串（会在运行时 `exec`）
- `handler`：函数名（例如 `handler`）；也支持 `module.function` 形式，但仅使用最后的函数名部分
- 入参：payload JSON（Python dict）
- 输出：stdout 打印的 JSON

### nodejs20

- `code`：Node.js 源码字符串（VM sandbox 执行）
- `handler`：导出函数名（例如 `handler`，从 `module.exports[handler]`/`exports[handler]` 取）
- 入参：payload JSON（JS object）
- 输出：stdout 打印的 JSON

### go1.24

- `code`：Linux 可执行文件的 base64（不是源码）
- `handler`：运行时不使用，但创建时必填（可填 `handler`）
- 入参：payload 的原始 JSON bytes，通过 stdin 传给二进制
- 输出：二进制 stdout 输出（建议为 JSON）

### wasm（可用于 Rust）

- `code`：Wasm 二进制（`wasm32-unknown-unknown`）的 base64
- `handler`：运行时不使用，但创建时必填（可填 `handle`）
- 必须导出 `alloc(size) -> ptr` 与 `handle(ptr,len) -> u64`
  - `handle` 返回值的高 32 位为输出指针，低 32 位为输出长度
- 入参：payload 的原始 JSON bytes
- 输出：Wasm 输出 bytes（建议为 JSON）
