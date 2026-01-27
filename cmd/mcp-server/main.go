// Package main 是 MCP (Model Context Protocol) 服务器的入口点
// MCP 服务器允许 AI 模型（如 Claude）通过标准化协议管理函数计算平台
// 它提供了一组工具，使 AI 能够创建、查询、更新和删除函数
package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"os"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
	"github.com/oriys/nimbus/internal/gatewayclient"
)

// 服务器常量
const (
	serverName    = "nimbus-mcp"    // 服务器名称
	serverVersion = "0.1.0"         // 服务器版本
)

// slugifyNameRE 用于将描述文本转换为有效的函数名
// 匹配非字母数字字符，用于替换为连字符
var slugifyNameRE = regexp.MustCompile(`[^a-z0-9]+`)

// main 是 MCP 服务器的主函数
// 它初始化网关客户端，注册 MCP 工具，并启动服务器
func main() {
	// 解析命令行参数
	// API URL 可通过环境变量 NIMBUS_API_URL（兼容旧的 FUNCTION_API_URL）或命令行参数设置
	apiURL := flag.String(
		"api-url",
		getenv("NIMBUS_API_URL", getenv("FUNCTION_API_URL", "http://localhost:8080")),
		"Nimbus Gateway API base URL",
	)
	flag.Parse()

	// 创建标准错误日志记录器
	stderrLogger := log.New(os.Stderr, "nimbus-mcp: ", log.LstdFlags)

	// 创建网关客户端
	client := gatewayclient.New(*apiURL)

	// 创建 MCP 服务器
	// 配置服务器说明和工具能力
	s := server.NewMCPServer(
		serverName,
		serverVersion,
		server.WithInstructions(fmt.Sprintf(
			"管理 Nimbus 平台（%s）的函数：创建/列出/查询/更新/删除，并支持通过自然语言描述生成基础函数模板。",
			*apiURL,
		)),
		server.WithToolCapabilities(false), // 禁用工具能力自动发现
	)

	// 注册 MCP 工具
	// 每个工具对应一个函数管理操作
	s.AddTool(newToolFunctionList(), handleFunctionList(client))                           // 列出函数
	s.AddTool(newToolFunctionGet(), handleFunctionGet(client))                             // 获取函数详情
	s.AddTool(newToolFunctionCreate(), handleFunctionCreate(client))                       // 创建函数
	s.AddTool(newToolFunctionCreateFromDescription(), handleFunctionCreateFromDescription(client)) // 从描述创建函数
	s.AddTool(newToolFunctionUpdate(), handleFunctionUpdate(client))                       // 更新函数
	s.AddTool(newToolFunctionDelete(), handleFunctionDelete(client))                       // 删除函数

	// 启动 MCP 服务器，通过标准输入输出通信
	if err := server.ServeStdio(s, server.WithErrorLogger(stderrLogger)); err != nil {
		stderrLogger.Fatal(err)
	}
}

// getenv 获取环境变量值，如果不存在则返回默认值
//
// 参数:
//   - key: 环境变量名
//   - defaultValue: 默认值
//
// 返回:
//   - string: 环境变量值或默认值
func getenv(key, defaultValue string) string {
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		return defaultValue
	}
	return v
}

// ============================================================================
// 函数列表工具
// ============================================================================

