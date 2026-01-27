---
---

# Invocations

调用记录（Invocation）用于查询一次函数执行的状态与结果。

## 获取调用记录

`GET /api/v1/invocations/{id}`

响应：Invocation 对象，例如：

```json
{
  "id": "....",
  "function_id": "....",
  "function_name": "hello",
  "trigger_type": "http",
  "status": "success",
  "input": {"name":"codex"},
  "output": {"hello":"world"},
  "error": "",
  "cold_start": true,
  "vm_id": "docker",
  "started_at": "2026-01-17T08:10:59Z",
  "completed_at": "2026-01-17T08:10:59Z",
  "duration_ms": 352,
  "billed_time_ms": 400,
  "memory_used_mb": 0,
  "retry_count": 0,
  "created_at": "2026-01-17T08:10:59Z"
}
```

## 状态字段

`status` 可能值：

- `pending`
- `running`
- `success`
- `failed`
- `timeout`
- `cancelled`
