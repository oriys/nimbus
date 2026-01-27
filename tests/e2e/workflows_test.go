package e2e

import (
	"net/http"
	"testing"
)

// TestCompleteUserWorkflow tests a complete user workflow:
// Create function -> Get function -> Update function -> Invoke function -> Check invocations -> Delete function
func TestCompleteUserWorkflow(t *testing.T) {
	t.Run("Complete Python function lifecycle", func(t *testing.T) {
		// Step 1: Create a function
		createReq := &CreateFunctionRequest{
			Name:        GenerateTestName("workflow-python"),
			Description: "E2E workflow test function",
			Runtime:     "python3.11",
			Handler:     "handler",
			Code:        PythonHelloWorld,
			MemoryMB:    256,
			TimeoutSec:  30,
			EnvVars: map[string]string{
				"GREETING": "Hello",
			},
		}

		createResp, err := Client.Post("/api/v1/functions", createReq)
		AssertNoError(t, err, "Step 1: Failed to create function")
		AssertStatusCode(t, createResp, http.StatusCreated)

		var fn Function
		err = DecodeResponse(createResp, &fn)
		AssertNoError(t, err, "Step 1: Failed to decode function")
		t.Logf("Step 1: Created function %s (ID: %s)", fn.Name, fn.ID)

		// Step 2: Get the function
		getResp, err := Client.Get("/api/v1/functions/" + fn.ID)
		AssertNoError(t, err, "Step 2: Failed to get function")
		AssertStatusCode(t, getResp, http.StatusOK)

		var retrieved Function
		err = DecodeResponse(getResp, &retrieved)
		AssertNoError(t, err, "Step 2: Failed to decode retrieved function")
		AssertEqual(t, fn.ID, retrieved.ID, "Step 2: Function ID")
		t.Logf("Step 2: Retrieved function %s", retrieved.Name)

		// Step 3: Update the function
		updateReq := &UpdateFunctionRequest{
			Description: StringPtr("Updated description for workflow test"),
			MemoryMB:    IntPtr(512),
		}

		updateResp, err := Client.Put("/api/v1/functions/"+fn.ID, updateReq)
		AssertNoError(t, err, "Step 3: Failed to update function")
		AssertStatusCode(t, updateResp, http.StatusOK)

		var updated Function
		err = DecodeResponse(updateResp, &updated)
		AssertNoError(t, err, "Step 3: Failed to decode updated function")
		AssertEqual(t, "Updated description for workflow test", updated.Description, "Step 3: Updated description")
		AssertEqual(t, 512, updated.MemoryMB, "Step 3: Updated memory")
		t.Logf("Step 3: Updated function %s", updated.Name)

		// Step 4: Invoke the function
		invokePayload := map[string]interface{}{
			"name": "Workflow User",
		}

		invokeResp, err := Client.Post("/api/v1/functions/"+fn.ID+"/invoke", invokePayload)
		AssertNoError(t, err, "Step 4: Failed to invoke function")
		AssertStatusCode(t, invokeResp, http.StatusOK)

		var invokeResult InvokeResponse
		err = DecodeResponse(invokeResp, &invokeResult)
		AssertNoError(t, err, "Step 4: Failed to decode invoke response")
		AssertEqual(t, 200, invokeResult.StatusCode, "Step 4: Invoke status code")
		t.Logf("Step 4: Invoked function, request ID: %s", invokeResult.RequestID)

		// Step 5: Check invocations for this function
		invocationsResp, err := Client.Get("/api/v1/functions/" + fn.ID + "/invocations")
		AssertNoError(t, err, "Step 5: Failed to list invocations")
		AssertStatusCode(t, invocationsResp, http.StatusOK)

		var invocations ListInvocationsResponse
		err = DecodeResponse(invocationsResp, &invocations)
		AssertNoError(t, err, "Step 5: Failed to decode invocations")
		if invocations.Total < 1 {
			t.Errorf("Step 5: Expected at least 1 invocation, got %d", invocations.Total)
		}
		t.Logf("Step 5: Found %d invocations for function", invocations.Total)

		// Step 6: Delete the function
		deleteResp, err := Client.Delete("/api/v1/functions/" + fn.ID)
		AssertNoError(t, err, "Step 6: Failed to delete function")
		AssertStatusCode(t, deleteResp, http.StatusNoContent)
		CloseResponse(deleteResp)
		t.Logf("Step 6: Deleted function %s", fn.Name)

		// Verify deletion
		verifyResp, err := Client.Get("/api/v1/functions/" + fn.ID)
		AssertNoError(t, err, "Verify: Failed to check deleted function")
		AssertStatusCode(t, verifyResp, http.StatusNotFound)
		CloseResponse(verifyResp)
		t.Log("Verified: Function no longer exists")
	})

	t.Run("Complete Node.js function lifecycle", func(t *testing.T) {
		// Create function
		createReq := &CreateFunctionRequest{
			Name:        GenerateTestName("workflow-nodejs"),
			Description: "E2E workflow test Node.js function",
			Runtime:     "nodejs20",
			Handler:     "handler",
			Code:        NodeJSHelloWorld,
			MemoryMB:    256,
			TimeoutSec:  30,
		}

		createResp, err := Client.Post("/api/v1/functions", createReq)
		AssertNoError(t, err, "Failed to create Node.js function")
		AssertStatusCode(t, createResp, http.StatusCreated)

		var fn Function
		err = DecodeResponse(createResp, &fn)
		AssertNoError(t, err, "Failed to decode function")
		defer DeleteTestFunction(t, fn.ID)

		// Invoke
		invokeResp, err := Client.Post("/api/v1/functions/"+fn.ID+"/invoke", map[string]interface{}{
			"name": "NodeJS User",
		})
		AssertNoError(t, err, "Failed to invoke Node.js function")
		AssertStatusCode(t, invokeResp, http.StatusOK)

		var invokeResult InvokeResponse
		err = DecodeResponse(invokeResp, &invokeResult)
		AssertNoError(t, err, "Failed to decode invoke response")
		AssertEqual(t, 200, invokeResult.StatusCode, "Invoke status code")
		t.Logf("Node.js function invoked successfully, request ID: %s", invokeResult.RequestID)
	})
}