// newToolFunctionList 创建函数列表工具定义
// 支持分页和全量拉取模式
func newToolFunctionList() mcp.Tool {
	return mcp.NewTool(
		"function_list",
		mcp.WithDescription("列出函数（支持 offset/limit 分页）"),
		mcp.WithReadOnlyHintAnnotation(true),      // 只读操作
		mcp.WithDestructiveHintAnnotation(false),  // 非破坏性
		mcp.WithIdempotentHintAnnotation(true),    // 幂等操作
		mcp.WithBoolean("all", mcp.Description("是否拉取全部函数（会自动翻页，忽略 offset/limit）"), mcp.DefaultBool(false)),
		mcp.WithBoolean("include_code", mcp.Description("是否在结果中包含 code/code_hash（默认 false，避免输出过大）"), mcp.DefaultBool(false)),
		mcp.WithNumber("offset", mcp.Description("分页偏移，从 0 开始"), mcp.Min(0), mcp.MultipleOf(1), mcp.DefaultNumber(0)),
		mcp.WithNumber("limit", mcp.Description("分页大小，1-100"), mcp.Min(1), mcp.Max(100), mcp.MultipleOf(1), mcp.DefaultNumber(20)),
	)
}

// handleFunctionList 返回函数列表工具的处理函数
// 支持分页模式和全量拉取模式
//
// 参数:
//   - client: 网关客户端
//
// 返回:
//   - server.ToolHandlerFunc: 工具处理函数
func handleFunctionList(client *gatewayclient.Client) server.ToolHandlerFunc {
	return func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		includeCode := request.GetBool("include_code", false)

		// 全量拉取模式：自动翻页获取所有函数
		if request.GetBool("all", false) {
			const pageSize = 100
			offset := 0
			var (
				all   []gatewayclient.Function
				total int
			)

			// 循环获取所有页面
			for {
				resp, err := client.ListFunctions(ctx, offset, pageSize)
				if err != nil {
					return mcp.NewToolResultErrorFromErr("list functions failed", err), nil
				}
				if total == 0 {
					total = resp.Total
				}
				all = append(all, resp.Functions...)

				// 检查是否已获取所有函数
				if len(resp.Functions) == 0 || len(all) >= resp.Total {
					break
				}
				offset += len(resp.Functions)
			}

			out, err := mcp.NewToolResultJSON(toListFunctionsResult(all, total, 0, len(all), includeCode))
			if err != nil {
				return mcp.NewToolResultErrorFromErr("encode result failed", err), nil
			}
			return out, nil
		}

		// 分页模式：按指定的 offset 和 limit 获取
		offset := request.GetInt("offset", 0)
		limit := request.GetInt("limit", 20)

		resp, err := client.ListFunctions(ctx, offset, limit)
		if err != nil {
			return mcp.NewToolResultErrorFromErr("list functions failed", err), nil
		}
		out, err := mcp.NewToolResultJSON(toListFunctionsResult(resp.Functions, resp.Total, resp.Offset, resp.Limit, includeCode))
		if err != nil {
			return mcp.NewToolResultErrorFromErr("encode result failed", err), nil
		}
		return out, nil
	}
}

// functionListItem 函数列表项，用于 MCP 响应
type functionListItem struct {
	ID          string    `json:"id"`                    // 函数唯一标识
	Name        string    `json:"name"`                  // 函数名称
	Description string    `json:"description,omitempty"` // 函数描述
	Runtime     string    `json:"runtime"`               // 运行时类型
	Handler     string    `json:"handler"`               // 处理函数入口
	Code        string    `json:"code,omitempty"`        // 函数代码（可选）
	CodeHash    string    `json:"code_hash,omitempty"`   // 代码哈希（可选）
	MemoryMB    int       `json:"memory_mb"`             // 内存限制（MB）
	TimeoutSec  int       `json:"timeout_sec"`           // 超时时间（秒）
	Status      string    `json:"status"`                // 函数状态
	Version     int       `json:"version"`               // 函数版本
	CreatedAt   time.Time `json:"created_at"`            // 创建时间
	UpdatedAt   time.Time `json:"updated_at"`            // 更新时间
}

// listFunctionsResult 函数列表响应结构
type listFunctionsResult struct {
	Functions []functionListItem `json:"functions"` // 函数列表
	Total     int                `json:"total"`     // 总数
	Offset    int                `json:"offset"`    // 当前偏移
	Limit     int                `json:"limit"`     // 分页大小
}

