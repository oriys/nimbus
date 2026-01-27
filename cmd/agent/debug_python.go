//go:build linux
// +build linux

// Package main 包含 Python debugpy 调试适配器实现
// debugpy 原生支持 DAP 协议，可以直接转发消息
package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"
)

// PythonDebugAdapter Python debugpy 调试适配器
type PythonDebugAdapter struct {
	*BaseDebugAdapter

	config    *DebugConfig
	cmd       *exec.Cmd
	conn      net.Conn
	reader    *bufio.Reader
	writer    io.Writer
	port      int
	writeMu   sync.Mutex
}

// NewPythonDebugAdapter 创建 Python 调试适配器
func NewPythonDebugAdapter() *PythonDebugAdapter {
	return &PythonDebugAdapter{
		BaseDebugAdapter: NewBaseDebugAdapter(),
	}
}

// Start 启动 debugpy 调试器
func (a *PythonDebugAdapter) Start(config *DebugConfig) error {
	a.config = config

	// 选择调试端口
	a.port = config.Port
	if a.port == 0 {
		a.port = 5678 // debugpy 默认端口
	}

	// 创建调试启动脚本
	if err := a.createDebugWrapper(); err != nil {
		return fmt.Errorf("failed to create debug wrapper: %w", err)
	}

	// 启动带 debugpy 的 Python 进程
	cmd := exec.CommandContext(a.Context(), "python3", "-m", "debugpy",
		"--listen", fmt.Sprintf("127.0.0.1:%d", a.port),
		"--wait-for-client",
		filepath.Join(FunctionDir, "_debug_wrapper.py"),
	)

	// 设置环境变量
	cmd.Env = os.Environ()
	for k, v := range config.EnvVars {
		cmd.Env = append(cmd.Env, fmt.Sprintf("%s=%s", k, v))
	}

	// 捕获输出用于调试
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Start(); err != nil {
		return fmt.Errorf("failed to start debugpy: %w", err)
	}

	a.cmd = cmd
	a.SetRunning(true)

	// 等待 debugpy 准备就绪并连接
	if err := a.connectToDebugpy(); err != nil {
		a.Stop()
		return fmt.Errorf("failed to connect to debugpy: %w", err)
	}

	// 启动事件读取协程
	go a.readEvents()

	fmt.Printf("Python debugger started on port %d\n", a.port)
	return nil
}

// createDebugWrapper 创建调试包装脚本
func (a *PythonDebugAdapter) createDebugWrapper() error {
	// 创建一个包装脚本，用于加载和执行用户函数
	// 这个脚本会在调试器附加后执行
	wrapper := fmt.Sprintf(`
import sys
import json
import os

sys.path.insert(0, '%s')

# 导入处理函数
parts = '%s'.rsplit('.', 1)
if len(parts) == 2:
    module_name, func_name = parts
else:
    module_name, func_name = 'handler', parts[0]

# 用于调试器检测的标记
__debugger_main__ = True

def main():
    """主函数，供调试器设置断点"""
    module = __import__(module_name)
    handler = getattr(module, func_name)

    # 从环境变量或标准输入获取输入
    input_json = os.environ.get('FUNCTION_INPUT', '{}')
    if not sys.stdin.isatty():
        stdin_data = sys.stdin.read().strip()
        if stdin_data:
            input_json = stdin_data

    try:
        input_data = json.loads(input_json)
    except json.JSONDecodeError:
        input_data = {}

    # 调用处理函数
    result = handler(input_data)

    # 输出结果
    print(json.dumps(result))
    return result

if __name__ == '__main__':
    main()
`, FunctionDir, a.config.Handler)

	return os.WriteFile(filepath.Join(FunctionDir, "_debug_wrapper.py"), []byte(wrapper), 0644)
}

// connectToDebugpy 连接到 debugpy 服务器
func (a *PythonDebugAdapter) connectToDebugpy() error {
	var conn net.Conn
	var err error

	// 重试连接，等待 debugpy 启动
	for i := 0; i < 30; i++ {
		conn, err = net.DialTimeout("tcp", fmt.Sprintf("127.0.0.1:%d", a.port), time.Second)
		if err == nil {
			break
		}
		time.Sleep(100 * time.Millisecond)
	}

	if err != nil {
		return fmt.Errorf("timeout connecting to debugpy: %w", err)
	}

	a.conn = conn
	a.reader = bufio.NewReader(conn)
	a.writer = conn

	return nil
}

