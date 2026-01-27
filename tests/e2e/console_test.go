package e2e

import (
	"net/http"
	"testing"
	"time"
)

// DashboardStats represents the dashboard statistics response.
type DashboardStats struct {
	TotalInvocations  int64   `json:"total_invocations"`
	SuccessRate       float64 `json:"success_rate"`
	P99LatencyMs      float64 `json:"p99_latency_ms"`
	ColdStartRate     float64 `json:"cold_start_rate"`
	TotalFunctions    int     `json:"total_functions"`
	ActiveFunctions   int     `json:"active_functions"`
	InvocationsChange float64 `json:"invocations_change"`
	SuccessRateChange float64 `json:"success_rate_change"`
	LatencyChange     float64 `json:"latency_change"`
	ColdStartChange   float64 `json:"cold_start_change"`
}

// TrendDataPoint represents a data point in invocation trends.
type TrendDataPoint struct {
	Timestamp    time.Time `json:"timestamp"`
	Invocations  int64     `json:"invocations"`
	Errors       int64     `json:"errors"`
	AvgLatencyMs float64   `json:"avg_latency_ms"`
}

// TrendsResponse represents the response for invocation trends.
type TrendsResponse struct {
	Data []TrendDataPoint `json:"data"`
}

// TopFunction represents a top function in the response.
type TopFunction struct {
	FunctionID   string  `json:"function_id"`
	FunctionName string  `json:"function_name"`
	Invocations  int64   `json:"invocations"`
	Percentage   float64 `json:"percentage"`
}

// TopFunctionsResponse represents the response for top functions.
type TopFunctionsResponse struct {
	Data []TopFunction `json:"data"`
}

// RecentInvocationItem represents a recent invocation in the response.
type RecentInvocationItem struct {
	ID           string `json:"id"`
	FunctionID   string `json:"function_id"`
	FunctionName string `json:"function_name"`
	Status       string `json:"status"`
	DurationMs   int64  `json:"duration_ms"`
	ColdStart    bool   `json:"cold_start"`
	CreatedAt    string `json:"created_at"`
}

// RecentInvocationsResponse represents the response for recent invocations.
type RecentInvocationsResponse struct {
	Data []RecentInvocationItem `json:"data"`
}

// TestConsoleDashboardStats tests the console dashboard stats endpoint.
func TestConsoleDashboardStats(t *testing.T) {
	t.Run("Get dashboard stats with default period", func(t *testing.T) {
		resp, err := Client.Get("/api/console/dashboard/stats")
		AssertNoError(t, err, "Failed to get dashboard stats")
		AssertStatusCode(t, resp, http.StatusOK)

		var stats DashboardStats
		err = DecodeResponse(resp, &stats)
		AssertNoError(t, err, "Failed to decode dashboard stats")

		// Verify the response has expected fields (values can be 0)
		// Just checking the endpoint works and returns valid JSON
		t.Logf("Dashboard stats: functions=%d, invocations=%d, success_rate=%.2f%%",
			stats.TotalFunctions, stats.TotalInvocations, stats.SuccessRate)
	})

	t.Run("Get dashboard stats with 1h period", func(t *testing.T) {
		resp, err := Client.Get("/api/console/dashboard/stats?period=1h")
		AssertNoError(t, err, "Failed to get dashboard stats")
		AssertStatusCode(t, resp, http.StatusOK)
		CloseResponse(resp)
	})

	t.Run("Get dashboard stats with 24h period", func(t *testing.T) {
		resp, err := Client.Get("/api/console/dashboard/stats?period=24h")
		AssertNoError(t, err, "Failed to get dashboard stats")
		AssertStatusCode(t, resp, http.StatusOK)
		CloseResponse(resp)
	})

	t.Run("Get dashboard stats with 7d period", func(t *testing.T) {
		resp, err := Client.Get("/api/console/dashboard/stats?period=7d")
		AssertNoError(t, err, "Failed to get dashboard stats")
		AssertStatusCode(t, resp, http.StatusOK)
		CloseResponse(resp)
	})
}

// TestConsoleInvocationTrends tests the console invocation trends endpoint.
func TestConsoleInvocationTrends(t *testing.T) {
	t.Run("Get invocation trends with default period", func(t *testing.T) {
		resp, err := Client.Get("/api/console/dashboard/trends")
		AssertNoError(t, err, "Failed to get invocation trends")
		AssertStatusCode(t, resp, http.StatusOK)

		var trends TrendsResponse
		err = DecodeResponse(resp, &trends)
		AssertNoError(t, err, "Failed to decode invocation trends")

		t.Logf("Got %d trend data points", len(trends.Data))
	})

	t.Run("Get invocation trends with 1h period", func(t *testing.T) {
		resp, err := Client.Get("/api/console/dashboard/trends?period=1h")
		AssertNoError(t, err, "Failed to get invocation trends")
		AssertStatusCode(t, resp, http.StatusOK)
		CloseResponse(resp)
	})

	t.Run("Get invocation trends with 24h period", func(t *testing.T) {
		resp, err := Client.Get("/api/console/dashboard/trends?period=24h")
		AssertNoError(t, err, "Failed to get invocation trends")
		AssertStatusCode(t, resp, http.StatusOK)
		CloseResponse(resp)
	})
}