// toListFunctionsResult 将网关响应转换为 MCP 响应格式
//
// 参数:
//   - functions: 函数列表
//   - total: 总数
//   - offset: 偏移
//   - limit: 限制
//   - includeCode: 是否包含代码
//
// 返回:
//   - *listFunctionsResult: 格式化的响应
func toListFunctionsResult(functions []gatewayclient.Function, total, offset, limit int, includeCode bool) *listFunctionsResult {
	items := make([]functionListItem, 0, len(functions))
	for _, fn := range functions {
		item := functionListItem{
			ID:          fn.ID,
			Name:        fn.Name,
			Description: fn.Description,
			Runtime:     fn.Runtime,
			Handler:     fn.Handler,
			MemoryMB:    fn.MemoryMB,
			TimeoutSec:  fn.TimeoutSec,
			Status:      fn.Status,
			Version:     fn.Version,
			CreatedAt:   fn.CreatedAt,
			UpdatedAt:   fn.UpdatedAt,
		}
		// 仅在请求时包含代码，避免响应过大
		if includeCode {
			item.Code = fn.Code
			item.CodeHash = fn.CodeHash
		}
		items = append(items, item)
	}
	return &listFunctionsResult{
		Functions: items,
		Total:     total,
		Offset:    offset,
		Limit:     limit,
	}
}

// ============================================================================
// 函数详情工具
// ============================================================================

// newToolFunctionGet 创建获取函数详情工具定义
func newToolFunctionGet() mcp.Tool {
	return mcp.NewTool(
		"function_get",
		mcp.WithDescription("获取函数详情（id 或 name）"),
		mcp.WithReadOnlyHintAnnotation(true),
		mcp.WithDestructiveHintAnnotation(false),
		mcp.WithIdempotentHintAnnotation(true),
		mcp.WithString("id_or_name", mcp.Description("函数 ID 或函数名"), mcp.Required()),
	)
}

// handleFunctionGet 返回获取函数详情工具的处理函数
//
// 参数:
//   - client: 网关客户端
//
// 返回:
//   - server.ToolHandlerFunc: 工具处理函数
func handleFunctionGet(client *gatewayclient.Client) server.ToolHandlerFunc {
	return func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		idOrName, err := request.RequireString("id_or_name")
		if err != nil {
			return mcp.NewToolResultErrorFromErr("missing id_or_name", err), nil
		}

		fn, err := client.GetFunction(ctx, idOrName)
		if err != nil {
			return mcp.NewToolResultErrorFromErr("get function failed", err), nil
		}
		out, err := mcp.NewToolResultJSON(fn)
		if err != nil {
			return mcp.NewToolResultErrorFromErr("encode result failed", err), nil
		}
		return out, nil
	}
}

// ============================================================================
// 函数创建工具
// ============================================================================

// newToolFunctionCreate 创建函数创建工具定义
// 需要提供完整的函数配置：name、runtime、handler、code 等
func newToolFunctionCreate() mcp.Tool {
	return mcp.NewTool(
		"function_create",
		mcp.WithDescription("创建函数（需要提供 code/handler/runtime 等）"),
		mcp.WithDestructiveHintAnnotation(false),
		mcp.WithString("name", mcp.Description("函数名，1-64 字符"), mcp.Required(), mcp.MinLength(1), mcp.MaxLength(64)),
		mcp.WithString("description", mcp.Description("函数描述（可选）")),
		mcp.WithString("runtime", mcp.Description("运行时"), mcp.Required(), mcp.Enum("python3.11", "nodejs20", "go1.24", "wasm")),
		mcp.WithString("handler", mcp.Description("处理器入口，例如 handler.main / handler.handler"), mcp.Required()),
		mcp.WithString("code", mcp.Description("函数代码内容"), mcp.Required(), mcp.MinLength(1)),
		mcp.WithNumber("memory_mb", mcp.Description("内存，128-3072"), mcp.Min(128), mcp.Max(3072), mcp.MultipleOf(1)),
		mcp.WithNumber("timeout_sec", mcp.Description("超时秒数，1-300"), mcp.Min(1), mcp.Max(300), mcp.MultipleOf(1)),
		mcp.WithObject("env_vars", mcp.Description("环境变量键值对"), mcp.AdditionalProperties(map[string]any{"type": "string"})),
	)
}

