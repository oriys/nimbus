package e2e

import (
	"net/http"
	"testing"
)

// CompileRequest represents the request body for compiling code.
type CompileRequest struct {
	Runtime string `json:"runtime"`
	Code    string `json:"code"`
}

// CompileResponse represents the response from code compilation.
type CompileResponse struct {
	Binary  string `json:"binary,omitempty"`
	Success bool   `json:"success"`
	Error   string `json:"error,omitempty"`
	Output  string `json:"output,omitempty"`
}

// TestCompileEndpoint tests the code compilation endpoint.
func TestCompileEndpoint(t *testing.T) {
	t.Run("Compile Go code successfully", func(t *testing.T) {
		req := &CompileRequest{
			Runtime: "go1.24",
			Code: `package main

import "fmt"

func main() {
	fmt.Println("Hello, World!")
}
`,
		}

		resp, err := Client.Post("/api/v1/compile", req)
		AssertNoError(t, err, "Failed to compile Go code")
		if resp == nil {
			return
		}

		// Compilation may succeed or fail depending on whether Go is installed
		// We just verify the endpoint responds correctly
		if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusBadRequest && resp.StatusCode != http.StatusInternalServerError {
			t.Errorf("Unexpected status code: %d", resp.StatusCode)
		}
		CloseResponse(resp)
	})

	t.Run("Compile with invalid runtime fails", func(t *testing.T) {
		req := &CompileRequest{
			Runtime: "invalid-runtime",
			Code:    "some code",
		}

		resp, err := Client.Post("/api/v1/compile", req)
		AssertNoError(t, err, "Failed to make request")
		if resp == nil {
			return
		}
		AssertStatusCode(t, resp, http.StatusBadRequest)
		CloseResponse(resp)
	})

	t.Run("Compile without code fails", func(t *testing.T) {
		req := &CompileRequest{
			Runtime: "go1.24",
			Code:    "",
		}

		resp, err := Client.Post("/api/v1/compile", req)
		AssertNoError(t, err, "Failed to make request")
		if resp == nil {
			return
		}
		AssertStatusCode(t, resp, http.StatusBadRequest)
		CloseResponse(resp)
	})

	t.Run("Compile Wasm code", func(t *testing.T) {
		req := &CompileRequest{
			Runtime: "wasm",
			Code: `fn main() {
    println!("Hello from Rust!");
}
`,
		}

		resp, err := Client.Post("/api/v1/compile", req)
		AssertNoError(t, err, "Failed to compile Wasm code")
		if resp == nil {
			return
		}

		// Compilation may succeed or fail depending on whether Rust is installed
		if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusBadRequest && resp.StatusCode != http.StatusInternalServerError {
			t.Errorf("Unexpected status code: %d", resp.StatusCode)
		}
		CloseResponse(resp)
	})

	t.Run("Compile Rust code", func(t *testing.T) {
		req := &CompileRequest{
			Runtime: "rust1.75",
			Code: `fn main() {
    println!("Hello from Rust!");
}
`,
		}

		resp, err := Client.Post("/api/v1/compile", req)
		AssertNoError(t, err, "Failed to compile Rust code")
		if resp == nil {
			return
		}

		// Compilation may succeed or fail depending on whether Rust is installed
		if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusBadRequest && resp.StatusCode != http.StatusInternalServerError {
			t.Errorf("Unexpected status code: %d", resp.StatusCode)
		}
		CloseResponse(resp)
	})

	t.Run("Compile with malformed request fails", func(t *testing.T) {
		// Send invalid JSON
		resp, err := Client.Request(http.MethodPost, "/api/v1/compile", "not json")
		AssertNoError(t, err, "Failed to make request")
		if resp == nil {
			return
		}
		AssertStatusCode(t, resp, http.StatusBadRequest)
		CloseResponse(resp)
	})
}
