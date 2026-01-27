//go:build linux
// +build linux

// Package main 包含调试适配器接口和通用实现
// 提供 DAP (Debug Adapter Protocol) 支持的统一接口
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
)

// DebugAdapter 定义调试适配器接口
// 所有运行时的调试器（debugpy、Node Inspector、Delve）都必须实现此接口
type DebugAdapter interface {
	// Start 启动调试器
	// 参数:
	//   - config: 调试配置
	// 返回:
	//   - error: 启动错误
	Start(config *DebugConfig) error

	// HandleDAP 处理 DAP 请求消息
	// 参数:
	//   - msg: DAP 请求消息（JSON 格式）
	// 返回:
	//   - []json.RawMessage: DAP 响应消息列表
	//   - error: 处理错误
	HandleDAP(msg json.RawMessage) ([]json.RawMessage, error)

	// Events 返回 DAP 事件通道
	// 调试器产生的事件（如 stopped、output 等）通过此通道推送
	Events() <-chan json.RawMessage

	// Stop 停止调试器
	Stop() error

	// IsRunning 检查调试器是否正在运行
	IsRunning() bool
}

// DebugConfig 调试配置
type DebugConfig struct {
	// FunctionID 函数 ID
	FunctionID string `json:"function_id"`
	// Handler 函数入口点
	Handler string `json:"handler"`
	// CodePath 代码路径
	CodePath string `json:"code_path"`
	// Runtime 运行时类型
	Runtime string `json:"runtime"`
	// Port 调试器端口（可选，默认自动分配）
	Port int `json:"port,omitempty"`
	// StopOnEntry 是否在入口处暂停
	StopOnEntry bool `json:"stop_on_entry"`
	// EnvVars 环境变量
	EnvVars map[string]string `json:"env_vars,omitempty"`
	// TimeoutSec 超时时间
	TimeoutSec int `json:"timeout_sec"`
}

// DebugManager 调试管理器
// 管理当前活跃的调试适配器
type DebugManager struct {
	adapter DebugAdapter
	config  *DebugConfig
	mu      sync.RWMutex
}

// NewDebugManager 创建调试管理器
func NewDebugManager() *DebugManager {
	return &DebugManager{}
}

// StartDebug 启动调试会话
func (m *DebugManager) StartDebug(config *DebugConfig) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	// 如果已有调试会话，先停止
	if m.adapter != nil && m.adapter.IsRunning() {
		m.adapter.Stop()
	}

	// 根据运行时创建对应的调试适配器
	adapter, err := newDebugAdapter(config.Runtime)
	if err != nil {
		return err
	}

	// 启动调试器
	if err := adapter.Start(config); err != nil {
		return err
	}

	m.adapter = adapter
	m.config = config
	return nil
}

// HandleDAP 处理 DAP 消息
func (m *DebugManager) HandleDAP(msg json.RawMessage) ([]json.RawMessage, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if m.adapter == nil {
		return nil, fmt.Errorf("no debug session active")
	}

	return m.adapter.HandleDAP(msg)
}

// Events 返回事件通道
func (m *DebugManager) Events() <-chan json.RawMessage {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if m.adapter == nil {
		// 返回空通道
		ch := make(chan json.RawMessage)
		close(ch)
		return ch
	}

	return m.adapter.Events()
}

// StopDebug 停止调试会话
func (m *DebugManager) StopDebug() error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.adapter != nil {
		err := m.adapter.Stop()
		m.adapter = nil
		m.config = nil
		return err
	}
	return nil
}

// IsDebugging 检查是否正在调试
func (m *DebugManager) IsDebugging() bool {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.adapter != nil && m.adapter.IsRunning()
}

// newDebugAdapter 根据运行时创建调试适配器
func newDebugAdapter(runtime string) (DebugAdapter, error) {
	switch runtime {
	case "python3.11":
		return NewPythonDebugAdapter(), nil
	case "nodejs20":
		return nil, fmt.Errorf("Node.js debugging not yet implemented")
	case "go1.24":
		return nil, fmt.Errorf("Go debugging not yet implemented")
	default:
		return nil, fmt.Errorf("debugging not supported for runtime: %s", runtime)
	}
}

