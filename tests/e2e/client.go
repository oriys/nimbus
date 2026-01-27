package e2e

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// Client is the HTTP client for making API requests to the Nimbus gateway.
var Client *APIClient

// APIClient wraps http.Client with helper methods for Nimbus API calls.
type APIClient struct {
	BaseURL    string
	HTTPClient *http.Client
}

// InitClient initializes the global API client with the given base URL.
func InitClient(baseURL string) {
	Client = &APIClient{
		BaseURL: baseURL,
		HTTPClient: &http.Client{
			Timeout: 120 * time.Second,
		},
	}
}

// Request makes an HTTP request and returns the response.
func (c *APIClient) Request(method, path string, body interface{}) (*http.Response, error) {
	var bodyReader io.Reader
	if body != nil {
		jsonBody, err := json.Marshal(body)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal body: %w", err)
		}
		bodyReader = bytes.NewReader(jsonBody)
	}

	req, err := http.NewRequest(method, c.BaseURL+path, bodyReader)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	req.Header.Set("Accept", "application/json")

	return c.HTTPClient.Do(req)
}

// Get makes a GET request and returns the response.
func (c *APIClient) Get(path string) (*http.Response, error) {
	return c.Request(http.MethodGet, path, nil)
}

// Post makes a POST request with the given body and returns the response.
func (c *APIClient) Post(path string, body interface{}) (*http.Response, error) {
	return c.Request(http.MethodPost, path, body)
}

// Put makes a PUT request with the given body and returns the response.
func (c *APIClient) Put(path string, body interface{}) (*http.Response, error) {
	return c.Request(http.MethodPut, path, body)
}

// Delete makes a DELETE request and returns the response.
func (c *APIClient) Delete(path string) (*http.Response, error) {
	return c.Request(http.MethodDelete, path, nil)
}

// DecodeResponse reads the response body and decodes it into the given target.
func DecodeResponse(resp *http.Response, target interface{}) error {
	if resp == nil {
		return fmt.Errorf("nil response")
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read response body: %w", err)
	}
	if len(body) == 0 {
		return nil
	}
	if err := json.Unmarshal(body, target); err != nil {
		return fmt.Errorf("failed to decode response: %w (body: %s)", err, string(body))
	}
	return nil
}

// DecodeError reads an error response and returns the error message.
func DecodeError(resp *http.Response) (string, error) {
	var errResp struct {
		Error string `json:"error"`
	}
	if err := DecodeResponse(resp, &errResp); err != nil {
		return "", err
	}
	return errResp.Error, nil
}

// Function represents a function in the API response.
type Function struct {
	ID          string            `json:"id"`
	Name        string            `json:"name"`
	Description string            `json:"description,omitempty"`
	Runtime     string            `json:"runtime"`
	Handler     string            `json:"handler"`
	Code        string            `json:"code,omitempty"`
	CodeHash    string            `json:"code_hash,omitempty"`
	MemoryMB    int               `json:"memory_mb"`
	TimeoutSec  int               `json:"timeout_sec"`
	EnvVars     map[string]string `json:"env_vars,omitempty"`
	Status      string            `json:"status"`
	Version     int               `json:"version"`
	CreatedAt   string            `json:"created_at"`
	UpdatedAt   string            `json:"updated_at"`
}

// CreateFunctionRequest represents the request body for creating a function.
type CreateFunctionRequest struct {
	Name        string            `json:"name"`
	Description string            `json:"description,omitempty"`
	Runtime     string            `json:"runtime"`
	Handler     string            `json:"handler"`
	Code        string            `json:"code"`
	MemoryMB    int               `json:"memory_mb,omitempty"`
	TimeoutSec  int               `json:"timeout_sec,omitempty"`
	EnvVars     map[string]string `json:"env_vars,omitempty"`
}

// UpdateFunctionRequest represents the request body for updating a function.
type UpdateFunctionRequest struct {
	Description *string            `json:"description,omitempty"`
	Code        *string            `json:"code,omitempty"`
	Handler     *string            `json:"handler,omitempty"`
	MemoryMB    *int               `json:"memory_mb,omitempty"`
	TimeoutSec  *int               `json:"timeout_sec,omitempty"`
	EnvVars     *map[string]string `json:"env_vars,omitempty"`
}