// HandleDAP 处理 DAP 请求
func (a *PythonDebugAdapter) HandleDAP(msg json.RawMessage) ([]json.RawMessage, error) {
	if !a.IsRunning() {
		return nil, fmt.Errorf("debugger not running")
	}

	// 发送消息到 debugpy
	if err := a.sendDAP(msg); err != nil {
		return nil, fmt.Errorf("failed to send DAP message: %w", err)
	}

	// 读取响应
	// debugpy 可能返回多个消息（响应 + 事件）
	responses := make([]json.RawMessage, 0, 1)

	// 等待响应（带超时）
	responseChan := make(chan json.RawMessage, 10)
	go func() {
		for {
			resp, err := a.readDAP()
			if err != nil {
				return
			}
			responseChan <- resp

			// 检查是否是响应消息（而不是事件）
			var header struct {
				Type string `json:"type"`
			}
			if err := json.Unmarshal(resp, &header); err == nil {
				if header.Type == "response" {
					return
				}
			}
		}
	}()

	timeout := time.After(5 * time.Second)
	for {
		select {
		case resp := <-responseChan:
			responses = append(responses, resp)

			// 检查是否收到响应
			var header struct {
				Type string `json:"type"`
			}
			if err := json.Unmarshal(resp, &header); err == nil {
				if header.Type == "response" {
					return responses, nil
				}
			}

		case <-timeout:
			if len(responses) > 0 {
				return responses, nil
			}
			return nil, fmt.Errorf("timeout waiting for DAP response")
		}
	}
}

// sendDAP 发送 DAP 消息
func (a *PythonDebugAdapter) sendDAP(msg json.RawMessage) error {
	a.writeMu.Lock()
	defer a.writeMu.Unlock()

	// DAP 使用 HTTP 风格的头部
	header := fmt.Sprintf("Content-Length: %d\r\n\r\n", len(msg))

	if _, err := a.writer.Write([]byte(header)); err != nil {
		return err
	}
	if _, err := a.writer.Write(msg); err != nil {
		return err
	}

	return nil
}

// readDAP 读取 DAP 消息
func (a *PythonDebugAdapter) readDAP() (json.RawMessage, error) {
	// 读取 Content-Length 头
	var contentLength int
	for {
		line, err := a.reader.ReadString('\n')
		if err != nil {
			return nil, err
		}
		line = strings.TrimSpace(line)

		if line == "" {
			break // 头部结束
		}

		if strings.HasPrefix(line, "Content-Length:") {
			lenStr := strings.TrimSpace(strings.TrimPrefix(line, "Content-Length:"))
			contentLength, err = strconv.Atoi(lenStr)
			if err != nil {
				return nil, fmt.Errorf("invalid content length: %w", err)
			}
		}
	}

	if contentLength == 0 {
		return nil, fmt.Errorf("missing content length")
	}

	// 读取消息体
	body := make([]byte, contentLength)
	if _, err := io.ReadFull(a.reader, body); err != nil {
		return nil, err
	}

	return json.RawMessage(body), nil
}

// readEvents 持续读取事件
func (a *PythonDebugAdapter) readEvents() {
	for {
		select {
		case <-a.Context().Done():
			return
		default:
			msg, err := a.readDAP()
			if err != nil {
				if a.IsRunning() {
					fmt.Printf("Error reading DAP event: %v\n", err)
				}
				return
			}

			// 检查消息类型
			var header struct {
				Type string `json:"type"`
			}
			if err := json.Unmarshal(msg, &header); err == nil {
				if header.Type == "event" {
					a.PushEvent(msg)
				}
			}
		}
	}
}

// Stop 停止调试器
func (a *PythonDebugAdapter) Stop() error {
	a.SetRunning(false)
	a.Cancel()

	// 关闭连接
	if a.conn != nil {
		a.conn.Close()
	}

	// 终止进程
	if a.cmd != nil && a.cmd.Process != nil {
		a.cmd.Process.Kill()
		a.cmd.Wait()
	}

	a.Close()
	fmt.Println("Python debugger stopped")
	return nil
}

// ExecuteWithDebug 以调试模式执行函数
// 用于在设置断点后触发函数执行
func (a *PythonDebugAdapter) ExecuteWithDebug(input json.RawMessage) error {
	if !a.IsRunning() {
		return fmt.Errorf("debugger not running")
	}

	// 将输入写入环境变量或临时文件
	inputFile := filepath.Join(FunctionDir, "_debug_input.json")
	if err := os.WriteFile(inputFile, input, 0644); err != nil {
		return err
	}

	// 输入会通过包装脚本读取
	return nil
}