// TestConsoleTopFunctions tests the console top functions endpoint.
func TestConsoleTopFunctions(t *testing.T) {
	// First, create a function and invoke it to ensure we have data
	req := GetTestFunction("python-hello")
	fn := CreateTestFunction(t, req)
	defer DeleteTestFunction(t, fn.ID)

	// Invoke it a few times
	for i := 0; i < 3; i++ {
		resp, err := Client.Post("/api/v1/functions/"+fn.ID+"/invoke", map[string]interface{}{})
		AssertNoError(t, err, "Failed to invoke function")
		CloseResponse(resp)
	}

	t.Run("Get top functions with default limit", func(t *testing.T) {
		resp, err := Client.Get("/api/console/dashboard/top-functions")
		AssertNoError(t, err, "Failed to get top functions")
		AssertStatusCode(t, resp, http.StatusOK)

		var topFunctions TopFunctionsResponse
		err = DecodeResponse(resp, &topFunctions)
		AssertNoError(t, err, "Failed to decode top functions")

		t.Logf("Got %d top functions", len(topFunctions.Data))
	})

	t.Run("Get top functions with custom limit", func(t *testing.T) {
		resp, err := Client.Get("/api/console/dashboard/top-functions?limit=3")
		AssertNoError(t, err, "Failed to get top functions")
		AssertStatusCode(t, resp, http.StatusOK)

		var topFunctions TopFunctionsResponse
		err = DecodeResponse(resp, &topFunctions)
		AssertNoError(t, err, "Failed to decode top functions")

		if len(topFunctions.Data) > 3 {
			t.Errorf("Expected at most 3 top functions, got %d", len(topFunctions.Data))
		}
	})

	t.Run("Get top functions with period", func(t *testing.T) {
		resp, err := Client.Get("/api/console/dashboard/top-functions?period=24h")
		AssertNoError(t, err, "Failed to get top functions")
		AssertStatusCode(t, resp, http.StatusOK)
		CloseResponse(resp)
	})
}

// TestConsoleRecentInvocations tests the console recent invocations endpoint.
func TestConsoleRecentInvocations(t *testing.T) {
	// First, create a function and invoke it to ensure we have data
	req := GetTestFunction("python-hello")
	fn := CreateTestFunction(t, req)
	defer DeleteTestFunction(t, fn.ID)

	// Invoke it a few times
	for i := 0; i < 3; i++ {
		resp, err := Client.Post("/api/v1/functions/"+fn.ID+"/invoke", map[string]interface{}{
			"name": "RecentTest",
		})
		AssertNoError(t, err, "Failed to invoke function")
		CloseResponse(resp)
	}

	t.Run("Get recent invocations with default limit", func(t *testing.T) {
		resp, err := Client.Get("/api/console/dashboard/recent-invocations")
		AssertNoError(t, err, "Failed to get recent invocations")
		AssertStatusCode(t, resp, http.StatusOK)

		var recent RecentInvocationsResponse
		err = DecodeResponse(resp, &recent)
		AssertNoError(t, err, "Failed to decode recent invocations")

		t.Logf("Got %d recent invocations", len(recent.Data))
	})

	t.Run("Get recent invocations with custom limit", func(t *testing.T) {
		resp, err := Client.Get("/api/console/dashboard/recent-invocations?limit=5")
		AssertNoError(t, err, "Failed to get recent invocations")
		AssertStatusCode(t, resp, http.StatusOK)

		var recent RecentInvocationsResponse
		err = DecodeResponse(resp, &recent)
		AssertNoError(t, err, "Failed to decode recent invocations")

		if len(recent.Data) > 5 {
			t.Errorf("Expected at most 5 recent invocations, got %d", len(recent.Data))
		}
	})
}

