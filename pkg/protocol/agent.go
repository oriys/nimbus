// Package protocol 定义了主机与客户机之间通过 vsock 进行通信的协议。
// 该包提供了函数即服务（FaaS）架构中，宿主机与虚拟机/容器之间的消息传递协议，
// 包括函数初始化、执行、健康检查等功能的消息类型和数据结构。
package protocol

import (
	"encoding/json"
)

// 消息类型常量定义
// 用于标识主机与客户机之间通信的消息类型
const (
	// TypeInit 初始化消息类型，用于在客户机中初始化函数运行环境
	TypeInit = 1
	// TypeExec 执行消息类型，用于触发函数执行
	TypeExec = 2
	// TypeResp 响应消息类型，用于返回函数执行结果
	TypeResp = 3
	// TypePing 心跳检测请求消息类型，用于检查客户机是否存活
	TypePing = 4
	// TypePong 心跳检测响应消息类型，用于响应心跳检测请求
	TypePong = 5
	// TypeDebug 调试指令类型，用于发送 DAP/CDP 消息
	TypeDebug = 6
)

// Message 表示主机与客户机之间通过 vsock 传输的消息结构。
// 该结构体是所有消息类型的通用容器，通过 Type 字段区分不同的消息类型，
// Payload 字段携带具体的消息内容（如初始化请求、执行请求或响应数据）。
type Message struct {
	// Type 消息类型，对应 TypeInit、TypeExec、TypeResp、TypePing、TypePong 常量
	Type uint8 `json:"type"`
	// RequestID 请求唯一标识符，用于关联请求与响应
	RequestID string `json:"request_id"`
	// Payload 消息载荷，包含具体的请求或响应数据，使用 JSON 原始格式存储
	Payload json.RawMessage `json:"payload,omitempty"`
}

// InitRequest 初始化请求结构体，用于在客户机中初始化函数运行环境。
// 该请求包含函数的所有配置信息，如代码、运行时、资源限制等，
// 客户机收到此请求后会准备好函数执行所需的环境。
type InitRequest struct {
	// FunctionID 函数唯一标识符
	FunctionID string `json:"function_id"`
	// Handler 函数入口处理器名称（如 "main.handler"）
	Handler string `json:"handler"`
	// Code 函数代码内容（可能是源码或压缩包的 base64 编码）
	Code string `json:"code"`
	// Runtime 函数运行时环境（如 "python3.9"、"nodejs16"、"go1.19"）
	Runtime string `json:"runtime"`
	// EnvVars 函数执行时的环境变量
	EnvVars map[string]string `json:"env_vars,omitempty"`
	// MemoryLimitMB 函数内存限制（单位：MB）
	MemoryLimitMB int `json:"memory_limit_mb"`
	// TimeoutSec 函数执行超时时间（单位：秒）
	TimeoutSec int `json:"timeout_sec"`
	// DebugMode 是否启用调试模式
	DebugMode bool `json:"debug_mode,omitempty"`
}

// ExecRequest 执行请求结构体，用于触发已初始化的函数执行。
// 该请求携带函数的输入参数，客户机收到后会调用对应的函数处理器。
type ExecRequest struct {
	// Input 函数输入参数，使用 JSON 原始格式存储，由函数自行解析
	Input json.RawMessage `json:"input"`
}

// Response 响应结构体，用于返回函数初始化或执行的结果。
// 客户机在完成函数初始化或执行后，会通过此结构体返回处理结果，
// 包括执行状态、输出数据、错误信息以及性能指标。
type Response struct {
	// Success 表示操作是否成功
	Success bool `json:"success"`
	// Output 函数执行的输出结果，使用 JSON 原始格式存储
	Output json.RawMessage `json:"output,omitempty"`
	// Error 错误信息，当 Success 为 false 时包含具体的错误描述
	Error string `json:"error,omitempty"`
	// DurationMs 函数执行耗时（单位：毫秒）
	DurationMs int64 `json:"duration_ms"`
	// MemoryUsedMB 函数执行期间使用的内存（单位：MB）
	MemoryUsedMB int `json:"memory_used_mb"`
}

// NewInitMessage 创建一个新的初始化消息。
// 该函数将 InitRequest 序列化为 JSON 并封装到 Message 中，
// 用于主机向客户机发送函数初始化请求。
//
// 参数:
//   - requestID: 请求唯一标识符，用于追踪和关联响应
//   - req: 初始化请求，包含函数的配置信息
//
// 返回值:
//   - *Message: 封装好的消息对象
//   - error: 如果 JSON 序列化失败则返回错误
func NewInitMessage(requestID string, req *InitRequest) (*Message, error) {
	payload, err := json.Marshal(req)
	if err != nil {
		return nil, err
	}
	return &Message{
		Type:      TypeInit,
		RequestID: requestID,
		Payload:   payload,
	}, nil
}

