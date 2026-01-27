// Package debug 提供调试会话管理功能。
// 该包实现了函数调试的会话管理，支持 DAP (Debug Adapter Protocol) 消息代理。
package debug

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/sirupsen/logrus"
)

// SessionState 调试会话状态
type SessionState string

const (
	// StateInitializing 初始化中
	StateInitializing SessionState = "initializing"
	// StateConnected 已连接
	StateConnected SessionState = "connected"
	// StateRunning 运行中
	StateRunning SessionState = "running"
	// StatePaused 已暂停（断点处）
	StatePaused SessionState = "paused"
	// StateStopped 已停止
	StateStopped SessionState = "stopped"
)

// Session 表示一个调试会话
type Session struct {
	// ID 会话唯一标识
	ID string `json:"id"`
	// FunctionID 关联的函数 ID
	FunctionID string `json:"function_id"`
	// State 当前状态
	State SessionState `json:"state"`
	// CreatedAt 创建时间
	CreatedAt time.Time `json:"created_at"`
	// LastActivity 最后活动时间
	LastActivity time.Time `json:"last_activity"`

	// 内部状态
	ctx        context.Context
	cancel     context.CancelFunc
	eventsChan chan json.RawMessage // DAP 事件通道（从 Agent 到前端）
	mu         sync.RWMutex
}

// NewSession 创建新的调试会话
func NewSession(functionID string) *Session {
	ctx, cancel := context.WithCancel(context.Background())
	return &Session{
		ID:           uuid.New().String()[:8],
		FunctionID:   functionID,
		State:        StateInitializing,
		CreatedAt:    time.Now(),
		LastActivity: time.Now(),
		ctx:          ctx,
		cancel:       cancel,
		eventsChan:   make(chan json.RawMessage, 100),
	}
}

// Events 返回 DAP 事件通道
func (s *Session) Events() <-chan json.RawMessage {
	return s.eventsChan
}

// PushEvent 推送 DAP 事件
func (s *Session) PushEvent(event json.RawMessage) {
	s.mu.Lock()
	s.LastActivity = time.Now()
	s.mu.Unlock()

	select {
	case s.eventsChan <- event:
	default:
		// 通道满，丢弃事件
	}
}

// SetState 设置会话状态
func (s *Session) SetState(state SessionState) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.State = state
	s.LastActivity = time.Now()
}

// GetState 获取会话状态
func (s *Session) GetState() SessionState {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.State
}

// Context 返回会话上下文
func (s *Session) Context() context.Context {
	return s.ctx
}

// Stop 停止会话
func (s *Session) Stop() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.State = StateStopped
	s.cancel()
	close(s.eventsChan)
}

// IsExpired 检查会话是否已过期
func (s *Session) IsExpired(timeout time.Duration) bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return time.Since(s.LastActivity) > timeout
}

// Manager 调试会话管理器
type Manager struct {
	sessions map[string]*Session
	mu       sync.RWMutex
	logger   *logrus.Logger

	// 配置
	sessionTimeout time.Duration
	cleanupTicker  *time.Ticker
}

// ManagerConfig 管理器配置
type ManagerConfig struct {
	// SessionTimeout 会话超时时间（默认 30 分钟）
	SessionTimeout time.Duration
	// CleanupInterval 清理间隔（默认 5 分钟）
	CleanupInterval time.Duration
	// Logger 日志记录器
	Logger *logrus.Logger
}

// NewManager 创建调试会话管理器
func NewManager(cfg *ManagerConfig) *Manager {
	if cfg == nil {
		cfg = &ManagerConfig{}
	}
	if cfg.SessionTimeout == 0 {
		cfg.SessionTimeout = 30 * time.Minute
	}
	if cfg.CleanupInterval == 0 {
		cfg.CleanupInterval = 5 * time.Minute
	}

	m := &Manager{
		sessions:       make(map[string]*Session),
		sessionTimeout: cfg.SessionTimeout,
		logger:         cfg.Logger,
	}

	// 启动定时清理
	m.cleanupTicker = time.NewTicker(cfg.CleanupInterval)
	go m.cleanupLoop()

	return m
}

// CreateSession 创建新的调试会话
func (m *Manager) CreateSession(functionID string) *Session {
	m.mu.Lock()
	defer m.mu.Unlock()

	// 检查是否已有该函数的调试会话
	for _, s := range m.sessions {
		if s.FunctionID == functionID && s.State != StateStopped {
			// 返回现有会话
			return s
		}
	}

	session := NewSession(functionID)
	m.sessions[session.ID] = session

	if m.logger != nil {
		m.logger.WithFields(logrus.Fields{
			"session_id":  session.ID,
			"function_id": functionID,
		}).Info("Created debug session")
	}

	return session
}

// GetSession 获取调试会话
func (m *Manager) GetSession(sessionID string) (*Session, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	session, ok := m.sessions[sessionID]
	if !ok {
		return nil, fmt.Errorf("debug session not found: %s", sessionID)
	}
	return session, nil
}

// GetSessionByFunction 通过函数 ID 获取活跃的调试会话
func (m *Manager) GetSessionByFunction(functionID string) *Session {
	m.mu.RLock()
	defer m.mu.RUnlock()

	for _, s := range m.sessions {
		if s.FunctionID == functionID && s.State != StateStopped {
			return s
		}
	}
	return nil
}

// RemoveSession 移除调试会话
func (m *Manager) RemoveSession(sessionID string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if session, ok := m.sessions[sessionID]; ok {
		session.Stop()
		delete(m.sessions, sessionID)

		if m.logger != nil {
			m.logger.WithField("session_id", sessionID).Info("Removed debug session")
		}
	}
}

// ListSessions 列出所有活跃会话
func (m *Manager) ListSessions() []*Session {
	m.mu.RLock()
	defer m.mu.RUnlock()

	sessions := make([]*Session, 0, len(m.sessions))
	for _, s := range m.sessions {
		if s.State != StateStopped {
			sessions = append(sessions, s)
		}
	}
	return sessions
}

// cleanupLoop 定时清理过期会话
func (m *Manager) cleanupLoop() {
	for range m.cleanupTicker.C {
		m.cleanup()
	}
}

// cleanup 清理过期会话
func (m *Manager) cleanup() {
	m.mu.Lock()
	defer m.mu.Unlock()

	for id, session := range m.sessions {
		if session.IsExpired(m.sessionTimeout) || session.State == StateStopped {
			session.Stop()
			delete(m.sessions, id)

			if m.logger != nil {
				m.logger.WithField("session_id", id).Debug("Cleaned up expired debug session")
			}
		}
	}
}

// Stop 停止管理器
func (m *Manager) Stop() {
	m.cleanupTicker.Stop()

	m.mu.Lock()
	defer m.mu.Unlock()

	for _, session := range m.sessions {
		session.Stop()
	}
	m.sessions = make(map[string]*Session)
}
