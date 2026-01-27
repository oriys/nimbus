---
---

# API 总览

## Base URL

API 默认监听 `server.http_port`（默认为 `8080`），示例：

```text
http://localhost:8080
```

所有 API 路由均在：

```text
/api/v1
```

## 通用约定

### Content-Type

- 请求体为 JSON 的接口：请设置 `Content-Type: application/json`
- 所有 JSON 响应会返回 `Content-Type: application/json`

### 错误响应

当请求失败时，响应格式为：

```json
{"error":"..."}
```

### 分页

列表接口使用：

- `offset`：偏移量（默认 `0`）
- `limit`：返回条数（默认 `20`，最大 `100`）

### 资源 ID

部分接口的路径参数 `{id}` 支持：

- 函数 ID（UUID）
- 函数名（name）

## Runtime 与 code 字段

创建函数时需要指定 `runtime`，目前支持：

- `python3.11`
- `nodejs20`
- `go1.24`
- `wasm`

不同 runtime 的 `code` 字段含义不同，详见：`api/functions.md`。