// handleFunctionCreate 返回创建函数工具的处理函数
//
// 参数:
//   - client: 网关客户端
//
// 返回:
//   - server.ToolHandlerFunc: 工具处理函数
func handleFunctionCreate(client *gatewayclient.Client) server.ToolHandlerFunc {
	return func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		// 解析必需参数
		name, err := request.RequireString("name")
		if err != nil {
			return mcp.NewToolResultErrorFromErr("missing name", err), nil
		}
		runtime, err := request.RequireString("runtime")
		if err != nil {
			return mcp.NewToolResultErrorFromErr("missing runtime", err), nil
		}
		handler, err := request.RequireString("handler")
		if err != nil {
			return mcp.NewToolResultErrorFromErr("missing handler", err), nil
		}
		code, err := request.RequireString("code")
		if err != nil {
			return mcp.NewToolResultErrorFromErr("missing code", err), nil
		}

		// 解析可选参数
		description := request.GetString("description", "")
		memoryMB := request.GetInt("memory_mb", 0)
		timeoutSec := request.GetInt("timeout_sec", 0)
		envVars, err := parseStringMap(request.GetArguments()["env_vars"])
		if err != nil {
			return mcp.NewToolResultErrorFromErr("invalid env_vars", err), nil
		}

		// 调用网关 API 创建函数
		fn, err := client.CreateFunction(ctx, &gatewayclient.CreateFunctionRequest{
			Name:        name,
			Description: description,
			Runtime:     runtime,
			Handler:     handler,
			Code:        code,
			MemoryMB:    memoryMB,
			TimeoutSec:  timeoutSec,
			EnvVars:     envVars,
		})
		if err != nil {
			return mcp.NewToolResultErrorFromErr("create function failed", err), nil
		}

		out, err := mcp.NewToolResultJSON(fn)
		if err != nil {
			return mcp.NewToolResultErrorFromErr("encode result failed", err), nil
		}
		return out, nil
	}
}

// ============================================================================
// 从描述创建函数工具
// ============================================================================

// newToolFunctionCreateFromDescription 创建从自然语言描述生成函数的工具定义
// 支持 python3.11 和 nodejs20 运行时的模板生成
func newToolFunctionCreateFromDescription() mcp.Tool {
	return mcp.NewTool(
		"function_create_from_description",
		mcp.WithDescription("通过自然语言描述生成基础函数模板并创建（目前模板仅覆盖 python3.11 / nodejs20）"),
		mcp.WithDestructiveHintAnnotation(false),
		mcp.WithString("description", mcp.Description("自然语言描述（会写入函数 description，并用于生成示例代码）"), mcp.Required(), mcp.MinLength(1)),
		mcp.WithString("name", mcp.Description("函数名（可选；不填则自动生成），1-64 字符"), mcp.MinLength(1), mcp.MaxLength(64)),
		mcp.WithString("runtime", mcp.Description("运行时（可选，默认 python3.11）"), mcp.Enum("python3.11", "nodejs20", "go1.24", "wasm")),
		mcp.WithString("handler", mcp.Description("处理器入口（可选；不填则按运行时给默认值）")),
		mcp.WithNumber("memory_mb", mcp.Description("内存，128-3072"), mcp.Min(128), mcp.Max(3072), mcp.MultipleOf(1)),
		mcp.WithNumber("timeout_sec", mcp.Description("超时秒数，1-300"), mcp.Min(1), mcp.Max(300), mcp.MultipleOf(1)),
		mcp.WithObject("env_vars", mcp.Description("环境变量键值对"), mcp.AdditionalProperties(map[string]any{"type": "string"})),
	)
}