// TestConsoleTestFunction tests the console function test endpoint.
func TestConsoleTestFunction(t *testing.T) {
	// Create a test function
	req := GetTestFunction("python-hello")
	fn := CreateTestFunction(t, req)
	defer DeleteTestFunction(t, fn.ID)

	t.Run("Test function via console endpoint", func(t *testing.T) {
		payload := map[string]interface{}{
			"name": "Console Test",
		}

		resp, err := Client.Post("/api/console/functions/"+fn.ID+"/test", payload)
		AssertNoError(t, err, "Failed to test function via console")
		AssertStatusCode(t, resp, http.StatusOK)

		var invokeResp InvokeResponse
		err = DecodeResponse(resp, &invokeResp)
		AssertNoError(t, err, "Failed to decode test function response")
		AssertEqual(t, 200, invokeResp.StatusCode, "Test function status code")
	})

	t.Run("Test function by name via console endpoint", func(t *testing.T) {
		resp, err := Client.Post("/api/console/functions/"+fn.Name+"/test", map[string]interface{}{})
		AssertNoError(t, err, "Failed to test function by name via console")
		AssertStatusCode(t, resp, http.StatusOK)
		CloseResponse(resp)
	})

	t.Run("Test non-existent function returns 404", func(t *testing.T) {
		resp, err := Client.Post("/api/console/functions/non-existent/test", map[string]interface{}{})
		AssertNoError(t, err, "Failed to make request")
		AssertStatusCode(t, resp, http.StatusNotFound)
		CloseResponse(resp)
	})
}

// SystemStatusResponse represents the system status response.
type SystemStatusResponse struct {
	Status    string `json:"status"`
	Version   string `json:"version"`
	Uptime    string `json:"uptime"`
	PoolStats []struct {
		Runtime  string `json:"runtime"`
		WarmVMs  int    `json:"warm_vms"`
		BusyVMs  int    `json:"busy_vms"`
		TotalVMs int    `json:"total_vms"`
		MaxVMs   int    `json:"max_vms"`
	} `json:"pool_stats"`
}

// APIKeyResponse represents an API key in the response.
type APIKeyResponse struct {
	ID        string  `json:"id"`
	Name      string  `json:"name"`
	APIKey    string  `json:"api_key,omitempty"`
	CreatedAt string  `json:"created_at"`
	ExpiresAt *string `json:"expires_at,omitempty"`
}

// APIKeysListResponse represents the list of API keys response.
type APIKeysListResponse struct {
	APIKeys []APIKeyResponse `json:"api_keys"`
}

// TestConsoleSystemStatus tests the console system status endpoint.
func TestConsoleSystemStatus(t *testing.T) {
	t.Run("Get system status", func(t *testing.T) {
		resp, err := Client.Get("/api/console/system/status")
		AssertNoError(t, err, "Failed to get system status")
		AssertStatusCode(t, resp, http.StatusOK)

		var status SystemStatusResponse
		err = DecodeResponse(resp, &status)
		AssertNoError(t, err, "Failed to decode system status")

		// Verify required fields
		AssertNotEmpty(t, status.Status, "Status should not be empty")
		AssertNotEmpty(t, status.Version, "Version should not be empty")
		AssertNotEmpty(t, status.Uptime, "Uptime should not be empty")

		t.Logf("System status: %s, version: %s, uptime: %s", status.Status, status.Version, status.Uptime)
	})

	t.Run("System status returns healthy or degraded", func(t *testing.T) {
		resp, err := Client.Get("/api/console/system/status")
		AssertNoError(t, err, "Failed to get system status")
		AssertStatusCode(t, resp, http.StatusOK)

		var status SystemStatusResponse
		err = DecodeResponse(resp, &status)
		AssertNoError(t, err, "Failed to decode system status")

		if status.Status != "healthy" && status.Status != "degraded" {
			t.Errorf("Expected status to be 'healthy' or 'degraded', got '%s'", status.Status)
		}
	})
}

