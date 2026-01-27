package e2e

import (
	"net/http"
	"testing"
)

// TestSyncInvoke tests synchronous function invocation.
func TestSyncInvoke(t *testing.T) {
	t.Run("Invoke Python function with payload", func(t *testing.T) {
		req := GetTestFunction("python-hello")
		fn := CreateTestFunction(t, req)
		defer DeleteTestFunction(t, fn.ID)

		payload := map[string]interface{}{
			"name": "E2E Test",
		}

		resp, err := Client.Post("/api/v1/functions/"+fn.ID+"/invoke", payload)
		AssertNoError(t, err, "Failed to invoke function")
		AssertStatusCode(t, resp, http.StatusOK)

		var invokeResp InvokeResponse
		err = DecodeResponse(resp, &invokeResp)
		AssertNoError(t, err, "Failed to decode invoke response")

		AssertNotEmpty(t, invokeResp.RequestID, "Request ID")
		AssertEqual(t, 200, invokeResp.StatusCode, "Invoke status code")
	})

	t.Run("Invoke Python function without payload", func(t *testing.T) {
		req := GetTestFunction("python-hello")
		fn := CreateTestFunction(t, req)
		defer DeleteTestFunction(t, fn.ID)

		resp, err := Client.Post("/api/v1/functions/"+fn.ID+"/invoke", map[string]interface{}{})
		AssertNoError(t, err, "Failed to invoke function")
		AssertStatusCode(t, resp, http.StatusOK)

		var invokeResp InvokeResponse
		err = DecodeResponse(resp, &invokeResp)
		AssertNoError(t, err, "Failed to decode invoke response")
		AssertEqual(t, 200, invokeResp.StatusCode, "Invoke status code")
	})

	t.Run("Invoke Node.js function with payload", func(t *testing.T) {
		req := GetTestFunction("nodejs-hello")
		fn := CreateTestFunction(t, req)
		defer DeleteTestFunction(t, fn.ID)

		payload := map[string]interface{}{
			"name": "Node Test",
		}

		resp, err := Client.Post("/api/v1/functions/"+fn.ID+"/invoke", payload)
		AssertNoError(t, err, "Failed to invoke function")
		AssertStatusCode(t, resp, http.StatusOK)

		var invokeResp InvokeResponse
		err = DecodeResponse(resp, &invokeResp)
		AssertNoError(t, err, "Failed to decode invoke response")
		AssertEqual(t, 200, invokeResp.StatusCode, "Invoke status code")
	})

	t.Run("Invoke function by name", func(t *testing.T) {
		req := GetTestFunction("python-hello")
		fn := CreateTestFunction(t, req)
		defer DeleteTestFunction(t, fn.ID)

		resp, err := Client.Post("/api/v1/functions/"+fn.Name+"/invoke", map[string]interface{}{})
		AssertNoError(t, err, "Failed to invoke function by name")
		AssertStatusCode(t, resp, http.StatusOK)
		CloseResponse(resp)
	})

	t.Run("Invoke non-existent function returns 404", func(t *testing.T) {
		resp, err := Client.Post("/api/v1/functions/non-existent/invoke", map[string]interface{}{})
		AssertNoError(t, err, "Failed to make request")
		AssertStatusCode(t, resp, http.StatusNotFound)
		CloseResponse(resp)
	})

	t.Run("Invoke function with environment variables", func(t *testing.T) {
		req := GetTestFunction("python-env")
		req.EnvVars = map[string]string{
			"MY_VAR":   "my_value",
			"TEST_KEY": "test_value",
		}
		fn := CreateTestFunction(t, req)
		defer DeleteTestFunction(t, fn.ID)

		payload := map[string]interface{}{
			"keys": []string{"MY_VAR", "TEST_KEY"},
		}

		resp, err := Client.Post("/api/v1/functions/"+fn.ID+"/invoke", payload)
		AssertNoError(t, err, "Failed to invoke function")
		AssertStatusCode(t, resp, http.StatusOK)

		var invokeResp InvokeResponse
		err = DecodeResponse(resp, &invokeResp)
		AssertNoError(t, err, "Failed to decode invoke response")
		AssertEqual(t, 200, invokeResp.StatusCode, "Invoke status code")
	})
}