// handleFunctionCreateFromDescription 返回从描述创建函数工具的处理函数
// 自动生成函数代码模板
//
// 参数:
//   - client: 网关客户端
//
// 返回:
//   - server.ToolHandlerFunc: 工具处理函数
func handleFunctionCreateFromDescription(client *gatewayclient.Client) server.ToolHandlerFunc {
	return func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		description, err := request.RequireString("description")
		if err != nil {
			return mcp.NewToolResultErrorFromErr("missing description", err), nil
		}

		// 获取参数，使用默认值
		runtime := request.GetString("runtime", "python3.11")
		name := request.GetString("name", "")
		handler := request.GetString("handler", "")
		memoryMB := request.GetInt("memory_mb", 0)
		timeoutSec := request.GetInt("timeout_sec", 0)
		envVars, err := parseStringMap(request.GetArguments()["env_vars"])
		if err != nil {
			return mcp.NewToolResultErrorFromErr("invalid env_vars", err), nil
		}

		// 如果未提供名称，从描述自动生成
		if name == "" {
			name = defaultFunctionName(description)
		}

		// 根据运行时和描述生成代码模板
		gen, err := generateFunctionTemplate(runtime, description, handler)
		if err != nil {
			return mcp.NewToolResultErrorFromErr("generate template failed", err), nil
		}

		// 创建函数
		fn, err := client.CreateFunction(ctx, &gatewayclient.CreateFunctionRequest{
			Name:        name,
			Description: description,
			Runtime:     runtime,
			Handler:     gen.Handler,
			Code:        gen.Code,
			MemoryMB:    memoryMB,
			TimeoutSec:  timeoutSec,
			EnvVars:     envVars,
		})
		if err != nil {
			return mcp.NewToolResultErrorFromErr("create function failed", err), nil
		}

		return mcp.NewToolResultStructured(fn, fmt.Sprintf("created function %s (%s)", fn.Name, fn.ID)), nil
	}
}

// ============================================================================
// 函数更新工具
// ============================================================================

// newToolFunctionUpdate 创建函数更新工具定义
// 支持部分更新：只更新提供的字段
func newToolFunctionUpdate() mcp.Tool {
	return mcp.NewTool(
		"function_update",
		mcp.WithDescription("更新函数（按需更新 description/code/handler/资源限制/env_vars）"),
		mcp.WithDestructiveHintAnnotation(false),
		mcp.WithIdempotentHintAnnotation(true),
		mcp.WithString("id_or_name", mcp.Description("函数 ID 或函数名"), mcp.Required()),
		mcp.WithString("description", mcp.Description("新描述（可选）")),
		mcp.WithString("handler", mcp.Description("新 handler（可选）")),
		mcp.WithString("code", mcp.Description("新代码（可选）")),
		mcp.WithNumber("memory_mb", mcp.Description("内存，128-3072"), mcp.Min(128), mcp.Max(3072), mcp.MultipleOf(1)),
		mcp.WithNumber("timeout_sec", mcp.Description("超时秒数，1-300"), mcp.Min(1), mcp.Max(300), mcp.MultipleOf(1)),
		mcp.WithObject("env_vars", mcp.Description("环境变量键值对（可选，会整体覆盖）"), mcp.AdditionalProperties(map[string]any{"type": "string"})),
	)
}

