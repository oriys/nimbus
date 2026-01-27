// Package executor 定义函数执行器的抽象接口。
// 不同运行时后端（如 Firecracker、Docker、containerd 等）可通过实现该接口接入调度器。
//
// 执行器是函数计算平台的核心抽象，负责将函数代码在隔离环境中执行。
// 平台支持多种执行器实现，可根据安全性、性能和资源需求选择：
//   - Firecracker: 轻量级虚拟机，提供最强隔离性，适合生产环境
//   - Docker: 容器化执行，平衡隔离性和启动速度
//   - 进程: 直接进程执行，启动最快但隔离性较弱
package executor

import (
	"context"
	"encoding/json"

	"github.com/oriys/nimbus/internal/domain"
)

// Executor 定义函数执行器接口。
// 执行器负责在指定运行时环境中执行函数代码，管理资源隔离和生命周期。
//
// 实现者需要处理以下职责：
//   - 创建和管理执行环境（VM、容器或进程）
//   - 注入函数代码和依赖
//   - 传递输入参数并收集输出
//   - 实施资源限制（内存、CPU、超时）
//   - 记录执行指标（冷启动、耗时等）
type Executor interface {
	// Execute 执行指定函数并返回执行结果。
	//
	// 参数:
	//   - ctx: 上下文，用于超时和取消控制
	//   - fn: 要执行的函数定义，包含代码、运行时、资源配置等
	//   - payload: 函数输入参数，JSON 格式
	//
	// 返回:
	//   - *domain.InvokeResponse: 执行结果，包含输出、状态码、执行时间等
	//   - error: 执行过程中的系统错误（非业务错误）
	Execute(ctx context.Context, fn *domain.Function, payload json.RawMessage) (*domain.InvokeResponse, error)
}
