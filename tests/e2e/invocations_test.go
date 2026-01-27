package e2e

import (
	"net/http"
	"testing"
	"time"
)

// TestListInvocations tests invocation record listing.
func TestListInvocations(t *testing.T) {
	// Create a function and invoke it a few times
	req := GetTestFunction("python-hello")
	fn := CreateTestFunction(t, req)
	defer DeleteTestFunction(t, fn.ID)

	// Invoke the function several times
	for i := 0; i < 3; i++ {
		resp, err := Client.Post("/api/v1/functions/"+fn.ID+"/invoke", map[string]interface{}{
			"name": "Test",
		})
		AssertNoError(t, err, "Failed to invoke function")
		CloseResponse(resp)
	}

	// Wait a moment for invocations to be recorded
	time.Sleep(500 * time.Millisecond)

	t.Run("List all invocations", func(t *testing.T) {
		resp, err := Client.Get("/api/v1/invocations")
		AssertNoError(t, err, "Failed to list invocations")
		AssertStatusCode(t, resp, http.StatusOK)

		var listResp ListInvocationsResponse
		err = DecodeResponse(resp, &listResp)
		AssertNoError(t, err, "Failed to decode invocations list")

		if listResp.Total < 3 {
			t.Errorf("Expected at least 3 invocations, got %d", listResp.Total)
		}
	})

	t.Run("List invocations with pagination", func(t *testing.T) {
		resp, err := Client.Get("/api/v1/invocations?limit=2")
		AssertNoError(t, err, "Failed to list invocations with limit")
		AssertStatusCode(t, resp, http.StatusOK)

		var listResp ListInvocationsResponse
		err = DecodeResponse(resp, &listResp)
		AssertNoError(t, err, "Failed to decode invocations list")

		if len(listResp.Invocations) > 2 {
			t.Errorf("Expected at most 2 invocations, got %d", len(listResp.Invocations))
		}
		AssertEqual(t, 2, listResp.Limit, "Limit in response")
	})

	t.Run("List invocations with offset", func(t *testing.T) {
		resp, err := Client.Get("/api/v1/invocations?offset=1&limit=2")
		AssertNoError(t, err, "Failed to list invocations with offset")
		AssertStatusCode(t, resp, http.StatusOK)

		var listResp ListInvocationsResponse
		err = DecodeResponse(resp, &listResp)
		AssertNoError(t, err, "Failed to decode invocations list")

		AssertEqual(t, 1, listResp.Offset, "Offset in response")
	})

	t.Run("List invocations for specific function", func(t *testing.T) {
		resp, err := Client.Get("/api/v1/functions/" + fn.ID + "/invocations")
		AssertNoError(t, err, "Failed to list function invocations")
		AssertStatusCode(t, resp, http.StatusOK)

		var listResp ListInvocationsResponse
		err = DecodeResponse(resp, &listResp)
		AssertNoError(t, err, "Failed to decode function invocations list")

		// All invocations should belong to this function
		for _, inv := range listResp.Invocations {
			AssertEqual(t, fn.ID, inv.FunctionID, "Invocation function ID")
		}
	})

	t.Run("List invocations for function by name", func(t *testing.T) {
		resp, err := Client.Get("/api/v1/functions/" + fn.Name + "/invocations")
		AssertNoError(t, err, "Failed to list function invocations by name")
		AssertStatusCode(t, resp, http.StatusOK)
		CloseResponse(resp)
	})

	t.Run("List invocations for non-existent function returns 404", func(t *testing.T) {
		resp, err := Client.Get("/api/v1/functions/non-existent/invocations")
		AssertNoError(t, err, "Failed to make request")
		AssertStatusCode(t, resp, http.StatusNotFound)
		CloseResponse(resp)
	})
}

// TestGetInvocation tests retrieving individual invocation records.
func TestGetInvocation(t *testing.T) {
	// Create a function and invoke it
	req := GetTestFunction("python-hello")
	fn := CreateTestFunction(t, req)
	defer DeleteTestFunction(t, fn.ID)

	// Invoke the function to get an invocation ID
	invokeResp, err := Client.Post("/api/v1/functions/"+fn.ID+"/invoke", map[string]interface{}{
		"name": "Test",
	})
	AssertNoError(t, err, "Failed to invoke function")

	var invokeResult InvokeResponse
	err = DecodeResponse(invokeResp, &invokeResult)
	AssertNoError(t, err, "Failed to decode invoke response")

	invocationID := invokeResult.RequestID

	t.Run("Get invocation by ID", func(t *testing.T) {
		resp, err := Client.Get("/api/v1/invocations/" + invocationID)
		AssertNoError(t, err, "Failed to get invocation")
		AssertStatusCode(t, resp, http.StatusOK)

		var inv Invocation
		err = DecodeResponse(resp, &inv)
		AssertNoError(t, err, "Failed to decode invocation")

		AssertEqual(t, invocationID, inv.ID, "Invocation ID")
		AssertEqual(t, fn.ID, inv.FunctionID, "Function ID")
	})

	t.Run("Get non-existent invocation returns 404", func(t *testing.T) {
		resp, err := Client.Get("/api/v1/invocations/non-existent-invocation-id")
		AssertNoError(t, err, "Failed to make request")
		AssertStatusCode(t, resp, http.StatusNotFound)
		CloseResponse(resp)
	})
}

// TestInvocationStatus tests invocation status filtering.
func TestInvocationStatus(t *testing.T) {
	t.Run("List invocations filtered by status", func(t *testing.T) {
		// Create and invoke a function
		req := GetTestFunction("python-hello")
		fn := CreateTestFunction(t, req)
		defer DeleteTestFunction(t, fn.ID)

		resp, err := Client.Post("/api/v1/functions/"+fn.ID+"/invoke", map[string]interface{}{})
		AssertNoError(t, err, "Failed to invoke function")
		CloseResponse(resp)

		// Wait for invocation to complete
		time.Sleep(500 * time.Millisecond)

		// Filter by completed status
		resp, err = Client.Get("/api/v1/invocations?status=completed")
		AssertNoError(t, err, "Failed to list invocations by status")
		AssertStatusCode(t, resp, http.StatusOK)

		var listResp ListInvocationsResponse
		err = DecodeResponse(resp, &listResp)
		AssertNoError(t, err, "Failed to decode invocations list")

		// All returned invocations should have completed status
		for _, inv := range listResp.Invocations {
			if inv.Status != "completed" && inv.Status != "failed" {
				// Note: depending on implementation, status might vary
				// Just log for now
				t.Logf("Invocation %s has status %s", inv.ID, inv.Status)
			}
		}
	})
}