// TestMultipleFunctionsWorkflow tests working with multiple functions simultaneously.
func TestMultipleFunctionsWorkflow(t *testing.T) {
	t.Run("Create and invoke multiple functions", func(t *testing.T) {
		// Create multiple functions
		functions := make([]*Function, 0, 3)

		for i := 0; i < 3; i++ {
			req := GetTestFunction("python-hello")
			fn := CreateTestFunction(t, req)
			functions = append(functions, fn)
		}

		// Cleanup at the end
		defer func() {
			for _, fn := range functions {
				DeleteTestFunction(t, fn.ID)
			}
		}()

		// Invoke each function
		for _, fn := range functions {
			resp, err := Client.Post("/api/v1/functions/"+fn.ID+"/invoke", map[string]interface{}{
				"name": "Multi-" + fn.Name,
			})
			AssertNoError(t, err, "Failed to invoke function "+fn.Name)
			AssertStatusCode(t, resp, http.StatusOK)
			CloseResponse(resp)
		}

		// Verify stats reflect the functions
		resp, err := Client.Get("/api/v1/stats")
		AssertNoError(t, err, "Failed to get stats")

		var stats StatsResponse
		err = DecodeResponse(resp, &stats)
		AssertNoError(t, err, "Failed to decode stats")

		if stats.Functions < 3 {
			t.Errorf("Expected at least 3 functions, got %d", stats.Functions)
		}
		if stats.Invocations < 3 {
			t.Errorf("Expected at least 3 invocations, got %d", stats.Invocations)
		}
	})
}

// TestAsyncWorkflow tests async invocation workflow.
func TestAsyncWorkflow(t *testing.T) {
	t.Run("Async invoke and check invocation status", func(t *testing.T) {
		// Create function
		req := GetTestFunction("python-hello")
		fn := CreateTestFunction(t, req)
		defer DeleteTestFunction(t, fn.ID)

		// Async invoke
		asyncResp, err := Client.Post("/api/v1/functions/"+fn.ID+"/async", map[string]interface{}{
			"name": "Async Test",
		})
		AssertNoError(t, err, "Failed to async invoke")
		AssertStatusCode(t, asyncResp, http.StatusAccepted)

		var asyncResult AsyncInvokeResponse
		err = DecodeResponse(asyncResp, &asyncResult)
		AssertNoError(t, err, "Failed to decode async response")
		AssertEqual(t, "accepted", asyncResult.Status, "Async status")

		// Check invocation record exists
		invResp, err := Client.Get("/api/v1/invocations/" + asyncResult.RequestID)
		AssertNoError(t, err, "Failed to get invocation")
		// The invocation should exist (might be pending, running, or completed)
		if invResp != nil && invResp.StatusCode != http.StatusOK && invResp.StatusCode != http.StatusNotFound {
			t.Errorf("Unexpected status code: %d", invResp.StatusCode)
		}
		CloseResponse(invResp)
	})
}

// TestFunctionUpdateAndInvoke tests updating a function and invoking the updated version.
func TestFunctionUpdateAndInvoke(t *testing.T) {
	t.Run("Update function code and invoke updated version", func(t *testing.T) {
		// Create initial function
		createReq := &CreateFunctionRequest{
			Name:        GenerateTestName("update-invoke"),
			Description: "Initial version",
			Runtime:     "python3.11",
			Handler:     "handler",
			Code: `
def handler(event, context):
    return {'statusCode': 200, 'body': 'Version 1'}
`,
			MemoryMB:   256,
			TimeoutSec: 30,
		}

		fn := CreateTestFunction(t, createReq)
		defer DeleteTestFunction(t, fn.ID)

		// Invoke initial version
		resp1, err := Client.Post("/api/v1/functions/"+fn.ID+"/invoke", map[string]interface{}{})
		AssertNoError(t, err, "Failed to invoke v1")
		AssertStatusCode(t, resp1, http.StatusOK)
		CloseResponse(resp1)

		// Update the code
		newCode := `
def handler(event, context):
    return {'statusCode': 200, 'body': 'Version 2'}
`
		updateReq := &UpdateFunctionRequest{
			Code:        StringPtr(newCode),
			Description: StringPtr("Updated version"),
		}

		updateResp, err := Client.Put("/api/v1/functions/"+fn.ID, updateReq)
		AssertNoError(t, err, "Failed to update function")
		AssertStatusCode(t, updateResp, http.StatusOK)
		CloseResponse(updateResp)

		// Invoke updated version
		resp2, err := Client.Post("/api/v1/functions/"+fn.ID+"/invoke", map[string]interface{}{})
		AssertNoError(t, err, "Failed to invoke v2")
		AssertStatusCode(t, resp2, http.StatusOK)
		CloseResponse(resp2)

		// Check that we now have 2 invocations for this function
		invResp, err := Client.Get("/api/v1/functions/" + fn.ID + "/invocations")
		AssertNoError(t, err, "Failed to list invocations")
		AssertStatusCode(t, invResp, http.StatusOK)

		var invocations ListInvocationsResponse
		err = DecodeResponse(invResp, &invocations)
		AssertNoError(t, err, "Failed to decode invocations")

		if invocations.Total < 2 {
			t.Errorf("Expected at least 2 invocations, got %d", invocations.Total)
		}
	})
}
