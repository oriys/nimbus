package e2e

import (
	"fmt"
	"net/http"
	"strings"
	"testing"
	"time"
)

const (
	// TestFunctionPrefix is the prefix used for all test functions.
	// Functions with this prefix will be cleaned up after tests complete.
	TestFunctionPrefix = "e2e-"
)

// GenerateTestName generates a unique test function name.
func GenerateTestName(base string) string {
	return fmt.Sprintf("%s%s-%d", TestFunctionPrefix, base, time.Now().UnixNano())
}

// CleanupTestFunctions deletes all functions, workflows, layers, and environments with the e2e- prefix.
func CleanupTestFunctions() {
	// 1. Delete functions
	resp, err := Client.Get("/api/v1/functions?limit=100")
	if err == nil {
		var listResp ListFunctionsResponse
		if err := DecodeResponse(resp, &listResp); err == nil {
			for _, fn := range listResp.Functions {
				if strings.HasPrefix(fn.Name, TestFunctionPrefix) {
					Client.Delete("/api/v1/functions/" + fn.ID)
				}
			}
		}
	}

	// 2. Delete workflows
	resp, err = Client.Get("/api/v1/workflows?limit=100")
	if err == nil {
		var listResp ListWorkflowsResponse
		if err := DecodeResponse(resp, &listResp); err == nil {
			for _, wf := range listResp.Workflows {
				if strings.HasPrefix(wf.Name, TestFunctionPrefix) {
					Client.Delete("/api/v1/workflows/" + wf.ID)
				}
			}
		}
	}

	// 3. Delete layers
	resp, err = Client.Get("/api/v1/layers?limit=100")
	if err == nil {
		var listResp ListLayersResponse
		if err := DecodeResponse(resp, &listResp); err == nil {
			for _, l := range listResp.Layers {
				if strings.HasPrefix(l.Name, TestFunctionPrefix) {
					Client.Delete("/api/v1/layers/" + l.ID)
				}
			}
		}
	}

	// 4. Delete environments
	resp, err = Client.Get("/api/v1/environments")
	if err == nil {
		var listResp ListEnvironmentsResponse
		if err := DecodeResponse(resp, &listResp); err == nil {
			for _, env := range listResp.Environments {
				if strings.HasPrefix(env.Name, TestFunctionPrefix) {
					Client.Delete("/api/v1/environments/" + env.ID)
				}
			}
		}
	}
}

// WaitForCondition waits for a condition to be true within the given timeout.
func WaitForCondition(t *testing.T, timeout time.Duration, interval time.Duration, condition func() bool, message string) bool {
	t.Helper()
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		if condition() {
			return true
		}
		time.Sleep(interval)
	}
	t.Errorf("Timeout waiting for condition: %s", message)
	return false
}

// WaitForFunctionActive waits for a function to become active.
func WaitForFunctionActive(t *testing.T, functionID string, timeout time.Duration) bool {
	t.Helper()
	return WaitForCondition(t, timeout, 500*time.Millisecond, func() bool {
		resp, err := Client.Get("/api/v1/functions/" + functionID)
		if err != nil {
			return false
		}
		var fn Function
		if err := DecodeResponse(resp, &fn); err != nil {
			return false
		}
		return fn.Status == "active"
	}, "function to become active")
}

// WaitForInvocationComplete waits for an invocation to complete.
func WaitForInvocationComplete(t *testing.T, invocationID string, timeout time.Duration) (*Invocation, bool) {
	t.Helper()
	var inv Invocation
	success := WaitForCondition(t, timeout, 500*time.Millisecond, func() bool {
		resp, err := Client.Get("/api/v1/invocations/" + invocationID)
		if err != nil {
			return false
		}
		if err := DecodeResponse(resp, &inv); err != nil {
			return false
		}
		return inv.Status == "completed" || inv.Status == "failed"
	}, "invocation to complete")
	return &inv, success
}

// CreateTestFunction creates a test function and returns its details.
func CreateTestFunction(t *testing.T, req *CreateFunctionRequest) *Function {
	t.Helper()

	resp, err := Client.Post("/api/v1/functions", req)
	if err != nil {
		t.Fatalf("Failed to create function: %v", err)
	}

	if resp.StatusCode != http.StatusCreated {
		errMsg, _ := DecodeError(resp)
		t.Fatalf("Expected status 201, got %d: %s", resp.StatusCode, errMsg)
	}

	var fn Function
	if err := DecodeResponse(resp, &fn); err != nil {
		t.Fatalf("Failed to decode function response: %v", err)
	}

	return &fn
}

// DeleteTestFunction deletes a test function by ID or name.
func DeleteTestFunction(t *testing.T, idOrName string) {
	t.Helper()
	resp, err := Client.Delete("/api/v1/functions/" + idOrName)
	if err != nil {
		t.Errorf("Failed to delete function %s: %v", idOrName, err)
		return
	}
	CloseResponse(resp)
}

// AssertStatusCode checks that the response has the expected status code.
func AssertStatusCode(t *testing.T, resp *http.Response, expected int) {
	t.Helper()
	if resp == nil {
		t.Errorf("Expected status %d, got nil response", expected)
		return
	}
	if resp.StatusCode != expected {
		errMsg, _ := DecodeError(resp)
		t.Errorf("Expected status %d, got %d: %s", expected, resp.StatusCode, errMsg)
	}
}

// AssertNoError checks that err is nil.
func AssertNoError(t *testing.T, err error, message string) {
	t.Helper()
	if err != nil {
		t.Errorf("%s: %v", message, err)
	}
}

// AssertEqual checks that two values are equal.
func AssertEqual(t *testing.T, expected, actual interface{}, message string) {
	t.Helper()
	if expected != actual {
		t.Errorf("%s: expected %v, got %v", message, expected, actual)
	}
}

// AssertNotEmpty checks that a string is not empty.
func AssertNotEmpty(t *testing.T, value, message string) {
	t.Helper()
	if value == "" {
		t.Errorf("%s: expected non-empty string", message)
	}
}

// StringPtr returns a pointer to the given string.
func StringPtr(s string) *string {
	return &s
}

// IntPtr returns a pointer to the given int.
func IntPtr(i int) *int {
	return &i
}

// CloseResponse safely closes an HTTP response body.
func CloseResponse(resp *http.Response) {
	if resp != nil && resp.Body != nil {
		resp.Body.Close()
	}
}
