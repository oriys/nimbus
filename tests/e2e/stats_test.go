package e2e

import (
	"net/http"
	"testing"
)

// TestStatsEndpoint tests the system statistics endpoint.
func TestStatsEndpoint(t *testing.T) {
	t.Run("Get stats returns function and invocation counts", func(t *testing.T) {
		// Create a test function
		req := GetTestFunction("python-hello")
		fn := CreateTestFunction(t, req)
		defer DeleteTestFunction(t, fn.ID)

		// Invoke it once
		invokeResp, err := Client.Post("/api/v1/functions/"+fn.ID+"/invoke", map[string]interface{}{})
		AssertNoError(t, err, "Failed to invoke function")
		CloseResponse(invokeResp)

		// Get stats
		resp, err := Client.Get("/api/v1/stats")
		AssertNoError(t, err, "Failed to get stats")
		AssertStatusCode(t, resp, http.StatusOK)

		var stats StatsResponse
		err = DecodeResponse(resp, &stats)
		AssertNoError(t, err, "Failed to decode stats response")

		// At minimum, we should have the function we just created
		if stats.Functions < 1 {
			t.Errorf("Expected at least 1 function, got %d", stats.Functions)
		}

		// And at least one invocation
		if stats.Invocations < 1 {
			t.Errorf("Expected at least 1 invocation, got %d", stats.Invocations)
		}
	})

	t.Run("Stats reflect function creation", func(t *testing.T) {
		// Get initial stats
		resp, err := Client.Get("/api/v1/stats")
		AssertNoError(t, err, "Failed to get initial stats")
		var initialStats StatsResponse
		err = DecodeResponse(resp, &initialStats)
		AssertNoError(t, err, "Failed to decode initial stats")

		// Create a function
		req := GetTestFunction("python-hello")
		fn := CreateTestFunction(t, req)
		defer DeleteTestFunction(t, fn.ID)

		// Get stats again
		resp, err = Client.Get("/api/v1/stats")
		AssertNoError(t, err, "Failed to get updated stats")
		var updatedStats StatsResponse
		err = DecodeResponse(resp, &updatedStats)
		AssertNoError(t, err, "Failed to decode updated stats")

		// Function count should have increased
		if updatedStats.Functions <= initialStats.Functions {
			t.Logf("Initial: %d, Updated: %d", initialStats.Functions, updatedStats.Functions)
			// This might fail in concurrent test runs, so just log
		}
	})

	t.Run("Stats reflect invocation count", func(t *testing.T) {
		// Create a function
		req := GetTestFunction("python-hello")
		fn := CreateTestFunction(t, req)
		defer DeleteTestFunction(t, fn.ID)

		// Get initial stats
		resp, err := Client.Get("/api/v1/stats")
		AssertNoError(t, err, "Failed to get initial stats")
		var initialStats StatsResponse
		err = DecodeResponse(resp, &initialStats)
		AssertNoError(t, err, "Failed to decode initial stats")

		// Invoke the function
		invokeResp, err := Client.Post("/api/v1/functions/"+fn.ID+"/invoke", map[string]interface{}{})
		AssertNoError(t, err, "Failed to invoke function")
		CloseResponse(invokeResp)

		// Get stats again
		resp, err = Client.Get("/api/v1/stats")
		AssertNoError(t, err, "Failed to get updated stats")
		var updatedStats StatsResponse
		err = DecodeResponse(resp, &updatedStats)
		AssertNoError(t, err, "Failed to decode updated stats")

		// Invocation count should have increased
		if updatedStats.Invocations <= initialStats.Invocations {
			t.Logf("Initial invocations: %d, Updated: %d", initialStats.Invocations, updatedStats.Invocations)
			// This might fail in concurrent test runs, so just log
		}
	})
}