// ListFunctionsResponse represents the response for listing functions.
type ListFunctionsResponse struct {
	Functions []*Function `json:"functions"`
	Total     int         `json:"total"`
	Offset    int         `json:"offset"`
	Limit     int         `json:"limit"`
}

// InvokeResponse represents the response from function invocation.
type InvokeResponse struct {
	RequestID    string          `json:"request_id"`
	StatusCode   int             `json:"status_code"`
	Body         json.RawMessage `json:"body,omitempty"`
	Error        string          `json:"error,omitempty"`
	DurationMs   int64           `json:"duration_ms"`
	ColdStart    bool            `json:"cold_start"`
	BilledTimeMs int64           `json:"billed_time_ms"`
}

// AsyncInvokeResponse represents the response from async function invocation.
type AsyncInvokeResponse struct {
	RequestID string `json:"request_id"`
	Status    string `json:"status"`
}

// Invocation represents an invocation record.
type Invocation struct {
	ID         string          `json:"id"`
	FunctionID string          `json:"function_id"`
	Status     string          `json:"status"`
	Input      json.RawMessage `json:"input,omitempty"`
	Output     json.RawMessage `json:"output,omitempty"`
	Error      string          `json:"error,omitempty"`
	DurationMs int64           `json:"duration_ms"`
	StartedAt  string          `json:"started_at"`
	EndedAt    string          `json:"ended_at,omitempty"`
}

// ListInvocationsResponse represents the response for listing invocations.
type ListInvocationsResponse struct {
	Invocations []*Invocation `json:"invocations"`
	Total       int           `json:"total"`
	Offset      int           `json:"offset"`
	Limit       int           `json:"limit"`
}

// StatsResponse represents the response from the stats endpoint.
type StatsResponse struct {
	Functions   int `json:"functions"`
	Invocations int `json:"invocations"`
}

// HealthResponse represents the response from health endpoints.
type HealthResponse struct {
	Status string `json:"status"`
}

// Workflow represents a workflow in the API response.
type Workflow struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Status      string `json:"status"`
	Version     int    `json:"version"`
	CreatedAt   string `json:"created_at"`
}

// ListWorkflowsResponse represents the response for listing workflows.
type ListWorkflowsResponse struct {
	Workflows []*Workflow `json:"workflows"`
	Total     int         `json:"total"`
}

// Layer represents a function layer in the API response.
type Layer struct {
	ID                 string   `json:"id"`
	Name               string   `json:"name"`
	CompatibleRuntimes []string `json:"compatible_runtimes"`
	LatestVersion      int      `json:"latest_version"`
	CreatedAt          string   `json:"created_at"`
}

// ListLayersResponse represents the response for listing layers.
type ListLayersResponse struct {
	Layers []*Layer `json:"layers"`
	Total  int      `json:"total"`
}

// Environment represents a deployment environment in the API response.
type Environment struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	IsDefault   bool   `json:"is_default"`
	CreatedAt   string `json:"created_at"`
}

// ListEnvironmentsResponse represents the response for listing environments.
type ListEnvironmentsResponse struct {
	Environments []*Environment `json:"environments"`
	Total        int            `json:"total"`
}

// QuotaUsage represents the resource quota usage response.
type QuotaUsage struct {
	FunctionCount          int     `json:"function_count"`
	TotalMemoryMB           int     `json:"total_memory_mb"`
	TodayInvocations       int64   `json:"today_invocations"`
	TotalCodeSizeKB        int64   `json:"total_code_size_kb"`
	MaxFunctions           int     `json:"max_functions"`
	MaxMemoryMB            int     `json:"max_memory_mb"`
	MaxInvocationsPerDay   int64   `json:"max_invocations_per_day"`
	MaxCodeSizeKB          int64   `json:"max_code_size_kb"`
	FunctionUsagePercent   float64 `json:"function_usage_percent"`
	MemoryUsagePercent     float64 `json:"memory_usage_percent"`
	InvocationUsagePercent float64 `json:"invocation_usage_percent"`
	CodeUsagePercent       float64 `json:"code_usage_percent"`
}