// TestAsyncInvoke tests asynchronous function invocation.
func TestAsyncInvoke(t *testing.T) {
	t.Run("Async invoke Python function", func(t *testing.T) {
		req := GetTestFunction("python-hello")
		fn := CreateTestFunction(t, req)
		defer DeleteTestFunction(t, fn.ID)

		payload := map[string]interface{}{
			"name": "Async Test",
		}

		resp, err := Client.Post("/api/v1/functions/"+fn.ID+"/async", payload)
		AssertNoError(t, err, "Failed to async invoke function")
		AssertStatusCode(t, resp, http.StatusAccepted)

		var asyncResp AsyncInvokeResponse
		err = DecodeResponse(resp, &asyncResp)
		AssertNoError(t, err, "Failed to decode async invoke response")

		AssertNotEmpty(t, asyncResp.RequestID, "Request ID")
		AssertEqual(t, "accepted", asyncResp.Status, "Async invoke status")
	})

	t.Run("Async invoke Node.js function", func(t *testing.T) {
		req := GetTestFunction("nodejs-hello")
		fn := CreateTestFunction(t, req)
		defer DeleteTestFunction(t, fn.ID)

		resp, err := Client.Post("/api/v1/functions/"+fn.ID+"/async", map[string]interface{}{})
		AssertNoError(t, err, "Failed to async invoke function")
		AssertStatusCode(t, resp, http.StatusAccepted)

		var asyncResp AsyncInvokeResponse
		err = DecodeResponse(resp, &asyncResp)
		AssertNoError(t, err, "Failed to decode async invoke response")
		AssertNotEmpty(t, asyncResp.RequestID, "Request ID")
	})

	t.Run("Async invoke function by name", func(t *testing.T) {
		req := GetTestFunction("python-hello")
		fn := CreateTestFunction(t, req)
		defer DeleteTestFunction(t, fn.ID)

		resp, err := Client.Post("/api/v1/functions/"+fn.Name+"/async", map[string]interface{}{})
		AssertNoError(t, err, "Failed to async invoke function by name")
		AssertStatusCode(t, resp, http.StatusAccepted)
		CloseResponse(resp)
	})

	t.Run("Async invoke non-existent function returns 404", func(t *testing.T) {
		resp, err := Client.Post("/api/v1/functions/non-existent/async", map[string]interface{}{})
		AssertNoError(t, err, "Failed to make request")
		AssertStatusCode(t, resp, http.StatusNotFound)
		CloseResponse(resp)
	})
}

// TestInvokeErrors tests error handling in function invocation.
func TestInvokeErrors(t *testing.T) {
	// Note: These tests depend on how the scheduler handles errors.
	// In Docker mode without actual execution, error handling may vary.

	t.Run("Invoke inactive function fails", func(t *testing.T) {
		// This test requires a way to set a function to inactive status
		// which may need to be done through direct database manipulation
		// or a separate API endpoint. Skipping for now.
		t.Skip("Requires inactive function setup")
	})
}

// TestConcurrentInvocations tests concurrent function invocations.
func TestConcurrentInvocations(t *testing.T) {
	t.Run("Multiple concurrent invocations", func(t *testing.T) {
		req := GetTestFunction("python-hello")
		fn := CreateTestFunction(t, req)
		defer DeleteTestFunction(t, fn.ID)

		// Launch multiple concurrent invocations
		concurrency := 5
		results := make(chan error, concurrency)

		for i := 0; i < concurrency; i++ {
			go func(idx int) {
				payload := map[string]interface{}{
					"name": "Concurrent " + string(rune('A'+idx)),
				}
				resp, err := Client.Post("/api/v1/functions/"+fn.ID+"/invoke", payload)
				if err != nil {
					results <- err
					return
				}
				defer CloseResponse(resp)

				if resp.StatusCode != http.StatusOK {
					errMsg, _ := DecodeError(resp)
					results <- &ConcurrentError{StatusCode: resp.StatusCode, Message: errMsg}
					return
				}
				results <- nil
			}(i)
		}

		// Collect results
		var errors []error
		for i := 0; i < concurrency; i++ {
			if err := <-results; err != nil {
				errors = append(errors, err)
			}
		}

		if len(errors) > 0 {
			t.Errorf("Got %d errors in concurrent invocations: %v", len(errors), errors)
		}
	})
}

// ConcurrentError represents an error from a concurrent invocation.
type ConcurrentError struct {
	StatusCode int
	Message    string
}

func (e *ConcurrentError) Error() string {
	return e.Message
}
