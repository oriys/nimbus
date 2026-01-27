---
title: Grafana 实时监控
---

本项目暴露 Prometheus 指标（`/metrics`），OrbStack 部署已包含开箱即用的 Prometheus + Grafana 监控套件。

## 1. 启动 OrbStack 环境

```bash
cd deployments/k8s/overlays/orbstack
./start.sh
```

启动完成后，监控服务地址：

| 服务 | 地址 | 说明 |
|------|------|------|
| Prometheus | http://localhost:9090 | 指标查询 |
| Grafana | http://192.168.139.2:3000 | 监控仪表板（账号 `admin` / 密码 `admin`） |

## 2. 验证指标可访问

```bash
curl -sS http://192.168.139.2:8080/metrics | grep '^function_' | head
```

## 3. 查看实时图表

Grafana 左侧 `Dashboards` 里会自动出现内置面板（来自 `deployments/k8s/overlays/observability/grafana/dashboards/`）。

建议：
- 右上角时间范围选 `Last 5 minutes`
- 刷新频率选 `5s`（或更快）

## 3.1 按函数查看（PromQL 示例）

Invocation / 延迟等指标都带有 `function_name`（同时保留 `function_id`），便于在 Grafana 里直接按函数聚合。

- 每个函数的 QPS（按 1m 窗口）：
```promql
sum by (function_name, runtime) (rate(function_invocations_total[1m]))
```
- 每个函数的 P95 延迟：
```promql
histogram_quantile(
  0.95,
  sum by (le, function_name, runtime) (rate(function_invocation_duration_ms_bucket[5m]))
)
```
- 每个函数的冷启动率：
```promql
sum by (function_name, runtime) (rate(function_cold_starts_total[5m]))
/
sum by (function_name, runtime) (rate(function_invocations_total[5m]))
```

## 4. 常见问题

- 看不到 `function_*` 指标：确认 Gateway 使用了 `metrics.enabled: true`，并且服务已正常运行。
- 端口不一致：检查 `deployments/k8s/overlays/observability/prometheus.yml` 中的目标端口配置。
