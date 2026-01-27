package e2e

import (
	"net/http"
	"testing"
)

// TestCreateFunction tests function creation scenarios.
func TestCreateFunction(t *testing.T) {
	t.Run("Create Python function successfully", func(t *testing.T) {
		req := GetTestFunction("python-hello")
		fn := CreateTestFunction(t, req)
		defer DeleteTestFunction(t, fn.ID)

		AssertEqual(t, req.Name, fn.Name, "Function name")
		AssertEqual(t, req.Runtime, fn.Runtime, "Function runtime")
		AssertEqual(t, req.Handler, fn.Handler, "Function handler")
		AssertEqual(t, "active", fn.Status, "Function status")
		AssertNotEmpty(t, fn.ID, "Function ID")
		AssertNotEmpty(t, fn.CodeHash, "Function code hash")
	})

	t.Run("Create Node.js function successfully", func(t *testing.T) {
		req := GetTestFunction("nodejs-hello")
		fn := CreateTestFunction(t, req)
		defer DeleteTestFunction(t, fn.ID)

		AssertEqual(t, req.Name, fn.Name, "Function name")
		AssertEqual(t, req.Runtime, fn.Runtime, "Function runtime")
		AssertEqual(t, "active", fn.Status, "Function status")
	})

	t.Run("Create function with custom memory and timeout", func(t *testing.T) {
		req := GetTestFunction("python-hello")
		req.MemoryMB = 512
		req.TimeoutSec = 60

		fn := CreateTestFunction(t, req)
		defer DeleteTestFunction(t, fn.ID)

		AssertEqual(t, 512, fn.MemoryMB, "Function memory")
		AssertEqual(t, 60, fn.TimeoutSec, "Function timeout")
	})

	t.Run("Create function with environment variables", func(t *testing.T) {
		req := GetTestFunction("python-env")
		req.EnvVars = map[string]string{
			"TEST_VAR":    "test_value",
			"ANOTHER_VAR": "another_value",
		}

		fn := CreateTestFunction(t, req)
		defer DeleteTestFunction(t, fn.ID)

		AssertEqual(t, "test_value", fn.EnvVars["TEST_VAR"], "Environment variable TEST_VAR")
		AssertEqual(t, "another_value", fn.EnvVars["ANOTHER_VAR"], "Environment variable ANOTHER_VAR")
	})

	t.Run("Create function with duplicate name fails", func(t *testing.T) {
		req := GetTestFunction("python-hello")
		fn := CreateTestFunction(t, req)
		defer DeleteTestFunction(t, fn.ID)

		// Try to create another function with the same name
		resp, err := Client.Post("/api/v1/functions", req)
		AssertNoError(t, err, "Failed to make request")
		AssertStatusCode(t, resp, http.StatusConflict)
		CloseResponse(resp)
	})

	t.Run("Create function with invalid runtime fails", func(t *testing.T) {
		req := &CreateFunctionRequest{
			Name:    GenerateTestName("invalid-runtime"),
			Runtime: "invalid-runtime",
			Handler: "handler",
			Code:    "some code",
		}

		resp, err := Client.Post("/api/v1/functions", req)
		AssertNoError(t, err, "Failed to make request")
		AssertStatusCode(t, resp, http.StatusBadRequest)
		CloseResponse(resp)
	})

	t.Run("Create function without name fails", func(t *testing.T) {
		req := &CreateFunctionRequest{
			Runtime: "python3.11",
			Handler: "handler",
			Code:    PythonHelloWorld,
		}

		resp, err := Client.Post("/api/v1/functions", req)
		AssertNoError(t, err, "Failed to make request")
		AssertStatusCode(t, resp, http.StatusBadRequest)
		CloseResponse(resp)
	})

	t.Run("Create function without code fails", func(t *testing.T) {
		req := &CreateFunctionRequest{
			Name:    GenerateTestName("no-code"),
			Runtime: "python3.11",
			Handler: "handler",
		}

		resp, err := Client.Post("/api/v1/functions", req)
		AssertNoError(t, err, "Failed to make request")
		AssertStatusCode(t, resp, http.StatusBadRequest)
		CloseResponse(resp)
	})
}