// DAP 消息类型定义
// 这些类型用于解析和构建 DAP 协议消息

// DAPMessage DAP 协议基础消息
type DAPMessage struct {
	Seq  int    `json:"seq"`
	Type string `json:"type"` // "request", "response", "event"
}

// DAPRequest DAP 请求消息
type DAPRequest struct {
	DAPMessage
	Command   string          `json:"command"`
	Arguments json.RawMessage `json:"arguments,omitempty"`
}

// DAPResponse DAP 响应消息
type DAPResponse struct {
	DAPMessage
	RequestSeq int             `json:"request_seq"`
	Success    bool            `json:"success"`
	Command    string          `json:"command"`
	Message    string          `json:"message,omitempty"`
	Body       json.RawMessage `json:"body,omitempty"`
}

// DAPEvent DAP 事件消息
type DAPEvent struct {
	DAPMessage
	Event string          `json:"event"`
	Body  json.RawMessage `json:"body,omitempty"`
}

// NewDAPResponse 创建 DAP 响应
func NewDAPResponse(seq int, requestSeq int, command string, success bool, body interface{}) (json.RawMessage, error) {
	resp := DAPResponse{
		DAPMessage: DAPMessage{
			Seq:  seq,
			Type: "response",
		},
		RequestSeq: requestSeq,
		Success:    success,
		Command:    command,
	}

	if body != nil {
		bodyBytes, err := json.Marshal(body)
		if err != nil {
			return nil, err
		}
		resp.Body = bodyBytes
	}

	return json.Marshal(resp)
}

// NewDAPEvent 创建 DAP 事件
func NewDAPEvent(seq int, event string, body interface{}) (json.RawMessage, error) {
	evt := DAPEvent{
		DAPMessage: DAPMessage{
			Seq:  seq,
			Type: "event",
		},
		Event: event,
	}

	if body != nil {
		bodyBytes, err := json.Marshal(body)
		if err != nil {
			return nil, err
		}
		evt.Body = bodyBytes
	}

	return json.Marshal(evt)
}

// ParseDAPRequest 解析 DAP 请求
func ParseDAPRequest(data json.RawMessage) (*DAPRequest, error) {
	var req DAPRequest
	if err := json.Unmarshal(data, &req); err != nil {
		return nil, err
	}
	return &req, nil
}

// BaseDebugAdapter 调试适配器基类
// 提供通用功能，具体实现可以嵌入此结构
type BaseDebugAdapter struct {
	events    chan json.RawMessage
	running   bool
	seqNum    int
	mu        sync.RWMutex
	ctx       context.Context
	cancel    context.CancelFunc
}

// NewBaseDebugAdapter 创建基础调试适配器
func NewBaseDebugAdapter() *BaseDebugAdapter {
	ctx, cancel := context.WithCancel(context.Background())
	return &BaseDebugAdapter{
		events: make(chan json.RawMessage, 100),
		ctx:    ctx,
		cancel: cancel,
	}
}

// Events 返回事件通道
func (a *BaseDebugAdapter) Events() <-chan json.RawMessage {
	return a.events
}

// IsRunning 检查是否运行中
func (a *BaseDebugAdapter) IsRunning() bool {
	a.mu.RLock()
	defer a.mu.RUnlock()
	return a.running
}

// SetRunning 设置运行状态
func (a *BaseDebugAdapter) SetRunning(running bool) {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.running = running
}

// NextSeq 获取下一个序列号
func (a *BaseDebugAdapter) NextSeq() int {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.seqNum++
	return a.seqNum
}

// PushEvent 推送事件
func (a *BaseDebugAdapter) PushEvent(event json.RawMessage) {
	select {
	case a.events <- event:
	default:
		// 通道满，丢弃事件
	}
}

// Context 获取上下文
func (a *BaseDebugAdapter) Context() context.Context {
	return a.ctx
}

// Cancel 取消上下文
func (a *BaseDebugAdapter) Cancel() {
	a.cancel()
}

// Close 关闭事件通道
func (a *BaseDebugAdapter) Close() {
	close(a.events)
}
