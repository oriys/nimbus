# 核心流程图 (Workflows)

本文档通过图表展示 Nimbus 平台的关键工作流程，包括函数创建、同步/异步调用以及虚拟机池管理。

## 1. 函数创建与编译流程 (Function Build Flow)

```mermaid
sequenceDiagram
    participant User
    participant Gateway
    participant Compiler
    participant Docker
    participant DB as PostgreSQL

    User->>Gateway: POST /functions (Source Code)
    activate Gateway
    
    Gateway->>Gateway: Validate Req & Hash Code
    
    alt is Compiled Language (Go/Rust)
        Gateway->>Compiler: CompileRequest
        activate Compiler
        Compiler->>Docker: Run Builder Container
        activate Docker
        Docker-->>Compiler: Binary / WASM
        deactivate Docker
        Compiler-->>Gateway: Base64 Artifact
        deactivate Compiler
    end

    Gateway->>DB: Insert Function Metadata
    Gateway-->>User: 201 Created (Function ID)
    deactivate Gateway
```

## 2. 函数同步调用流程 (Sync Invocation Flow)

这是平台最核心的流程，展示了请求如何穿透网关、调度器直达 MicroVM。

```mermaid
sequenceDiagram
    autonumber
    participant User
    participant Gateway
    participant DB as PostgreSQL
    participant Sched as Scheduler (Worker)
    participant Pool as VM Pool
    participant MM as MachineMgr
    participant VM as Firecracker VM

    User->>Gateway: POST /invoke {payload}
    activate Gateway
    
    Gateway->>DB: Create Invocation (Pending)
    Gateway->>Sched: Enqueue WorkItem
    activate Sched
    
    Note over Sched, Pool: 资源获取阶段
    Sched->>Pool: AcquireVM(runtime)
    activate Pool
    
    alt Has Warm VM
        Pool-->>Sched: Return Warm VM (Hot Start <2ms)
    else Pool Empty
        Pool->>MM: CreateVM (Cold Start)
        activate MM
        MM->>VM: Spawn Process (jailer+firecracker)
        activate VM
        VM-->>MM: Ready
        deactivate MM
        MM-->>Pool: VM Info
        Pool-->>Sched: Return New VM (Cold Start ~125ms)
    end
    deactivate Pool

    Note over Sched, VM: 执行阶段 (Vsock)
    Sched->>VM: Protocol: InitRequest (Code/Env)
    Sched->>VM: Protocol: ExecRequest (Payload)
    VM-->>Sched: Protocol: Response (Output/Error)

    Note over Sched, Pool: 资源回收阶段
    Sched->>Pool: ReleaseVM(vm_id)
    alt Keep Warm
        Pool->>Pool: Reset & Add to WarmQueue
    else Age/Usage Limit Exceeded
        Pool->>MM: StopVM
        MM->>VM: Kill Process
        deactivate VM
    end

    Sched->>DB: Update Invocation (Success/Duration)
    Sched-->>Gateway: Return Result
    deactivate Sched
    
    Gateway-->>User: 200 OK (JSON Result)
    deactivate Gateway
```

## 3. 虚拟机池管理逻辑 (VM Pool Lifecycle)

展示后台如何自动维护预热池以降低冷启动。

```mermaid
flowchart TD
    subgraph Background Workers
        Start[Pool Start] --> Prewarm
        
        %% 预热循环
        Prewarm[Pre-warm Loop] --> CheckCount{Warm < MinWarm?}
        CheckCount -- Yes --> Create[Create VM]
        Create --> AddToQueue[Add to Warm Queue]
        AddToQueue --> CheckCount
        CheckCount -- No --> Sleep[Sleep / Wait]
        
        %% 健康检查循环
        Sleep -.-> Health[Health Check Loop]
        Health --> Ping{Vsock Ping?}
        Ping -- Fail --> Destroy[Destroy VM]
        Ping -- OK --> CheckAge{Age > MaxAge?}
        CheckAge -- Yes --> Destroy
        CheckAge -- No --> Keep[Keep Warm]
    end

    subgraph VM State Transition
        New((New)) --> |Cold Start| Busy
        Warm((Warm)) --> |Acquire| Busy
        Busy((Busy)) --> |Release| Decision{Keep?}
        Decision -- Yes --> Warm
        Decision -- No --> Dead((Destroyed))
    end
```