// TestConsoleAPIKeyManagement tests the console API key management endpoints.
func TestConsoleAPIKeyManagement(t *testing.T) {
	var createdKeyID string

	t.Run("Create API key", func(t *testing.T) {
		req := map[string]interface{}{
			"name": "e2e-test-key",
		}

		resp, err := Client.Post("/api/console/apikeys", req)
		AssertNoError(t, err, "Failed to create API key")
		AssertStatusCode(t, resp, http.StatusCreated)

		var keyResp APIKeyResponse
		err = DecodeResponse(resp, &keyResp)
		AssertNoError(t, err, "Failed to decode API key response")

		AssertNotEmpty(t, keyResp.ID, "API key ID should not be empty")
		AssertNotEmpty(t, keyResp.APIKey, "API key value should not be empty")
		AssertEqual(t, "e2e-test-key", keyResp.Name, "API key name")

		createdKeyID = keyResp.ID
		t.Logf("Created API key with ID: %s", createdKeyID)
	})

	t.Run("Create API key without name returns error", func(t *testing.T) {
		req := map[string]interface{}{}

		resp, err := Client.Post("/api/console/apikeys", req)
		AssertNoError(t, err, "Failed to make request")
		AssertStatusCode(t, resp, http.StatusBadRequest)
		CloseResponse(resp)
	})

	t.Run("List API keys", func(t *testing.T) {
		resp, err := Client.Get("/api/console/apikeys")
		AssertNoError(t, err, "Failed to list API keys")
		AssertStatusCode(t, resp, http.StatusOK)

		var listResp APIKeysListResponse
		err = DecodeResponse(resp, &listResp)
		AssertNoError(t, err, "Failed to decode API keys list")

		t.Logf("Found %d API keys", len(listResp.APIKeys))

		// Verify the created key is in the list
		if createdKeyID != "" {
			found := false
			for _, key := range listResp.APIKeys {
				if key.ID == createdKeyID {
					found = true
					break
				}
			}
			if !found {
				t.Errorf("Created API key %s not found in list", createdKeyID)
			}
		}
	})

	t.Run("Delete API key", func(t *testing.T) {
		if createdKeyID == "" {
			t.Skip("No API key was created")
		}

		resp, err := Client.Delete("/api/console/apikeys/" + createdKeyID)
		AssertNoError(t, err, "Failed to delete API key")
		AssertStatusCode(t, resp, http.StatusNoContent)
		CloseResponse(resp)

		t.Logf("Deleted API key: %s", createdKeyID)
	})

	t.Run("Delete non-existent API key returns 404", func(t *testing.T) {
		resp, err := Client.Delete("/api/console/apikeys/non-existent-key-id")
		AssertNoError(t, err, "Failed to make request")
		AssertStatusCode(t, resp, http.StatusNotFound)
		CloseResponse(resp)
	})

	t.Run("Verify deleted API key is removed from list", func(t *testing.T) {
		if createdKeyID == "" {
			t.Skip("No API key was created")
		}

		resp, err := Client.Get("/api/console/apikeys")
		AssertNoError(t, err, "Failed to list API keys")
		AssertStatusCode(t, resp, http.StatusOK)

		var listResp APIKeysListResponse
		err = DecodeResponse(resp, &listResp)
		AssertNoError(t, err, "Failed to decode API keys list")

		for _, key := range listResp.APIKeys {
			if key.ID == createdKeyID {
				t.Errorf("Deleted API key %s still found in list", createdKeyID)
			}
		}
	})
}

// TestConsoleWorkflow tests a complete console workflow.
func TestConsoleWorkflow(t *testing.T) {
	t.Run("Complete console monitoring workflow", func(t *testing.T) {
		// Step 1: Check dashboard stats before
		statsResp, err := Client.Get("/api/console/dashboard/stats")
		AssertNoError(t, err, "Failed to get initial dashboard stats")
		AssertStatusCode(t, statsResp, http.StatusOK)

		var initialStats DashboardStats
		err = DecodeResponse(statsResp, &initialStats)
		AssertNoError(t, err, "Failed to decode initial stats")
		t.Logf("Initial stats: %d functions, %d invocations", initialStats.TotalFunctions, initialStats.TotalInvocations)

		// Step 2: Create a function
		req := GetTestFunction("python-hello")
		fn := CreateTestFunction(t, req)
		defer DeleteTestFunction(t, fn.ID)

		// Step 3: Test the function via console
		testResp, err := Client.Post("/api/console/functions/"+fn.ID+"/test", map[string]interface{}{
			"name": "Workflow Test",
		})
		AssertNoError(t, err, "Failed to test function")
		AssertStatusCode(t, testResp, http.StatusOK)
		CloseResponse(testResp)

		// Step 4: Check dashboard stats after
		statsResp, err = Client.Get("/api/console/dashboard/stats")
		AssertNoError(t, err, "Failed to get updated dashboard stats")
		AssertStatusCode(t, statsResp, http.StatusOK)

		var updatedStats DashboardStats
		err = DecodeResponse(statsResp, &updatedStats)
		AssertNoError(t, err, "Failed to decode updated stats")
		t.Logf("Updated stats: %d functions, %d invocations", updatedStats.TotalFunctions, updatedStats.TotalInvocations)

		// Step 5: Check recent invocations
		recentResp, err := Client.Get("/api/console/dashboard/recent-invocations?limit=5")
		AssertNoError(t, err, "Failed to get recent invocations")
		AssertStatusCode(t, recentResp, http.StatusOK)
		CloseResponse(recentResp)

		// Step 6: Check trends
		trendsResp, err := Client.Get("/api/console/dashboard/trends?period=1h")
		AssertNoError(t, err, "Failed to get trends")
		AssertStatusCode(t, trendsResp, http.StatusOK)
		CloseResponse(trendsResp)

		// Step 7: Check top functions
		topResp, err := Client.Get("/api/console/dashboard/top-functions?limit=5")
		AssertNoError(t, err, "Failed to get top functions")
		AssertStatusCode(t, topResp, http.StatusOK)
		CloseResponse(topResp)

		t.Log("Console monitoring workflow completed successfully")
	})
}