// handleFunctionUpdate 返回更新函数工具的处理函数
//
// 参数:
//   - client: 网关客户端
//
// 返回:
//   - server.ToolHandlerFunc: 工具处理函数
func handleFunctionUpdate(client *gatewayclient.Client) server.ToolHandlerFunc {
	return func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		idOrName, err := request.RequireString("id_or_name")
		if err != nil {
			return mcp.NewToolResultErrorFromErr("missing id_or_name", err), nil
		}

		// 解析要更新的字段
		args := request.GetArguments()
		var req gatewayclient.UpdateFunctionRequest

		// 检查并设置各个可选字段
		if v, ok := args["description"]; ok {
			s, ok := v.(string)
			if !ok {
				return mcp.NewToolResultError("description must be a string"), nil
			}
			req.Description = &s
		}
		if v, ok := args["handler"]; ok {
			s, ok := v.(string)
			if !ok {
				return mcp.NewToolResultError("handler must be a string"), nil
			}
			req.Handler = &s
		}
		if v, ok := args["code"]; ok {
			s, ok := v.(string)
			if !ok {
				return mcp.NewToolResultError("code must be a string"), nil
			}
			req.Code = &s
		}
		if v, ok := args["memory_mb"]; ok {
			n, ok := asInt(v)
			if !ok {
				return mcp.NewToolResultError("memory_mb must be an integer"), nil
			}
			req.MemoryMB = &n
		}
		if v, ok := args["timeout_sec"]; ok {
			n, ok := asInt(v)
			if !ok {
				return mcp.NewToolResultError("timeout_sec must be an integer"), nil
			}
			req.TimeoutSec = &n
		}
		if v, ok := args["env_vars"]; ok {
			envVars, err := parseStringMap(v)
			if err != nil {
				return mcp.NewToolResultErrorFromErr("invalid env_vars", err), nil
			}
			req.EnvVars = &envVars
		}

		// 检查是否有需要更新的字段
		if req.Description == nil && req.Handler == nil && req.Code == nil && req.MemoryMB == nil && req.TimeoutSec == nil && req.EnvVars == nil {
			return mcp.NewToolResultError("no fields to update"), nil
		}

		// 调用网关 API 更新函数
		fn, err := client.UpdateFunction(ctx, idOrName, &req)
		if err != nil {
			return mcp.NewToolResultErrorFromErr("update function failed", err), nil
		}

		out, err := mcp.NewToolResultJSON(fn)
		if err != nil {
			return mcp.NewToolResultErrorFromErr("encode result failed", err), nil
		}
		return out, nil
	}
}

// ============================================================================
// 函数删除工具
// ============================================================================

// newToolFunctionDelete 创建函数删除工具定义
func newToolFunctionDelete() mcp.Tool {
	return mcp.NewTool(
		"function_delete",
		mcp.WithDescription("删除函数（id 或 name）"),
		mcp.WithDestructiveHintAnnotation(true), // 标记为破坏性操作
		mcp.WithString("id_or_name", mcp.Description("函数 ID 或函数名"), mcp.Required()),
	)
}

// handleFunctionDelete 返回删除函数工具的处理函数
//
// 参数:
//   - client: 网关客户端
//
// 返回:
//   - server.ToolHandlerFunc: 工具处理函数
func handleFunctionDelete(client *gatewayclient.Client) server.ToolHandlerFunc {
	return func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		idOrName, err := request.RequireString("id_or_name")
		if err != nil {
			return mcp.NewToolResultErrorFromErr("missing id_or_name", err), nil
		}

		if err := client.DeleteFunction(ctx, idOrName); err != nil {
			return mcp.NewToolResultErrorFromErr("delete function failed", err), nil
		}
		return mcp.NewToolResultText("deleted"), nil
	}
}

// ============================================================================
// 辅助函数
// ============================================================================

// parseStringMap 解析字符串映射
// 支持 map[string]string 和 map[string]any 两种输入格式
//
// 参数:
//   - v: 输入值
//
// 返回:
//   - map[string]string: 解析后的字符串映射
//   - error: 解析错误
func parseStringMap(v any) (map[string]string, error) {
	if v == nil {
		return nil, nil
	}

	switch vv := v.(type) {
	case map[string]string:
		if len(vv) == 0 {
			return nil, nil
		}
		return vv, nil
	case map[string]any:
		if len(vv) == 0 {
			return nil, nil
		}
		out := make(map[string]string, len(vv))
		for k, val := range vv {
			s, ok := val.(string)
			if !ok {
				return nil, fmt.Errorf("env_vars[%q] must be string", k)
			}
			out[k] = s
		}
		return out, nil
	default:
		return nil, fmt.Errorf("env_vars must be an object")
	}
}

