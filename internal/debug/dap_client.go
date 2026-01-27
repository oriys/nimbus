// Package debug 提供调试功能支持。
// 本文件实现 DAP (Debug Adapter Protocol) 客户端。
package debug

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/sirupsen/logrus"
)

// DAPClient DAP 协议客户端
// 用于与 debugpy 等调试适配器通信
type DAPClient struct {
	conn   net.Conn
	reader *bufio.Reader
	writer io.Writer
	logger *logrus.Logger

	// 消息序列号
	seq   int
	seqMu sync.Mutex

	// 事件回调
	onEvent func(event json.RawMessage)

	// 响应等待
	pendingRequests map[int]chan json.RawMessage
	pendingMu       sync.Mutex

	// 状态
	connected bool
	closeCh   chan struct{}
}

// NewDAPClient 创建 DAP 客户端
func NewDAPClient(logger *logrus.Logger) *DAPClient {
	return &DAPClient{
		logger:          logger,
		pendingRequests: make(map[int]chan json.RawMessage),
		closeCh:         make(chan struct{}),
	}
}

// Connect 连接到 DAP 服务器
func (c *DAPClient) Connect(host string, port int) error {
	addr := fmt.Sprintf("%s:%d", host, port)
	conn, err := net.DialTimeout("tcp", addr, 5*time.Second)
	if err != nil {
		return fmt.Errorf("failed to connect to DAP server at %s: %w", addr, err)
	}

	c.conn = conn
	c.reader = bufio.NewReader(conn)
	c.writer = conn
	c.connected = true

	// 验证 debugpy 是否真正就绪
	// debugpy 就绪后会在收到 DAP 请求时响应，但连接后不会主动发数据
	// 通过设置短超时读取来检测：
	// - EOF/reset = Docker 端口代理已开放但 debugpy 还没监听
	// - timeout = debugpy 已就绪，正在等待我们的请求
	c.conn.SetReadDeadline(time.Now().Add(3 * time.Second))
	buf := make([]byte, 1)
	_, readErr := c.conn.Read(buf)
	c.conn.SetReadDeadline(time.Time{}) // 重置超时

	if readErr != nil {
		if netErr, ok := readErr.(net.Error); ok && netErr.Timeout() {
			// 超时 = 连接正常，debugpy 在等待我们的请求
			c.logger.WithField("addr", addr).Debug("Debugpy connection verified (read timeout)")
		} else {
			// EOF 或 reset = debugpy 还没就绪
			c.connected = false
			c.conn.Close()
			return fmt.Errorf("debugpy not ready at %s: %w", addr, readErr)
		}
	} else {
		// 成功读到数据 - 可能是 debugpy 的初始消息
		// 将读到的字节放回 reader（通过 UnreadByte）
		// bufio.Reader 可以 unread
		c.logger.WithField("first_byte", string(buf)).Debug("Received initial byte from debugpy")
		// 由于我们直接从 conn 读取了，需要重建 reader 并将这个字节放回
		c.reader = bufio.NewReader(io.MultiReader(
			strings.NewReader(string(buf)),
			c.conn,
		))
	}

	// 启动消息读取协程
	go c.readLoop()

	c.logger.WithField("addr", addr).Info("Connected to DAP server")
	return nil
}

// Close 关闭连接
func (c *DAPClient) Close() error {
	if !c.connected {
		return nil
	}

	c.connected = false
	close(c.closeCh)

	if c.conn != nil {
		return c.conn.Close()
	}
	return nil
}

// IsConnected 检查是否已连接
func (c *DAPClient) IsConnected() bool {
	return c.connected
}

// SetEventHandler 设置事件回调
func (c *DAPClient) SetEventHandler(handler func(event json.RawMessage)) {
	c.onEvent = handler
}

// SendRequest 发送 DAP 请求并等待响应
func (c *DAPClient) SendRequest(command string, arguments interface{}) (json.RawMessage, error) {
	if !c.connected {
		return nil, fmt.Errorf("not connected to DAP server")
	}

	c.seqMu.Lock()
	c.seq++
	seq := c.seq
	c.seqMu.Unlock()

	request := map[string]interface{}{
		"seq":     seq,
		"type":    "request",
		"command": command,
	}
	if arguments != nil {
		request["arguments"] = arguments
	}

	// 创建响应通道
	respCh := make(chan json.RawMessage, 1)
	c.pendingMu.Lock()
	c.pendingRequests[seq] = respCh
	c.pendingMu.Unlock()

	defer func() {
		c.pendingMu.Lock()
		delete(c.pendingRequests, seq)
		c.pendingMu.Unlock()
	}()

	// 发送请求
	if err := c.writeMessage(request); err != nil {
		return nil, err
	}

	// 等待响应
	select {
	case resp := <-respCh:
		return resp, nil
	case <-time.After(30 * time.Second):
		return nil, fmt.Errorf("request timeout: %s", command)
	case <-c.closeCh:
		return nil, fmt.Errorf("connection closed")
	}
}

