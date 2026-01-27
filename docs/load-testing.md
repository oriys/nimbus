---
title: 压力测试（Python）
---

本项目提供一个纯标准库（不依赖 `pip install`）的压测脚本：`scripts/stress_test.py`。

## 1. 前置条件

- Gateway 已启动（Docker 模式默认：`http://localhost:18080`）
- 健康检查：

```bash
curl http://localhost:18080/health
```

## 2. 一键部署压测函数（可选）

脚本内置了一段“更复杂”的 Python handler（CPU + 内存 + 压缩 + 哈希 + 正则混合），用于压测函数运行时本身：

```bash
python3 scripts/stress_test.py \
  --base-url http://localhost:18080 \
  --function stress_py \
  --deploy
```

## 2.1 多语言混合压测（一键部署）

脚本支持多 runtime 的混合压测：按权重随机选择不同函数调用，并输出分函数统计。

默认内置 4 个目标（权重 `4:3:2:1`）：
- `stress_py`（`python3.11`）
- `stress_node`（`nodejs20`）
- `stress_go`（`go1.24`，脚本会为 Docker Server 架构自动编译 Linux 二进制并 base64）
- `stress_wasm`（`wasm`，脚本会用 Docker 编译 Rust `wasm32-unknown-unknown` 并 base64）

一键部署并跑混合压测：
```bash
python3 scripts/stress_test.py \
  --base-url http://localhost:18080 \
  --mix \
  --deploy \
  --concurrency 80 \
  --duration 30 \
  --ramp-up 5 \
  --warmup 10
```

自定义目标与权重（`--target name[@runtime][:weight]` 可重复）：
```bash
python3 scripts/stress_test.py \
  --base-url http://localhost:18080 \
  --deploy \
  --target stress_py@python3.11:5 \
  --target stress_node@nodejs20:3 \
  --target stress_go@go1.24:2 \
  --target stress_wasm@wasm:1 \
  --concurrency 80 \
  --duration 60
```

说明：
- 混合模式下 `--warmup` 会对每个 target 分别执行一次（串行）。
- Go/Wasm 的编译产物会缓存到 `--artifact-dir`（默认：`/tmp/nimbus-stress-artifacts`）。

## 3. 运行压测

固定请求数：

```bash
python3 scripts/stress_test.py \
  --base-url http://localhost:18080 \
  --function stress_py \
  --concurrency 20 \
  --requests 5000 \
  --warmup 50
```

按时长压测：

```bash
python3 scripts/stress_test.py \
  --base-url http://localhost:18080 \
  --function stress_py \
  --concurrency 50 \
  --duration 30
```

限速（目标 QPS）：

```bash
python3 scripts/stress_test.py \
  --base-url http://localhost:18080 \
  --function stress_py \
  --concurrency 50 \
  --requests 20000 \
  --qps 300
```

调节压测函数的计算强度（越大越慢）：
- `--n`：生成/排序的数据量
- `--loops`：哈希链的循环次数
- `--payload-kb`：压缩/解压缩的数据大小

例如：
```bash
python3 scripts/stress_test.py \
  --base-url http://localhost:18080 \
  --function stress_py \
  --concurrency 20 \
  --requests 3000 \
  --n 8000 \
  --loops 40 \
  --payload-kb 64
```

## 4. 输出报告（JSON）

```bash
python3 scripts/stress_test.py \
  --base-url http://localhost:18080 \
  --function stress_py \
  --concurrency 20 \
  --requests 5000 \
  --json-out /tmp/nimbus-stress-report.json
```

## 5. 说明

- 默认 `--base-url` 会优先读取环境变量 `FN_API_URL`，否则使用 `http://localhost:18080`。
- 脚本会统计：吞吐（RPS）、状态码分布、延迟（min/p50/p90/p95/p99/max）、`cold_start` 次数与错误样例。
