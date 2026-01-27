---
---

# System

## 健康检查

### GET /health

```json
{"status":"healthy"}
```

### GET /health/ready

用于 readiness probe，会检查数据库连通性。

成功：
```json
{"status":"ready"}
```

失败：
```json
{"error":"database not ready"}
```

### GET /health/live

```json
{"status":"alive"}
```

## 指标

### GET /metrics

Prometheus 指标端点。

## 统计

### GET /api/v1/stats

返回函数数量与调用数量：

```json
{
  "functions": 0,
  "invocations": 0
}
```