// NewExecMessage 创建一个新的执行消息。
// 该函数将函数输入参数封装到 ExecRequest 中，并序列化为 Message，
// 用于主机向客户机发送函数执行请求。
//
// 参数:
//   - requestID: 请求唯一标识符，用于追踪和关联响应
//   - input: 函数输入参数，使用 JSON 原始格式
//
// 返回值:
//   - *Message: 封装好的消息对象
//   - error: 如果 JSON 序列化失败则返回错误
func NewExecMessage(requestID string, input json.RawMessage) (*Message, error) {
	req := &ExecRequest{Input: input}
	payload, err := json.Marshal(req)
	if err != nil {
		return nil, err
	}
	return &Message{
		Type:      TypeExec,
		RequestID: requestID,
		Payload:   payload,
	}, nil
}

// NewPingMessage 创建一个新的心跳检测请求消息。
// 该函数创建一个不带载荷的 Ping 消息，用于检测客户机是否存活。
//
// 参数:
//   - requestID: 请求唯一标识符，用于追踪和关联响应
//
// 返回值:
//   - *Message: 心跳请求消息对象
func NewPingMessage(requestID string) *Message {
	return &Message{
		Type:      TypePing,
		RequestID: requestID,
	}
}

// NewPongMessage 创建一个新的心跳检测响应消息。
// 该函数创建一个不带载荷的 Pong 消息，用于响应心跳检测请求。
//
// 参数:
//   - requestID: 请求唯一标识符，与对应的 Ping 消息相同
//
// 返回值:
//   - *Message: 心跳响应消息对象
func NewPongMessage(requestID string) *Message {
	return &Message{
		Type:      TypePong,
		RequestID: requestID,
	}
}

// NewResponseMessage 创建一个新的响应消息。
// 该函数将 Response 序列化为 JSON 并封装到 Message 中，
// 用于客户机向主机返回函数初始化或执行的结果。
//
// 参数:
//   - requestID: 请求唯一标识符，与对应的请求消息相同
//   - resp: 响应数据，包含执行结果和性能指标
//
// 返回值:
//   - *Message: 封装好的响应消息对象
//   - error: 如果 JSON 序列化失败则返回错误
func NewResponseMessage(requestID string, resp *Response) (*Message, error) {
	payload, err := json.Marshal(resp)
	if err != nil {
		return nil, err
	}
	return &Message{
		Type:      TypeResp,
		RequestID: requestID,
		Payload:   payload,
	}, nil
}

// ParseResponse 解析消息载荷为 Response 结构体。
// 该方法用于从响应消息中提取具体的响应数据，
// 主机收到响应消息后可以通过此方法获取函数执行结果。
//
// 返回值:
//   - *Response: 解析后的响应数据
//   - error: 如果 JSON 反序列化失败则返回错误
func (m *Message) ParseResponse() (*Response, error) {
	var resp Response
	if err := json.Unmarshal(m.Payload, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

// DebugAction 定义调试操作类型
type DebugAction string

const (
	// DebugActionStart 启动调试会话
	DebugActionStart DebugAction = "start"
	// DebugActionStop 停止调试会话
	DebugActionStop DebugAction = "stop"
	// DebugActionDAP 传递 DAP 消息
	DebugActionDAP DebugAction = "dap"
)

// DebugRequest 调试请求结构体，用于控制调试会话。
// 该请求支持启动/停止调试会话，以及传递 DAP (Debug Adapter Protocol) 消息。
type DebugRequest struct {
	// Action 调试操作类型：start, stop, dap
	Action DebugAction `json:"action"`
	// DAPMessage DAP 协议消息，当 Action 为 "dap" 时使用
	DAPMessage json.RawMessage `json:"dap_message,omitempty"`
	// Config 调试配置，当 Action 为 "start" 时使用
	Config *DebugConfig `json:"config,omitempty"`
}

// DebugConfig 调试配置
type DebugConfig struct {
	// DebuggerPort 调试器监听端口
	DebuggerPort int `json:"debugger_port,omitempty"`
	// StopOnEntry 是否在入口处暂停
	StopOnEntry bool `json:"stop_on_entry,omitempty"`
}

// DebugResponse 调试响应结构体
type DebugResponse struct {
	// Success 操作是否成功
	Success bool `json:"success"`
	// Error 错误信息
	Error string `json:"error,omitempty"`
	// DAPMessages DAP 响应/事件消息列表
	DAPMessages []json.RawMessage `json:"dap_messages,omitempty"`
	// SessionID 调试会话 ID
	SessionID string `json:"session_id,omitempty"`
}

// NewDebugMessage 创建调试消息
//
// 参数:
//   - requestID: 请求唯一标识符
//   - req: 调试请求
//
// 返回值:
//   - *Message: 封装好的消息对象
//   - error: 如果 JSON 序列化失败则返回错误
func NewDebugMessage(requestID string, req *DebugRequest) (*Message, error) {
	payload, err := json.Marshal(req)
	if err != nil {
		return nil, err
	}
	return &Message{
		Type:      TypeDebug,
		RequestID: requestID,
		Payload:   payload,
	}, nil
}

// ParseDebugRequest 解析调试请求
func (m *Message) ParseDebugRequest() (*DebugRequest, error) {
	var req DebugRequest
	if err := json.Unmarshal(m.Payload, &req); err != nil {
		return nil, err
	}
	return &req, nil
}

// ParseDebugResponse 解析调试响应
func (m *Message) ParseDebugResponse() (*DebugResponse, error) {
	var resp DebugResponse
	if err := json.Unmarshal(m.Payload, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}