// asInt 将任意数值类型转换为 int
//
// 参数:
//   - v: 输入值
//
// 返回:
//   - int: 转换后的整数
//   - bool: 转换是否成功
func asInt(v any) (int, bool) {
	switch n := v.(type) {
	case int:
		return n, true
	case int8:
		return int(n), true
	case int16:
		return int(n), true
	case int32:
		return int(n), true
	case int64:
		return int(n), true
	case float32:
		return int(n), true
	case float64:
		return int(n), true
	case json.Number:
		i, err := n.Int64()
		if err != nil {
			return 0, false
		}
		return int(i), true
	default:
		return 0, false
	}
}

// defaultFunctionName 从描述生成默认的函数名
// 将描述文本转换为 slug 格式并添加唯一后缀
//
// 参数:
//   - description: 函数描述
//
// 返回:
//   - string: 生成的函数名
func defaultFunctionName(description string) string {
	// 转换为小写并替换非字母数字字符为连字符
	base := strings.TrimSpace(strings.ToLower(description))
	base = slugifyNameRE.ReplaceAllString(base, "-")
	base = strings.Trim(base, "-")
	if base == "" {
		base = "function"
	}

	// 添加 UUID 后缀确保唯一性
	suffix := uuid.NewString()[:8]
	maxBaseLen := 64 - len(suffix) - 1 // 保证总长度不超过 64
	if maxBaseLen < 1 {
		return suffix
	}
	if len(base) > maxBaseLen {
		base = strings.Trim(base[:maxBaseLen], "-")
		if base == "" {
			base = "function"
		}
	}
	return base + "-" + suffix
}

// generatedTemplate 生成的函数模板
type generatedTemplate struct {
	Handler string // 处理函数入口
	Code    string // 函数代码
}

// generateFunctionTemplate 根据运行时和描述生成函数代码模板
//
// 参数:
//   - runtime: 运行时类型
//   - description: 函数描述
//   - handlerOverride: 处理器覆盖（可选）
//
// 返回:
//   - *generatedTemplate: 生成的模板
//   - error: 生成错误
func generateFunctionTemplate(runtime, description, handlerOverride string) (*generatedTemplate, error) {
	// 将描述转义为 JSON 字符串
	descLit, _ := json.Marshal(description)

	switch runtime {
	case "python3.11":
		// Python 模板
		handler := handlerOverride
		if handler == "" {
			handler = "handler.main"
		}
		code := fmt.Sprintf(`def main(event):
    return {"message": %s, "input": event}
`, string(descLit))
		return &generatedTemplate{Handler: handler, Code: code}, nil

	case "nodejs20":
		// Node.js 模板
		handler := handlerOverride
		if handler == "" {
			handler = "handler.handler"
		}
		code := fmt.Sprintf(`exports.handler = async (event) => {
  return { message: %s, input: event };
};
`, string(descLit))
		return &generatedTemplate{Handler: handler, Code: code}, nil

	case "go1.24":
		// Go 不支持模板生成，需要预编译二进制
		return nil, fmt.Errorf("runtime go1.24 template generation is not supported yet; use function_create and pass a base64-encoded linux binary in code (see deployments/docker/runtimes/runtime-go.go)")

	case "wasm":
		// WebAssembly 不支持模板生成，需要预编译 WASM
		return nil, fmt.Errorf("runtime wasm does not support template generation; use function_create with your compiled wasm")

	default:
		return nil, fmt.Errorf("unsupported runtime: %s", runtime)
	}
}