// TestGetFunction tests function retrieval scenarios.
func TestGetFunction(t *testing.T) {
	// Create a test function first
	req := GetTestFunction("python-hello")
	fn := CreateTestFunction(t, req)
	defer DeleteTestFunction(t, fn.ID)

	t.Run("Get function by ID", func(t *testing.T) {
		resp, err := Client.Get("/api/v1/functions/" + fn.ID)
		AssertNoError(t, err, "Failed to get function by ID")
		AssertStatusCode(t, resp, http.StatusOK)

		var retrieved Function
		err = DecodeResponse(resp, &retrieved)
		AssertNoError(t, err, "Failed to decode function")
		AssertEqual(t, fn.ID, retrieved.ID, "Function ID")
		AssertEqual(t, fn.Name, retrieved.Name, "Function name")
	})

	t.Run("Get function by name", func(t *testing.T) {
		resp, err := Client.Get("/api/v1/functions/" + fn.Name)
		AssertNoError(t, err, "Failed to get function by name")
		AssertStatusCode(t, resp, http.StatusOK)

		var retrieved Function
		err = DecodeResponse(resp, &retrieved)
		AssertNoError(t, err, "Failed to decode function")
		AssertEqual(t, fn.ID, retrieved.ID, "Function ID")
	})

	t.Run("Get non-existent function returns 404", func(t *testing.T) {
		resp, err := Client.Get("/api/v1/functions/non-existent-function")
		AssertNoError(t, err, "Failed to make request")
		AssertStatusCode(t, resp, http.StatusNotFound)
		CloseResponse(resp)
	})
}

// TestListFunctions tests function listing and pagination.
func TestListFunctions(t *testing.T) {
	// Create multiple test functions
	var createdFunctions []*Function
	for i := 0; i < 3; i++ {
		req := GetTestFunction("python-hello")
		fn := CreateTestFunction(t, req)
		createdFunctions = append(createdFunctions, fn)
	}
	defer func() {
		for _, fn := range createdFunctions {
			DeleteTestFunction(t, fn.ID)
		}
	}()

	t.Run("List functions with default pagination", func(t *testing.T) {
		resp, err := Client.Get("/api/v1/functions")
		AssertNoError(t, err, "Failed to list functions")
		AssertStatusCode(t, resp, http.StatusOK)

		var listResp ListFunctionsResponse
		err = DecodeResponse(resp, &listResp)
		AssertNoError(t, err, "Failed to decode list response")

		if listResp.Total < 3 {
			t.Errorf("Expected at least 3 functions, got %d", listResp.Total)
		}
	})

	t.Run("List functions with custom limit", func(t *testing.T) {
		resp, err := Client.Get("/api/v1/functions?limit=2")
		AssertNoError(t, err, "Failed to list functions")
		AssertStatusCode(t, resp, http.StatusOK)

		var listResp ListFunctionsResponse
		err = DecodeResponse(resp, &listResp)
		AssertNoError(t, err, "Failed to decode list response")

		if len(listResp.Functions) > 2 {
			t.Errorf("Expected at most 2 functions, got %d", len(listResp.Functions))
		}
		AssertEqual(t, 2, listResp.Limit, "Limit in response")
	})

	t.Run("List functions with offset", func(t *testing.T) {
		resp, err := Client.Get("/api/v1/functions?offset=1&limit=2")
		AssertNoError(t, err, "Failed to list functions")
		AssertStatusCode(t, resp, http.StatusOK)

		var listResp ListFunctionsResponse
		err = DecodeResponse(resp, &listResp)
		AssertNoError(t, err, "Failed to decode list response")

		AssertEqual(t, 1, listResp.Offset, "Offset in response")
	})
}