// SendRawRequest 发送原始 DAP 请求（从前端透传）
func (c *DAPClient) SendRawRequest(rawRequest json.RawMessage) (json.RawMessage, error) {
	if !c.connected {
		return nil, fmt.Errorf("not connected to DAP server")
	}

	// 解析请求获取 seq
	var req struct {
		Seq int `json:"seq"`
	}
	if err := json.Unmarshal(rawRequest, &req); err != nil {
		return nil, fmt.Errorf("invalid request: %w", err)
	}

	// 创建响应通道
	respCh := make(chan json.RawMessage, 1)
	c.pendingMu.Lock()
	c.pendingRequests[req.Seq] = respCh
	c.pendingMu.Unlock()

	defer func() {
		c.pendingMu.Lock()
		delete(c.pendingRequests, req.Seq)
		c.pendingMu.Unlock()
	}()

	// 发送原始请求
	if err := c.writeRawMessage(rawRequest); err != nil {
		return nil, err
	}

	// 等待响应
	select {
	case resp := <-respCh:
		return resp, nil
	case <-time.After(30 * time.Second):
		return nil, fmt.Errorf("request timeout")
	case <-c.closeCh:
		return nil, fmt.Errorf("connection closed")
	}
}

// writeMessage 发送 DAP 消息
func (c *DAPClient) writeMessage(msg interface{}) error {
	data, err := json.Marshal(msg)
	if err != nil {
		return err
	}
	return c.writeRawMessage(data)
}

// writeRawMessage 发送原始 DAP 消息
func (c *DAPClient) writeRawMessage(data json.RawMessage) error {
	// DAP 消息格式: Content-Length: <length>\r\n\r\n<json>
	header := fmt.Sprintf("Content-Length: %d\r\n\r\n", len(data))

	if _, err := c.writer.Write([]byte(header)); err != nil {
		return err
	}
	if _, err := c.writer.Write(data); err != nil {
		return err
	}

	c.logger.WithField("data", string(data)).Debug("Sent DAP message")
	return nil
}

// readLoop 读取 DAP 消息循环
func (c *DAPClient) readLoop() {
	for c.connected {
		msg, err := c.readMessage()
		if err != nil {
			if c.connected {
				c.logger.WithError(err).Error("Failed to read DAP message")
			}
			return
		}

		c.handleMessage(msg)
	}
}

// readMessage 读取一条 DAP 消息
func (c *DAPClient) readMessage() (json.RawMessage, error) {
	// 读取 Content-Length 头
	var contentLength int
	for {
		line, err := c.reader.ReadString('\n')
		if err != nil {
			return nil, err
		}

		line = strings.TrimSpace(line)
		if line == "" {
			break // 空行表示头部结束
		}

		if strings.HasPrefix(line, "Content-Length:") {
			lengthStr := strings.TrimSpace(strings.TrimPrefix(line, "Content-Length:"))
			contentLength, err = strconv.Atoi(lengthStr)
			if err != nil {
				return nil, fmt.Errorf("invalid Content-Length: %s", lengthStr)
			}
		}
	}

	if contentLength == 0 {
		return nil, fmt.Errorf("missing Content-Length header")
	}

	// 读取消息体
	body := make([]byte, contentLength)
	if _, err := io.ReadFull(c.reader, body); err != nil {
		return nil, err
	}

	c.logger.WithField("data", string(body)).Debug("Received DAP message")
	return body, nil
}

// handleMessage 处理接收到的 DAP 消息
func (c *DAPClient) handleMessage(msg json.RawMessage) {
	var header struct {
		Type       string `json:"type"`
		RequestSeq int    `json:"request_seq,omitempty"`
		Event      string `json:"event,omitempty"`
	}

	if err := json.Unmarshal(msg, &header); err != nil {
		c.logger.WithError(err).Error("Failed to parse DAP message header")
		return
	}

	switch header.Type {
	case "response":
		// 响应消息，发送到对应的等待通道
		c.pendingMu.Lock()
		if ch, ok := c.pendingRequests[header.RequestSeq]; ok {
			ch <- msg
		}
		c.pendingMu.Unlock()

	case "event":
		// 事件消息，调用回调
		c.logger.WithField("event", header.Event).Debug("Received DAP event")
		if c.onEvent != nil {
			c.onEvent(msg)
		}

	default:
		c.logger.WithField("type", header.Type).Warn("Unknown DAP message type")
	}
}
