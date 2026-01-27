# Nimbus Serverless Platform 架构文档

## 目录

1. [系统概述](#1-系统概述)
2. [整体架构](#2-整体架构)
3. [核心组件](#3-核心组件)
4. [函数生命周期](#4-函数生命周期)
5. [代码编译](#5-代码编译)
6. [函数执行流程](#6-函数执行流程)
7. [隔离与安全](#7-隔离与安全)
8. [VM 池管理](#8-vm-池管理)
9. [数据存储](#9-数据存储)
10. [部署方式](#10-部署方式)
11. [性能特性](#11-性能特性)

---

## 1. 系统概述

Nimbus 是一个生产级的 Serverless 函数计算平台，使用 Go 语言开发。平台支持两种执行模式：

| 模式 | 技术 | 适用场景 | 冷启动时间 |
|------|------|----------|------------|
| **Firecracker** | AWS Firecracker MicroVM + KVM | 生产环境 (Linux) | ~5ms (快照) / ~125ms (完整启动) |
| **Docker** | Docker 容器 | 开发环境 (macOS/Windows) | ~500-1000ms |

### 支持的运行时

- **Python 3.11** - 解释执行，无需编译
- **Node.js 20** - 解释执行，无需编译
- **Go 1.24** - 编译为 Linux 二进制文件
- **Rust/WebAssembly** - 编译为 WASM，使用 wazero 运行时执行

---

## 2. 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        客户端层                                  │
│         (CLI / Web UI / HTTP Client / MCP Server)               │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                      API Gateway                                 │
│            (HTTP REST API / 认证 / 限流 / 路由)                  │
│                     cmd/gateway/main.go                          │
└───────────────────────────┬─────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
   ┌────▼────┐        ┌─────▼─────┐       ┌────▼────┐
   │ Storage │        │ Scheduler │       │ EventBus│
   │ (PG/Redis)│       │  (调度器)  │       │ (NATS)  │
   └────┬────┘        └─────┬─────┘       └────┬────┘
        │                   │                   │
   ┌────▼───────────────────▼───────────────────▼────┐
   │              运行时执行层 (可插拔)                │
   │  ┌─────────────────┐     ┌─────────────────┐   │
   │  │   Firecracker   │     │     Docker      │   │
   │  │  MicroVM + Agent│     │  Container +    │   │
   │  │   (KVM/vsock)   │     │    Runtime      │   │
   │  └─────────────────┘     └─────────────────┘   │
   └─────────────────────────────────────────────────┘
                            │
   ┌────────────────────────▼────────────────────────┐
   │                   数据层                         │
   │   ┌──────────────┐      ┌──────────────┐       │
   │   │  PostgreSQL  │      │    Redis     │       │
   │   │   (持久化)    │      │   (缓存)     │       │
   │   └──────────────┘      └──────────────┘       │
   └─────────────────────────────────────────────────┘
```

---

## 3. 核心组件

### 3.1 Gateway (API 网关)

**位置**: `cmd/gateway/main.go`, `internal/api/`

API 网关是系统的入口，负责：
- HTTP REST API 服务
- 请求路由和中间件处理
- 认证和授权
- 请求限流
- 调用调度器执行函数

**主要 API 端点**:

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/api/v1/functions` | 创建函数 |
| GET | `/api/v1/functions` | 列出所有函数 |
| GET | `/api/v1/functions/{id}` | 获取函数详情 |
| PUT | `/api/v1/functions/{id}` | 更新函数 |
| DELETE | `/api/v1/functions/{id}` | 删除函数 |
| POST | `/api/v1/functions/{id}/invoke` | 同步调用函数 |
| POST | `/api/v1/functions/{id}/async` | 异步调用函数 |
| GET | `/api/v1/invocations/{id}` | 获取调用结果 |

### 3.2 Scheduler (调度器)

**位置**: `internal/scheduler/scheduler.go`

调度器负责：
- 管理工作队列
- 分配 Worker 处理请求
- 从 VM 池获取/释放虚拟机
- 处理超时和重试
- 支持同步和异步调用

```go
type Scheduler struct {
    store       *storage.PostgresStore  // 数据存储
    redis       *storage.RedisStore     // 缓存/队列
    pool        *vmpool.Pool            // VM 池
    workQueue   chan *workItem          // 工作队列
    workers     []*worker               // Worker 协程
}
```

### 3.3 Agent (执行代理)

**位置**: `cmd/agent/main.go`

Agent 运行在每个 VM/容器内部，负责：
- 接收函数配置和代码
- 初始化运行时环境
- 执行函数并返回结果
- 收集执行指标（时间、内存）

**通信协议**:
- Firecracker 模式: vsock (端口 9999)
- Docker 模式: stdio

**消息类型**:

| 类型 | 值 | 描述 |
|------|-----|------|
| MessageTypeInit | 1 | 初始化函数 |
| MessageTypeExec | 2 | 执行函数 |
| MessageTypeResp | 3 | 返回结果 |
| MessageTypePing | 4 | 健康检查 |

### 3.4 VM Pool (虚拟机池)

**位置**: `internal/vmpool/pool.go`

VM 池负责：
- 预热虚拟机以减少冷启动
- 管理 VM 生命周期
- 自动扩缩容
- 健康检查和回收

```go
type Pool struct {
    pools map[string]*RuntimePool  // 每个运行时的池
}

type RuntimePool struct {
    runtime string              // 运行时类型
    warmVMs chan *PooledVM      // 预热的 VM
    allVMs  map[string]*PooledVM // 所有 VM
}
```

### 3.5 Compiler (编译器)

**位置**: `internal/compiler/compiler.go`

编译器负责将源代码编译为可执行格式：

| 运行时 | 编译器镜像 | 输出格式 |
|--------|-----------|----------|
| Go 1.24 | `golang:1.24-alpine` | Linux ELF 二进制 |
| Rust/WASM | `nimbus-rust-wasm-compiler:latest` | WebAssembly 模块 |
| Python | 无需编译 | 源代码 |
| Node.js | 无需编译 | 源代码 |

---

## 4. 函数生命周期

### 4.1 函数模型

```go
type Function struct {
    ID              string            // UUID 标识符
    Name            string            // 唯一名称
    Description     string            // 描述
    Runtime         Runtime           // 运行时 (python3.11/nodejs20/go1.24/wasm)
    Handler         string            // 入口点 (如 handler.main)
    Code            string            // 源代码
    Binary          string            // 编译后的二进制 (base64)
    CodeHash        string            // 代码哈希 (版本控制)
    MemoryMB        int               // 内存限制 (默认 256MB)
    TimeoutSec      int               // 超时时间 (默认 30s)
    EnvVars         map[string]string // 环境变量
    Status          FunctionStatus    // 状态 (active/inactive/building/failed)
    Version         int               // 版本号
    CronExpression  string            // Cron 表达式 (定时任务)
    HTTPPath        string            // 自定义 HTTP 路径
    HTTPMethods     []string          // HTTP 方法
    CreatedAt       time.Time
    UpdatedAt       time.Time
}
```

### 4.2 函数状态

```
创建请求 → building → active
                ↓
            failed (编译失败)

更新请求 → building → active
                ↓
            failed (编译失败)

删除请求 → (从数据库移除)
```

---

## 5. 代码编译

### 5.1 Go 编译流程

```
1. 创建临时目录
2. 写入 main.go 源代码
3. 生成 go.mod 文件
4. 检测目标架构 (arm64/amd64)
5. 启动 Docker 容器编译:
   docker run golang:1.24-alpine \
     go build -ldflags="-s -w" -o handler main.go
6. 读取编译后的二进制
7. Base64 编码并存储
```

### 5.2 Rust/WASM 编译流程

```
1. 创建临时目录
2. 写入 handler.rs 源代码
3. 启动 Docker 容器编译:
   docker run nimbus-rust-wasm-compiler:latest \
     rustc --edition=2021 \
           --target wasm32-unknown-unknown \
           -O -C panic=abort \
           --crate-type=cdylib \
           -o handler.wasm handler.rs
4. 读取 .wasm 文件
5. Base64 编码并存储
```

### 5.3 编译器镜像

**nimbus-rust-wasm-compiler** (`Dockerfile.rust-wasm-compiler`):

```dockerfile
FROM rust:1.75-slim
RUN rustup target add wasm32-unknown-unknown
WORKDIR /work
```

---

## 6. 函数执行流程

### 6.1 同步调用流程

```
用户请求: POST /api/v1/functions/{id}/invoke
    │
    ▼
┌─────────────────────────────────────┐
│ 1. API Handler                      │
│    - 从数据库获取函数定义            │
│    - 创建 Invocation 记录 (pending) │
│    - 调用 Scheduler.Invoke()        │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│ 2. Scheduler                        │
│    - 创建 workItem                  │
│    - 推入 workQueue                 │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│ 3. Worker                           │
│    - 从 workQueue 取出任务          │
│    - 从 VM Pool 获取 VM             │
│    - 通过 vsock 发送 Init 消息      │
│    - 通过 vsock 发送 Exec 消息      │
│    - 等待 Agent 响应                │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│ 4. Agent (VM 内部)                  │
│    - 接收 Init: 初始化运行时        │
│    - 接收 Exec: 执行函数            │
│    - 返回 Resp: 结果+指标           │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│ 5. Worker                           │
│    - 更新 Invocation 记录           │
│    - 释放 VM 回池                   │
│    - 返回结果给 Handler             │
└───────────────┬─────────────────────┘
                │
                ▼
返回响应给用户
```

### 6.2 调用记录模型

```go
type Invocation struct {
    ID              string           // UUID
    FunctionID      string           // 函数 ID
    FunctionName    string           // 函数名称
    TriggerType     TriggerType      // http/event/cron
    Status          InvocationStatus // pending/running/success/failed/timeout
    Input           json.RawMessage  // 输入参数
    Output          json.RawMessage  // 输出结果
    Error           string           // 错误信息
    ColdStart       bool             // 是否冷启动
    VMID            string           // 执行的 VM ID
    StartedAt       *time.Time       // 开始时间
    CompletedAt     *time.Time       // 完成时间
    DurationMs      int64            // 执行时长
    MemoryUsedMB    int              // 内存使用
}
```

### 6.3 各运行时执行方式

**Python**:
```python
# Agent 创建 wrapper 脚本
import json, sys
from handler import handle
event = json.load(sys.stdin)
result = handle(event)
print(json.dumps(result))
```

**Node.js**:
```javascript
// Agent 创建 wrapper 脚本
const handler = require('./handler');
const input = JSON.parse(require('fs').readFileSync(0, 'utf-8'));
Promise.resolve(handler.handle(input))
  .then(result => console.log(JSON.stringify(result)));
```

**Go**:
```go
// 直接执行编译后的二进制
// 从 stdin 读取 JSON，输出到 stdout
```

**WebAssembly**:
```go
// 使用 wazero 运行时
// 1. 加载 .wasm 模块
// 2. 调用 alloc(size) 分配内存
// 3. 写入输入数据
// 4. 调用 handle(ptr, len)
// 5. 解析返回值: (output_ptr << 32) | output_len
// 6. 读取输出数据
```

---

## 7. 隔离与安全

### 7.1 多层隔离架构

```
┌─────────────────────────────────────────────┐
│ 第 1 层: 硬件虚拟化 (Firecracker + KVM)      │
│ - 每个 VM 独立的内核实例                     │
│ - 无共享内存                                │
│ - vsock 限制为特定端口                       │
└─────────────────────────────────────────────┘
                    │
┌─────────────────────────────────────────────┐
│ 第 2 层: 网络隔离                            │
│ - 虚拟网桥 (172.20.0.0/16)                  │
│ - NAT 用于外部连接                          │
│ - 可配置禁用网络访问                         │
└─────────────────────────────────────────────┘
                    │
┌─────────────────────────────────────────────┐
│ 第 3 层: 资源限制                            │
│ - 内存: 可配置 (默认 256MB)                  │
│ - CPU: 可配置 (默认 1 vCPU)                  │
│ - 超时: 可配置 (默认 30s)                    │
└─────────────────────────────────────────────┘
                    │
┌─────────────────────────────────────────────┐
│ 第 4 层: 文件系统隔离                        │
│ - 每个 VM 独立的 rootfs                      │
│ - 临时文件系统 (tmpfs/overlay)               │
│ - 函数代码放在 /var/function/               │
└─────────────────────────────────────────────┘
```

### 7.2 Docker 模式隔离

- 容器命名空间隔离 (cgroup, network, mount)
- 资源限制 (memory, cpu)
- 默认禁用网络访问
- 只读文件系统

---

## 8. VM 池管理

### 8.1 池配置

```yaml
pool:
  health_check_interval: 10s    # 健康检查间隔
  max_vm_age: 1h                # VM 最大存活时间
  max_invocations: 1000         # 单 VM 最大调用次数
  use_snapshots: true           # 启用快照恢复

  runtimes:
    - runtime: python3.11
      min_warm: 2               # 最小预热数量
      max_total: 50             # 最大 VM 数量
      target_warm: 5            # 目标预热数量
      memory_mb: 256
      vcpus: 1

    - runtime: nodejs20
      min_warm: 2
      max_total: 50
      target_warm: 5
      memory_mb: 256
      vcpus: 1
```

### 8.2 VM 获取流程

```
AcquireVM(runtime):
    │
    ├─► 尝试从 warmVMs 获取
    │       │
    │       ├─► 成功: 标记为 busy, 返回 (cold_start=false)
    │       │
    │       └─► 失败: 继续 ▼
    │
    ├─► 检查是否可以创建新 VM (total < max)
    │       │
    │       ├─► 可以: 创建新 VM, 返回 (cold_start=true)
    │       │
    │       └─► 不可以: 继续 ▼
    │
    └─► 等待 VM 释放
```

### 8.3 VM 释放流程

```
ReleaseVM(vm):
    │
    ├─► 检查是否需要回收
    │   (age > max_age 或 use_count > max_invocations)
    │       │
    │       ├─► 需要: 停止并清理 VM
    │       │
    │       └─► 不需要: 继续 ▼
    │
    └─► 标记为 warm, 放回 warmVMs 池
```

### 8.4 快照优化

启用快照后的启动流程：

```
无快照: 启动 Firecracker → 加载内核 → 挂载 rootfs → 启动 Agent → 就绪
        └─────────────────── ~125ms ──────────────────────────────┘

有快照: 恢复内存快照 → 就绪
        └──── ~5ms ────┘
```

---

## 9. 数据存储

### 9.1 PostgreSQL Schema

**functions 表**:
```sql
CREATE TABLE functions (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(64) UNIQUE NOT NULL,
    description TEXT,
    runtime VARCHAR(32) NOT NULL,
    handler VARCHAR(256) NOT NULL,
    code TEXT,
    binary TEXT,
    code_hash VARCHAR(64),
    memory_mb INTEGER DEFAULT 256,
    timeout_sec INTEGER DEFAULT 30,
    env_vars JSONB DEFAULT '{}',
    status VARCHAR(32) DEFAULT 'active',
    version INTEGER DEFAULT 1,
    cron_expression VARCHAR(128),
    http_path VARCHAR(256),
    http_methods JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
);
```

**invocations 表**:
```sql
CREATE TABLE invocations (
    id VARCHAR(36) PRIMARY KEY,
    function_id VARCHAR(36) REFERENCES functions(id) ON DELETE CASCADE,
    function_name VARCHAR(64) NOT NULL,
    trigger_type VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL,
    input JSONB,
    output JSONB,
    error TEXT,
    cold_start BOOLEAN DEFAULT FALSE,
    vm_id VARCHAR(36),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_ms BIGINT DEFAULT 0,
    memory_used_mb INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE
);
```

### 9.2 Redis 用途

- 函数定义缓存
- 调用状态缓存
- 工作队列溢出存储
- 分布式锁

---

## 10. 部署方式

### 10.1 OrbStack 快速启动 (macOS 开发)

```bash
cd deployments/k8s/overlays/orbstack
./start.sh
```

启动脚本会自动：
1. 构建所有运行时镜像
2. 构建编译器镜像 (`nimbus-rust-wasm-compiler:latest`)
3. 构建 Gateway 镜像
4. 部署到 Kubernetes
5. 加载镜像到 DinD 容器
6. 创建示例函数

启动完成后的服务地址：

| 服务 | 地址 | 说明 |
|------|------|------|
| API Gateway | http://192.168.139.2:8080 | 函数管理和调用 |
| Web UI | http://localhost:32002 | Web 控制台 |
| Prometheus | http://localhost:9090 | 监控指标 |
| Grafana | http://192.168.139.2:3000 | 监控仪表板 |

---

## 11. 性能特性

### 11.1 延迟指标

| 场景 | 延迟 | 说明 |
|------|------|------|
| 热启动 | ~2ms | 复用已初始化的 VM |
| 冷启动 (快照) | ~5ms | 从内存快照恢复 |
| 冷启动 (完整) | ~125ms | 完整启动 VM |
| 函数执行开销 | <1ms | 原生执行 |

### 11.2 容量配置

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| 每运行时最大 VM | 50 | 可配置 |
| 每 VM 内存 | 256MB | 可配置 |
| 每 VM CPU | 1 vCPU | 可配置 |
| 调用超时 | 30s | 可配置 |
| VM 最大复用次数 | 1000 | 超过后回收 |
| VM 最大存活时间 | 1h | 超过后回收 |

### 11.3 监控指标 (Prometheus)

```
# 调用指标
nimbus_invocations_total{function_id, runtime, status}
nimbus_invocation_duration_ms{function_id, runtime, cold_start}
nimbus_invocation_errors_total{function_id, error_type}

# VM 池指标
nimbus_vm_pool_size{runtime}
nimbus_vm_pool_warm{runtime}
nimbus_cold_starts_total{runtime}
nimbus_vm_boot_duration_ms{runtime, from_snapshot}

# 调度器指标
nimbus_scheduler_queue_size
nimbus_scheduler_workers
```

---

## 关键文件索引

| 组件 | 文件 | 描述 |
|------|------|------|
| Gateway | `cmd/gateway/main.go` | HTTP API 服务入口 |
| Agent | `cmd/agent/main.go` | VM 内执行代理 |
| Scheduler | `internal/scheduler/scheduler.go` | 调度器 |
| VM Pool | `internal/vmpool/pool.go` | VM 池管理 |
| Firecracker | `internal/firecracker/machine.go` | VM 生命周期 |
| Docker | `internal/docker/manager.go` | 容器管理 |
| Compiler | `internal/compiler/compiler.go` | 代码编译 |
| Storage | `internal/storage/postgres.go` | 数据持久化 |
| Domain | `internal/domain/` | 数据模型 |
| Config | `internal/config/config.go` | 配置加载 |
| API | `internal/api/handler.go` | API 处理器 |
| Vsock | `internal/firecracker/vsock.go` | VM 通信 |

---

## 总结

Nimbus 是一个功能完整的 Serverless 平台，具备以下特点：

- **强隔离**: 通过 Firecracker MicroVM 实现硬件级隔离
- **低延迟**: 快照恢复实现 ~5ms 冷启动
- **多语言**: 支持 Python、Node.js、Go、WebAssembly
- **灵活部署**: 支持 Docker Compose 和 Kubernetes
- **可观测**: Prometheus 指标、结构化日志
- **可扩展**: 自动扩缩容的 VM 池、分布式调度