// TestUpdateFunction tests function update scenarios.
func TestUpdateFunction(t *testing.T) {
	t.Run("Update function description", func(t *testing.T) {
		req := GetTestFunction("python-hello")
		fn := CreateTestFunction(t, req)
		defer DeleteTestFunction(t, fn.ID)

		updateReq := &UpdateFunctionRequest{
			Description: StringPtr("Updated description"),
		}

		resp, err := Client.Put("/api/v1/functions/"+fn.ID, updateReq)
		AssertNoError(t, err, "Failed to update function")
		AssertStatusCode(t, resp, http.StatusOK)

		var updated Function
		err = DecodeResponse(resp, &updated)
		AssertNoError(t, err, "Failed to decode updated function")
		AssertEqual(t, "Updated description", updated.Description, "Updated description")
	})

	t.Run("Update function code", func(t *testing.T) {
		req := GetTestFunction("python-hello")
		fn := CreateTestFunction(t, req)
		defer DeleteTestFunction(t, fn.ID)

		newCode := `
def handler(event, context):
    return {'statusCode': 200, 'body': 'Updated!'}
`
		updateReq := &UpdateFunctionRequest{
			Code: StringPtr(newCode),
		}

		resp, err := Client.Put("/api/v1/functions/"+fn.ID, updateReq)
		AssertNoError(t, err, "Failed to update function")
		AssertStatusCode(t, resp, http.StatusOK)

		var updated Function
		err = DecodeResponse(resp, &updated)
		AssertNoError(t, err, "Failed to decode updated function")

		// Code hash should change
		if updated.CodeHash == fn.CodeHash {
			t.Error("Expected code hash to change after code update")
		}
	})

	t.Run("Update function memory and timeout", func(t *testing.T) {
		req := GetTestFunction("python-hello")
		fn := CreateTestFunction(t, req)
		defer DeleteTestFunction(t, fn.ID)

		updateReq := &UpdateFunctionRequest{
			MemoryMB:   IntPtr(512),
			TimeoutSec: IntPtr(60),
		}

		resp, err := Client.Put("/api/v1/functions/"+fn.ID, updateReq)
		AssertNoError(t, err, "Failed to update function")
		AssertStatusCode(t, resp, http.StatusOK)

		var updated Function
		err = DecodeResponse(resp, &updated)
		AssertNoError(t, err, "Failed to decode updated function")
		AssertEqual(t, 512, updated.MemoryMB, "Updated memory")
		AssertEqual(t, 60, updated.TimeoutSec, "Updated timeout")
	})

	t.Run("Update function by name", func(t *testing.T) {
		req := GetTestFunction("python-hello")
		fn := CreateTestFunction(t, req)
		defer DeleteTestFunction(t, fn.ID)

		updateReq := &UpdateFunctionRequest{
			Description: StringPtr("Updated via name"),
		}

		resp, err := Client.Put("/api/v1/functions/"+fn.Name, updateReq)
		AssertNoError(t, err, "Failed to update function by name")
		AssertStatusCode(t, resp, http.StatusOK)
		CloseResponse(resp)
	})

	t.Run("Update non-existent function returns 404", func(t *testing.T) {
		updateReq := &UpdateFunctionRequest{
			Description: StringPtr("Should fail"),
		}

		resp, err := Client.Put("/api/v1/functions/non-existent", updateReq)
		AssertNoError(t, err, "Failed to make request")
		AssertStatusCode(t, resp, http.StatusNotFound)
		CloseResponse(resp)
	})
}

// TestDeleteFunction tests function deletion scenarios.
func TestDeleteFunction(t *testing.T) {
	t.Run("Delete function by ID", func(t *testing.T) {
		req := GetTestFunction("python-hello")
		fn := CreateTestFunction(t, req)

		resp, err := Client.Delete("/api/v1/functions/" + fn.ID)
		AssertNoError(t, err, "Failed to delete function")
		AssertStatusCode(t, resp, http.StatusNoContent)
		CloseResponse(resp)

		// Verify function is deleted
		resp, err = Client.Get("/api/v1/functions/" + fn.ID)
		AssertNoError(t, err, "Failed to check deleted function")
		AssertStatusCode(t, resp, http.StatusNotFound)
		CloseResponse(resp)
	})

	t.Run("Delete function by name", func(t *testing.T) {
		req := GetTestFunction("python-hello")
		fn := CreateTestFunction(t, req)

		resp, err := Client.Delete("/api/v1/functions/" + fn.Name)
		AssertNoError(t, err, "Failed to delete function by name")
		AssertStatusCode(t, resp, http.StatusNoContent)
		CloseResponse(resp)
	})

	t.Run("Delete non-existent function returns 404", func(t *testing.T) {
		resp, err := Client.Delete("/api/v1/functions/non-existent")
		AssertNoError(t, err, "Failed to make request")
		AssertStatusCode(t, resp, http.StatusNotFound)
		CloseResponse(resp)
	})
}
